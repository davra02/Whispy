"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getMe } from "@/app/ceramic/userService";
import { refreshModels, ensureModelsLoaded } from "@/app/ceramic/orbisDB";

/** ==== Validación del JSON de modelos ==== */
type ModelKey =
  | "chat" | "community" | "user" | "message" | "chat_membership"
  | "relationship" | "post" | "reply" | "report" | "friend_event"
  | "community_membership" | "likes";

const REQUIRED_MODEL_KEYS: ModelKey[] = [
  "chat","community","user","message","chat_membership",
  "relationship","post","reply","report","friend_event",
  "community_membership","likes",
];

const REMOTE_KEY_ALIASES: Record<string, ModelKey> = {
  whispy_user: "user",
  friendEvent: "friend_event",
  communityMembership: "community_membership",
};

const isStreamId = (v: string): boolean => /^[a-z0-9]{52,64}$/.test(v);

async function checkModelsJsonExistsAndValid(): Promise<boolean> {
  try {
    const timestamp = Date.now(); // Cache-busting
    const res = await fetch(`/models/whispy-stream-models.json?t=${timestamp}`, { 
      cache: "no-store",
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    if (!res.ok) return false;
    const data: any = await res.json();
    if (!data || typeof data !== "object") return false;

    // normaliza con alias
    const normalized: Partial<Record<ModelKey, string>> = {};
    for (const [rawKey, rawVal] of Object.entries(data)) {
      const key = (REMOTE_KEY_ALIASES[rawKey] || rawKey) as ModelKey;
      if (REQUIRED_MODEL_KEYS.includes(key) && typeof rawVal === "string" && isStreamId(rawVal)) {
        normalized[key] = rawVal;
      }
    }
    // acepta también claves ya correctas
    for (const k of REQUIRED_MODEL_KEYS) {
      const v = (data as any)[k];
      if (typeof v === "string" && isStreamId(v)) normalized[k] = v;
    }

    return REQUIRED_MODEL_KEYS.every((k) => typeof normalized[k] === "string");
  } catch {
    return false;
  }
}

/**
 * Redirige al usuario según el estado de la app:
 * - Si faltan modelos válidos:      /migration
 * - Si falta la sesión Ceramic:     /metalogin
 * - Si falta el perfil de usuario:  /register
 * - Si falta la clave privada:      /login (si requierePrivateKey)
 * - Si falta recuperar clave:       /recoverkey (si requierePrivateKey)
 */
export function useAuthRedirect(
  requirePrivateKey = false,
  sessionContext?: { isUnlocked: boolean }
) {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      // 1) Migraciones: SIEMPRE comprobar JSON sin cache
      const ok = await checkModelsJsonExistsAndValid();

      // SIEMPRE forzar recarga de models para tener los valores más recientes
      if (ok) {
        console.log("🔄 Recargando models desde JSON...");
        try {
          await refreshModels();
          console.log("✅ Models recargados");
        } catch (error) {
          console.error("❌ Error recargando models:", error);
        }
      }

      if (!ok) {
        if (window.location.pathname !== "/migration") {
          router.replace("/migration");
        }
        return;
      }

      // Asegurar que los models están cargados antes de continuar
      await ensureModelsLoaded();

      // 2) Checks de sesión
      const session = localStorage.getItem("orbis:session");
      const orbisUser = localStorage.getItem("orbis:user");
      const encryptedPrivateKey = localStorage.getItem("orbis:key");

      if (!session) {
        router.replace("/metalogin");
        return;
      }

      if (session && orbisUser && encryptedPrivateKey && requirePrivateKey && !sessionContext?.isUnlocked) {
        router.replace("/login");
        return;
      }

      if (session && !orbisUser && !encryptedPrivateKey) {
        const profile = await getMe().catch(() => null);
        if (profile && !cancelled) {
          try { localStorage.setItem("orbis:user", JSON.stringify(profile)); } catch {}
        }
        if (!cancelled) router.replace("/register");
        return;
      }

      if (session && orbisUser && !encryptedPrivateKey && requirePrivateKey) {
        router.replace("/recoverkey");
        return;
      }
    };

    run();
    return () => { cancelled = true; };
  }, [router, requirePrivateKey, sessionContext?.isUnlocked]);
}