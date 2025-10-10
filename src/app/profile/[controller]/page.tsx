"use client";
import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { FiUserPlus } from "react-icons/fi";
import { getUserByBcAdress, getUserById, getUserByUsername } from "@/app/ceramic/userService";
import { checkFriendRequest, isFriend, sendFriendRequest, blockUser, unblockUser, isUserBlocked } from "@/app/ceramic/relationService";
import { isStreamId } from "@/app/ceramic/orbisDB";
import { a } from "framer-motion/client";
import { reportObject } from "@/app/ceramic/reportService";
import { toast, Toaster } from "react-hot-toast";

interface Profile {
  stream_id: string;
  controller: string;
  bio: string;
  username: string;
  profilePicture?: string;
}

const OtherProfilePage = () => {
  const { controller } = useParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [canAdd, setCanAdd] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [isBlocking, setIsBlocking] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const router = useRouter();

  // Obtener perfil
  useEffect(() => {
    if (!controller) {
      router.push("/profile");
      return;
    }

    
    const param = Array.isArray(controller) ? controller[0] : controller;
    const isBc = /^0x[0-9a-fA-F]{40}$/.test(param);

    (async () => {
      try {
        const data = isBc
          ? await getUserByBcAdress(param)
          : isStreamId(param) ? await getUserById(param) : await getUserByUsername(param);
        if (!data) {
          router.push("/profile");
          return;
        }
        setProfile(data);
      } catch {
        router.push("/profile");
      }
    })();
  }, [controller, router]);

  // Comprobar amistad (mostrar botón solo si isFriend devuelve true)
  useEffect(() => {
    if (!profile) return;
    (async () => {
      try {
        const me = localStorage.getItem("orbis:user");
        const myStreamId = me ? JSON.parse(me).stream_id : null;
        const ok = await isFriend(profile.stream_id) || profile.stream_id == myStreamId;
        const alreadySent = await checkFriendRequest(profile.stream_id);
        setCanAdd(!ok);
      } catch {
        setCanAdd(false);
      }
    })();
  }, [profile]);

  // Comprobar si el usuario está bloqueado
  useEffect(() => {
    if (!profile) return;
    (async () => {
      try {
        const blockedStatus = await isUserBlocked(profile.stream_id);
        setBlocked(blockedStatus);
      } catch {
        setBlocked(false);
      }
    })();
  }, [profile]);

 const handleAddContact = async () => {
    if (!profile) return;
    try {
      await sendFriendRequest(profile.stream_id);
      toast.success('¡Petición de amistad enviada!');
      setCanAdd(false);
    } catch (err) {
      console.error("Error enviando petición de amistad:", err);
      toast.error('Error enviando petición');
    }
  };

  const handleBlockUser = async () => {
    if (!profile || isBlocking) return;
    
    if (blocked) {
      // Desbloquear
      const confirmed = window.confirm(
        `¿Estás seguro de que deseas desbloquear a ${profile.username}?`
      );
      
      if (!confirmed) return;
      
      setIsBlocking(true);
      try {
        await unblockUser(profile.stream_id);
        toast.success(`${profile.username} ha sido desbloqueado`);
        setBlocked(false);
      } catch (err) {
        console.error("Error desbloqueando usuario:", err);
        toast.error('Error al desbloquear usuario');
      } finally {
        setIsBlocking(false);
      }
    } else {
      // Bloquear
      const confirmed = window.confirm(
        `¿Estás seguro de que deseas bloquear a ${profile.username}?`
      );
      
      if (!confirmed) return;
      
      setIsBlocking(true);
      try {
        await blockUser(profile.stream_id);
        toast.success(`${profile.username} ha sido bloqueado`);
        setBlocked(true);
        // Redirigir después de bloquear
        setTimeout(() => router.push("/"), 1500);
      } catch (err) {
        console.error("Error bloqueando usuario:", err);
        toast.error('Error al bloquear usuario');
        setIsBlocking(false);
      }
    }
  };

  const handleReportClick = () => {
    setIsReportOpen(true);
  };

  const handleSubmitReport = async () => {
    if (!profile || !reportReason.trim()) return;
    try {
     await reportObject(profile.stream_id, reportReason);
      console.log("Report sent:", profile.stream_id, reportReason);
      toast.success('Reporte enviado correctamente');
      setIsReportOpen(false);
      setReportReason("");
    } catch (err) {
      console.error("Error reporting user:", err);
      toast.error('Error al enviar reporte');
    }
  };

  if (!profile) return null;

  return (
    <>
      <Toaster position="top-right" />
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4">

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-md">
        <div className="flex flex-col items-center">
          <div className="w-32 h-32 bg-gray-200 dark:bg-gray-700 rounded-full mb-4 overflow-hidden">
            <img
              src={profile.profilePicture || "/default-avatar.png"}
              alt="Avatar"
              className="w-full h-full object-cover"
            />
          </div>
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">
            {profile.username}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 break-all">
            {profile.controller}
          </p>
          <p className="mt-4 text-center text-gray-700 dark:text-gray-300">
            {profile.bio || "Sin biografía."}
          </p>
          <div className="flex space-x-2 mt-6">
            <button
              onClick={() => router.push("/")}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
            >
              Volver
            </button>

            {canAdd && (
              <button
                onClick={handleAddContact}
                className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition"
              >
                <FiUserPlus className="w-5 h-5" />
              </button>
            )}

            <button
              onClick={handleBlockUser}
              disabled={isBlocking}
              className={`px-4 py-2 text-white rounded-lg transition disabled:bg-gray-400 disabled:cursor-not-allowed ${
                blocked 
                  ? 'bg-green-500 hover:bg-green-600' 
                  : 'bg-orange-500 hover:bg-orange-600'
              }`}
            >
              {isBlocking 
                ? (blocked ? 'Desbloqueando...' : 'Bloqueando...') 
                : (blocked ? 'Desbloquear' : 'Bloquear')
              }
            </button>

            <button
              onClick={handleReportClick}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
            >
              Reportar
            </button>
            {/* Report Modal */}
      {isReportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-gray-200">
              Reportar usuario
            </h3>
            <textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="Explícanos la razón del reporte…"
              className="w-full h-24 p-2 border rounded bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none"
            />
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => {
                  setIsReportOpen(false);
                  setReportReason("");
                }}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmitReport}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
              >
                Enviar
              </button>
            </div>
          </div>
        </div>
      )}
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default OtherProfilePage;