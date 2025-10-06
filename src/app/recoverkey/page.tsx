"use client";
import React, { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { encryptWithPassword } from "../ceramic/criptoService";

const LOCAL_STORAGE_KEY = "orbis:key";

export default function RecoverKeyPage() {
  const [error, setError] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [step, setStep] = useState<"upload" | "password">("upload");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();

  // Paso 1: Subir archivo
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text);

      // Validar que es una JWK privada válida
      if (!json.d || !json.crv || !json.kty || !json.x || !json.y) {
        throw new Error("Formato de clave inválido.");
      }

      // Validar contra la clave pública registrada en el perfil
      const orbisUser = localStorage.getItem("orbis:user");
      if (!orbisUser) {
        setError("No se encontró el usuario en el dispositivo. Inicia sesión con MetaMask primero.");
        return;
      }
      const userProfile = JSON.parse(orbisUser);
      let publicKeyProfile: any = userProfile.publicKey;
      // Puede que sea stringificado JSON (corrige si necesario)
      if (typeof publicKeyProfile === "string") {
        publicKeyProfile = JSON.parse(publicKeyProfile);
      }

      // Comprobar campos x/y
      if (json.x !== publicKeyProfile.x || json.y !== publicKeyProfile.y) {
        setError("La clave privada no corresponde con la clave pública registrada en tu perfil.");
        return;
      }

      setFileContent(text);
      setError(null);
      setStep("password");
    } catch (e: any) {
      setError(
        e.message ||
          "Archivo inválido. ¿Seguro que es tu clave privada exportada desde Whispy?"
      );
    }
  };

  // Paso 2: Nueva contraseña y guardar
  const handleSave = async () => {
    setError(null);
    if (!fileContent) {
      setError("Debes subir un archivo válido primero.");
      return;
    }
    if (!password || !confirmPassword) {
      setError("Debes introducir y confirmar la contraseña.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    try {
      const encrypted = await encryptWithPassword(fileContent, password);
      localStorage.setItem(LOCAL_STORAGE_KEY, encrypted);
      router.push("/login");
    } catch {
      setError("Error al guardar la clave.");
    }
  };

  // Nueva función para limpiar localStorage y recargar
  const handleCreateNewAccount = () => {
    // Limpiar todo el localStorage
    localStorage.clear();
    
    // Recargar la página
    router.push("/");
  };

  return (
    <main className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg w-full max-w-md flex flex-col gap-4 items-center">
        <h2 className="text-2xl font-bold mb-2 text-center text-gray-800 dark:text-gray-100">
          Recuperar clave privada
        </h2>

        {step === "upload" && (
          <>
            <p className="text-gray-700 dark:text-gray-300 mb-4 text-center">
              Sube tu archivo de clave privada (.json) para restaurar tu acceso.<br />
              Luego, establece una nueva contraseña para protegerla en este dispositivo.
            </p>
            <input
              type="file"
              accept=".json,application/json"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="mb-4"
            />
          </>
        )}

        {step === "password" && (
          <>
            <p className="text-gray-700 dark:text-gray-300 mb-2 text-center">
              Escribe una nueva contraseña para cifrar tu clave privada en este dispositivo.
            </p>
            <input
              type="password"
              placeholder="Nueva contraseña"
              className="w-full p-2 border rounded mb-2 bg-gray-100 dark:bg-gray-700"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <input
              type="password"
              placeholder="Repite la contraseña"
              className="w-full p-2 border rounded mb-2 bg-gray-100 dark:bg-gray-700"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
            />
            <button
              onClick={handleSave}
              className="bg-blue-600 text-white px-6 py-2 rounded font-semibold hover:bg-blue-700 mb-2"
            >
              Guardar clave y continuar
            </button>
          </>
        )}

        {error && <div className="text-red-500 text-center mb-4">{error}</div>}

        {/* Botón para crear nueva cuenta */}
        <div className="border-t pt-4 w-full">
          <p className="text-gray-600 dark:text-gray-400 text-sm text-center mb-2">
            ¿No tienes una clave privada guardada?
          </p>
          <button
            onClick={handleCreateNewAccount}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded font-semibold transition-colors"
          >
            Reintentar inicio de sesión con Metamask
          </button>
        </div>
      </div>
    </main>
  );
}