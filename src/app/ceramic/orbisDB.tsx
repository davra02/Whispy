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

// ===== Contexts =====
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

// ===== Models como Proxy reactivo =====
const modelsTarget: Partial<Models> = {};

// Crear un Proxy que siempre devuelva los valores actuales
export const models = new Proxy(modelsTarget as Models, {
  get(target, prop) {
    const value = target[prop as keyof Models];
    if (!value && typeof prop === 'string') {
      console.warn(`⚠️ Model "${prop}" not loaded yet`);
    }
    return value;
  },
  set(target, prop, value) {
    target[prop as keyof Models] = value;
    return true;
  }
});

export const contexts: Contexts = { ...defaultContexts };

// Estado de carga
let modelsLoaded = false;
let loadPromise: Promise<void> | null = null;
let autoRefreshInterval: NodeJS.Timeout | null = null;

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
    const timestamp = Date.now(); // Cache-busting
    const res = await fetch(
      `${baseUrl()}/models/whispy-stream-models.json?t=${timestamp}`, 
      { 
        cache: "no-store",
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );
    if (!res.ok) {
      throw new Error(`Failed to fetch models JSON: ${res.status} ${res.statusText}`);
    }
    return (await res.json()) as Partial<Models>;
  } catch (error) {
    console.error("Error fetching models JSON:", error);
    throw error;
  }
}

// Carga OBLIGATORIA desde JSON
export async function loadModels(forceReload: boolean = false): Promise<void> {
  if (modelsLoaded && !forceReload) return;
  
  if (!loadPromise || forceReload) {
    loadPromise = (async () => {
      const remote = await fetchRuntimeJSON();
      
      if (!remote || typeof remote !== "object") {
        throw new Error("Failed to load models: JSON is empty or invalid");
      }

      const clean: Partial<Models> = {};
      const requiredKeys: (keyof Models)[] = [
        "chat", "community", "user", "message", "chat_membership",
        "relationship", "post", "reply", "report", "friend_event",
        "community_membership", "likes"
      ];

      // 1) Recorremos todas las entradas del JSON remoto
      for (const [rawKey, rawVal] of Object.entries(remote)) {
        const k = (REMOTE_KEY_ALIASES[rawKey] || rawKey) as keyof Models;
        const v = typeof rawVal === "string" ? rawVal : undefined;

        if (v && isStreamId(v)) {
          clean[k] = v;
        }
      }

      // 2) Verificar que todas las claves requeridas están presentes
      const missingKeys = requiredKeys.filter(k => !clean[k]);
      if (missingKeys.length > 0) {
        throw new Error(`Missing required models in JSON: ${missingKeys.join(", ")}`);
      }

      // ✅ Limpiar models anteriores y asignar nuevos valores al target del Proxy
      for (const key in modelsTarget) {
        delete modelsTarget[key as keyof Models];
      }
      Object.assign(modelsTarget, clean);
      
      modelsLoaded = true;
      
      console.log("✅ Models loaded successfully from JSON:", { ...modelsTarget });
    })().catch((error) => {
      loadPromise = null;
      throw error;
    });
  }

  await loadPromise;
}

// Función para asegurar que los models están cargados antes de usarlos
export async function ensureModelsLoaded(): Promise<void> {
  if (!modelsLoaded) {
    await loadModels();
  }
}

// Función para forzar recarga de models (útil para hot-reload o testing)
export async function refreshModels(): Promise<void> {
  modelsLoaded = false;
  loadPromise = null;
  await loadModels(true);
}

// Función para iniciar auto-refresh periódico de models
export function startModelsAutoRefresh(intervalMs: number = 30000): () => void {
  // Detener cualquier intervalo previo
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
  }

  // Iniciar nuevo intervalo
  autoRefreshInterval = setInterval(async () => {
    try {
      console.log("🔄 Auto-refreshing models...");
      await refreshModels();
    } catch (error) {
      console.error("❌ Error during auto-refresh:", error);
    }
  }, intervalMs);

  // Retornar función para detener el auto-refresh
  return () => {
    if (autoRefreshInterval) {
      clearInterval(autoRefreshInterval);
      autoRefreshInterval = null;
      console.log("⏹️ Auto-refresh stopped");
    }
  };
}

// Función para detener el auto-refresh manualmente
export function stopModelsAutoRefresh(): void {
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
    autoRefreshInterval = null;
    console.log("⏹️ Auto-refresh stopped");
  }
}

// Auto-carga al importar el módulo (solo en cliente)
if (typeof window !== "undefined") {
  loadModels().catch((error) => {
    console.error("❌ CRITICAL: Failed to load models on startup:", error);
  });
}

// Wrapper que expone la propiedad como antes
export const orbisDB = Object.assign(db, { models, contexts });