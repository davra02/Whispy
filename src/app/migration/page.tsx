"use client";
import React, { useEffect, useState } from "react";
import { useSession } from "@/context/SessionContext";
import { useAuthRedirect } from "@/hooks/useAuthRedirect";
import { db } from "../ceramic/orbisDB";

// ⬇️ Opción A (recomendada): requiere "resolveJsonModule": true en tsconfig.json
import jsonModelsRaw from "../ceramic/models.json";
// ⬇️ Opción B si no tienes resolveJsonModule: deja comentado A y usa esta
// import * as jsonModelsRaw from "../ceramic/models.json";

const jsonModels: Record<string, any> = jsonModelsRaw as any;

const MigrationPage = () => {
  
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [modelStreams, setModelStreams] = useState<Record<string, string>>({});

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const connected: boolean = await db.isUserConnected();
        console.log("User connected:", connected);
      } catch (e) {
        console.warn("No se pudo verificar conexión:", e);
      }
    };
    checkConnection();
  }, []);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    setLogs(prev => [...prev, logMessage]);
    console.log(logMessage);
  };

  const saveJSONToServer = async (data: Record<string, string>) => {
    const res = await fetch("/api/models/whispy-stream-models", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Si tu auth va por cookie, no hace falta credentials. Añádelo si tu API lo requiere:
      // credentials: "include",
      body: JSON.stringify(data),
      cache: "no-store",
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j.error || `Fallo al guardar (${res.status})`);
    }
    return res.json();
  };

  const authenticate = async () => {
    try {
      const userLS = localStorage.getItem("orbis:user");
      addLog("✅ Usando autenticación existente de la aplicación");
      return true;
    } catch (error: any) {
      addLog(`❌ Error de autenticación: ${error.message}`);
      throw error;
    }
  };

  const migrateModels = async () => {

    setIsRunning(true);
    setLogs([]);
    setModelStreams({});

    const streams: Record<string, string> = {};

    try {
      addLog("🔐 Verificando autenticación...");
      await authenticate();
      
      addLog("🚀 Iniciando migración de modelos Whispy...");
      
      const modelNames = [
        "whispy_user", "chat", "message", "community",
        "post", "reply", "relationship", "chat_membership",
        "report", "friendEvent", "community_membership", "likes",
      ];

      addLog(`📋 Modelos a crear: ${modelNames.length}`);

      for (let i = 0; i < modelNames.length; i++) {
        const modelName = modelNames[i];
        
        try {
          addLog(`🔄 [${i + 1}/${modelNames.length}] Creando modelo: ${modelName}`);
          
          const modelDefinition = jsonModels[modelName];
          if (!modelDefinition) {
            addLog(`⚠️ Modelo ${modelName} no encontrado en definitions`);
            continue;
          }

          const response: any = await db.ceramic.createModel(modelDefinition);
          const streamId =
            response?.id ||
            response?.streamId ||
            response?.stream_id ||
            (typeof response === "string" ? response : "");

          if (!streamId) {
            throw new Error("Respuesta sin streamId");
          }
          
          streams[modelName] = streamId;
          setModelStreams(prev => ({ ...prev, [modelName]: streamId }));
          
          addLog(`✅ ${modelName}: ${streamId}`);
          
          // Pausa entre creaciones para evitar rate limiting
          if (i < modelNames.length - 1) {
            addLog(`⏳ Esperando 100 milisegundos antes del siguiente modelo...`);
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          
        } catch (error: any) {
          const errorMsg = error?.message || "Error desconocido";
          addLog(`❌ Error creando ${modelName}: ${errorMsg}`);
          streams[modelName] = `ERROR: ${errorMsg}`;
          setModelStreams(prev => ({ ...prev, [modelName]: `ERROR: ${errorMsg}` }));
        }
      }

      // Estadísticas finales
      const successful = Object.values(streams).filter(v => !String(v).includes("ERROR")).length;
      const failed = Object.values(streams).filter(v => String(v).includes("ERROR")).length;
      
      addLog("🎉 Migración completada!");
      addLog(`📊 Estadísticas: ${successful} exitosos, ${failed} fallidos de ${modelNames.length} total`);

      localStorage.removeItem("orbis:key");
      localStorage.removeItem("orbis:user");
      localStorage.setItem("orbis:migrationDone", "true");
      
      // Guardar en servidor (✅ con await)
      await saveJSONToServer(streams);
      addLog("💾 Guardado en servidor: /models/whispy-stream-models.json");

    } catch (error: any) {
      addLog(`💥 Error general: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const clearLogs = () => {
    setLogs([]);
    setModelStreams({});
  };


  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            🔧 Migración de Modelos Whispy
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Esta herramienta crea todos los modelos de Ceramic necesarios para Whispy y genera un archivo JSON con sus stream IDs.
          </p>
          
          <div className="flex gap-4">
            <button
              onClick={migrateModels}
              disabled={isRunning}
              className={`px-6 py-3 font-semibold rounded-lg transition-all duration-200 ${
                isRunning
                  ? "bg-gray-400 cursor-not-allowed text-white"
                  : "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105"
              }`}
            >
              {isRunning ? (
                <>
                  <span className="animate-spin inline-block mr-2">⚙️</span>
                  Ejecutando migración...
                </>
              ) : (
                <>🚀 Ejecutar migración</>
              )}
            </button>
            
            <button
              onClick={clearLogs}
              disabled={isRunning}
              className="px-4 py-3 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded-lg transition-all duration-200"
            >
              🗑️ Limpiar logs
            </button>
          </div>
        </div>

        {/* Panel de logs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            📋 Logs de ejecución
          </h2>
          <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm h-64 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="text-gray-500">Esperando ejecución...</div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Resultados */}
        {Object.keys(modelStreams).length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              📊 Resultados
            </h2>
            <div className="grid gap-2">
              {Object.entries(modelStreams).map(([modelName, streamId]) => (
                <div
                  key={modelName}
                  className={`p-3 rounded-lg flex justify-between items-center ${
                    String(streamId).includes("ERROR")
                      ? "bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500"
                      : "bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500"
                  }`}
                >
                  <span className="font-medium text-gray-900 dark:text-white">{modelName}</span>
                  <span
                    className={`font-mono text-sm ${
                      String(streamId).includes("ERROR")
                        ? "text-red-600 dark:text-red-400"
                        : "text-green-600 dark:text-green-400"
                    }`}
                  >
                    {String(streamId)}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 flex gap-3">
              <button
                onClick={async () => {
                  try {
                    await saveJSONToServer(modelStreams);
                    addLog("💾 Guardado manual en servidor: /models/whispy-stream-models.json");
                  } catch (e: any) {
                    addLog(`❌ Error guardando: ${e?.message || e}`);
                  }
                }}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-all duration-200"
              >
                💾 Guardar en servidor
              </button>

              <a
                href="/models/whispy-stream-models.json"
                target="_blank"
                className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-lg transition-all duration-200"
              >
                📄 Ver JSON
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MigrationPage;
