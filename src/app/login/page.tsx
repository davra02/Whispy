"use client";

import React, { useState, useEffect } from "react";
import { decryptWithPassword } from "../ceramic/criptoService";
import { useSession } from "@/context/SessionContext";
import { useRouter } from "next/navigation";
import { useAuthRedirect } from "@/hooks/useAuthRedirect";
import Link from "next/link";

const LOCAL_STORAGE_KEY = "orbis:key";

export default function LoginPage() {
    useAuthRedirect();
  const { unlockSession } = useSession();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();


  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const encryptedPrivateKey = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!encryptedPrivateKey) {
        setError(
          "No se ha encontrado una clave privada almacenada. ¿Has creado ya tu cuenta?"
        );
        setLoading(false);
        return;
      }
      const privKey = await decryptWithPassword(encryptedPrivateKey, password);
      const privateKeyJWK: JsonWebKey = JSON.parse(privKey);
      unlockSession(privateKeyJWK);
      router.push("/"); // Redirige al home después de desbloquear
    } catch {
      setError("Contraseña incorrecta o clave dañada.");
    } finally {
      setLoading(false);
    }
  }

   return (
    <main className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-6"
      >
        <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-gray-100">
          Iniciar sesión
        </h1>

        <div>
          <label
            htmlFor="password"
            className="block mb-1 font-medium text-gray-700 dark:text-gray-300"
          >
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
        
        <div className="mt-2 text-right">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            ¿Has olvidado la contraseña? Recupera el acceso con tu clave privada{" "}
            <Link
              href="/recoverkey"
              className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              aquí
            </Link>
            .
          </span>
        </div>

        </div>

        {error && (
          <p className="text-center text-sm text-red-500">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
        >
          {loading ? "Desbloqueando..." : "Entrar"}
        </button>
      </form>
    </main>
  );
}