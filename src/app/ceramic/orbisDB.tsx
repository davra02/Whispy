// lib/orbis.ts
import { OrbisDB } from "@useorbis/db-sdk";

// --- OrbisDB base ---
export const db = new OrbisDB({
  ceramic: { gateway: "http://localhost:7007" },
  nodes: [{ gateway: "http://localhost:7008" }],
});

const REMOTE_KEY_ALIASES: Record<string, keyof Models> = {
  // remoto -> interno
  whispy_user: "user",
  friendEvent: "friend_event",
  communityMembership: "community_membership",
};

type ModelKey =
  | "chat" | "community" | "user" | "message" | "chat_membership"
  | "relationship" | "post" | "reply" | "report" | "friend_event"
  | "community_membership" | "likes";

export type Models = { [K in ModelKey]: string };

// ===== Defaults (fallback si aún no hay JSON en servidor) =====
const defaultModels: Models = {
  chat: "kjzl6hvfrbw6c9bkr3ziu8c0gfqy5rx35youb479htemtmngsyl4yofzkb9idyr",
  community: "kjzl6hvfrbw6c8nox3bnar5sqat63plspjqnej7ad4zoov8952hfuwuxz1xcdux",
  user: "kjzl6hvfrbw6c9x2ec6yeixhtngz548on3uv6c3faek35zljfkvpnsq8bqti34b",
  message: "kjzl6hvfrbw6c83nduzuvldvjxmf2o08i6mfpwrtc4kyd54ipx8rbrxcgakexc1",
  chat_membership: "kjzl6hvfrbw6c96ay1rq9lrhphbucxp50v1nt9f0qiekmuz3xisuj5dodbz7wiu",
  relationship: "kjzl6hvfrbw6caqpydfv3pha16j2xwazbpiul8ngwhqp9k96bgmiwwd5ooja2y1",
  post: "kjzl6hvfrbw6c8dso5240upq70fg5wcandt6mdp6hw1mcg3vsab30wu4pkcmm9o",
  reply: "kjzl6hvfrbw6c83a87k89y2fhbvg4kfkkctmve90190wqw64avxsfnt2y7dthzo",
  report: "kjzl6hvfrbw6c8w03cwe36w50h9nor6b1fskkbq8xto7sic3sufxgl1zubhif86",
  friend_event: "kjzl6hvfrbw6cb47msvvz67oa9sn4qstv6xtxknuxt139t28sm9kdz5u6di67qd",
  community_membership: "kjzl6hvfrbw6c8pfql1t5a5g9bz4j9pooblj4fiaqp9d6xp3tip4aimpn2x7mti",
  likes: "kjzl6hvfrbw6ca183u047jwtirl8u6gdzt747nmzuhf169i1tt7yzn8dfron1ok",
};

// ===== Contexts (si los quieres dinámicos, replica patrón) =====
const defaultContexts = {
  whispy_test: "kjzl6kcym7w8y4wk8z1hlf0rxomnejtoe1ybij5f9ohgpiwx0z2ta5wu8h5z0t6",
  whispy: "kjzl6kcym7w8y8jojqu7vvjph34wg8eophkm74veapqcpzceen0aeljxb7w3psr",
} as const;
export type Contexts = typeof defaultContexts;

// ===== Validaciones =====
export const isBcAddress = (v: string): boolean => /^0x[0-9a-fA-F]{40}$/.test(v);
export const isStreamId = (v: string): boolean => /^[a-z0-9]{52,64}$/.test(v);
export const isDid = (v: string): boolean => /^did:pkh:eip155:\d+:(0x[0-9a-fA-F]{40})$/.test(v);
export const parseToBcAddress = (did: string): string | null =>
  isDid(did) ? did.split(":").pop() || null : null;

// ===== Propiedad models (mutable) + refresco en segundo plano =====

// 1) Objeto exportado MUTABLE (compat con orbisDB.models)
export const models: Models = { ...defaultModels };

// (Opcional) contexts mutables si los haces dinámicos
export const contexts: Contexts = { ...defaultContexts };

// Caché interna y TTL
let lastFetchMs = 0;
const TTL_MS = 60_000; // 1 min
let refreshInFlight: Promise<void> | null = null;
let autoTimer: ReturnType<typeof setInterval> | null = null;

function baseUrl(): string {
  if (typeof window !== "undefined") return ""; // relativo en cliente
  const fromEnv =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.APP_BASE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);
  return fromEnv || "http://localhost:3000";
}

async function fetchRuntimeJSON(): Promise<Partial<Models> | null> {
  try {
    const res = await fetch(`${baseUrl()}/models/whispy-stream-models.json`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as Partial<Models>;
  } catch {
    return null;
  }
}

// 2) Refresca y MUTA el objeto exportado `models`
export async function refreshModels(force = false): Promise<void> {
  const now = Date.now();
  if (!force && now - lastFetchMs < TTL_MS && !refreshInFlight) return;

  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const remote = await fetchRuntimeJSON(); // any/obj
      if (remote && typeof remote === "object") {
        const clean: Partial<Models> = {};

        // 1) Recorremos todas las entradas del JSON remoto
        for (const [rawKey, rawVal] of Object.entries(remote)) {
          const k = (REMOTE_KEY_ALIASES[rawKey] || rawKey) as keyof Models; // aplica alias si existe
          const v = typeof rawVal === "string" ? rawVal : undefined;

          // 2) Solo aceptamos claves que existan en nuestro Models y con streamId válido
          if (k in models && v && isStreamId(v)) {
            clean[k] = v;
          }
        }

        // 3) También permitimos que nos lleguen claves ya “correctas” desde el server
        (Object.keys(models) as (keyof Models)[]).forEach((k) => {
          const v = (remote as any)[k];
          if (typeof v === "string" && isStreamId(v)) {
            clean[k] = v;
          }
        });

        // ✅ Mutamos el MISMO objeto exportado
        Object.assign(models, clean);
      }
      lastFetchMs = Date.now();
    })().finally(() => {
      refreshInFlight = null;
    });
  }

  await refreshInFlight;
}


// 3) Auto-refresh en segundo plano
export function startModelsAutoRefresh(intervalMs = TTL_MS) {
  // evita múltiples intervalos
  if (autoTimer) return;
  // refresco inmediato al arrancar
  void refreshModels(true);
  autoTimer = setInterval(() => { void refreshModels(false); }, Math.max(15_000, intervalMs));
}

// 4) Stop (por si necesitas parar en tests, unmount, etc.)
export function stopModelsAutoRefresh() {
  if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
}

// 5) (Opcional) Wrapper que expone la propiedad como antes
export const orbisDB = Object.assign(db, { models, contexts });
