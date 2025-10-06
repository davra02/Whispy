import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getMe } from "@/app/ceramic/userService";

/**
 * Redirige al usuario según el estado de la sesión:
 * - Si falta la sesión Ceramic:      /metalogin
 * - Si falta el perfil de usuario:   /register
 * - Si falta la clave privada:       /login
 * @param {boolean} requirePrivateKey - Si la página requiere tener la clave privada desbloqueada en memoria
 */
export function useAuthRedirect(requirePrivateKey = false, sessionContext?: { isUnlocked: boolean }) {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const migrationDone = localStorage.getItem("orbis:migrationDone");
      const session = localStorage.getItem("orbis:session");
      const orbisUser = localStorage.getItem("orbis:user");
      const encryptedPrivateKey = localStorage.getItem("orbis:key");

      if(!migrationDone) {
        router.push("/migration");
        return;
      }

      if (!session) {
        router.push("/metalogin");
        return;
      }

      if(session && orbisUser && encryptedPrivateKey && !sessionContext?.isUnlocked) {
        router.push("/login")
      }

      if(session && !orbisUser && !encryptedPrivateKey) {
        const profile = await getMe();
        if (profile) {
          localStorage.setItem("orbis:user", JSON.stringify(profile));
        }
        router.push("/register");
      }
      
      if(session && orbisUser && !encryptedPrivateKey) {
        router.push("/recoverkey");
      }
    
      
    };

    checkAuth();
  }, [router, requirePrivateKey, sessionContext?.isUnlocked]);
}

