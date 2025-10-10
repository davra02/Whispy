"use client";

import { useEffect } from "react";
import { SessionProvider } from "@/context/SessionContext";
import { refreshModels, startModelsAutoRefresh, stopModelsAutoRefresh } from "./ceramic/orbisDB";

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // refresco inmediato + intervalo en background
    refreshModels().catch(() => {});
    startModelsAutoRefresh(60_000); // cada 60s

    // refrescar al volver a la pestaña
    const onVis = () => {
      if (document.visibilityState === "visible") refreshModels().catch(() => {});
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      stopModelsAutoRefresh();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return <SessionProvider>{children}</SessionProvider>;
}
