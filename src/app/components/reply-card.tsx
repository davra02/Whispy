"use client";
import React, { useState, useEffect } from "react";
import { FiHeart, FiChevronDown, FiChevronUp, FiFlag } from "react-icons/fi";
import { checkLike, getNumberOfLikes, underlikeObject, likeObject } from "../ceramic/likeService";
import { reportObject } from "../ceramic/reportService";

interface Reply {
  stream_id: string;
  content: string;
  date: string;
  username: string;
}

const ReplyCard: React.FC<{ reply: Reply }> = ({ reply }) => {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");

  // Función para cargar datos de likes
  const loadReplyData = async () => {
    try {
      const [initialLiked, initialCount] = await Promise.all([
        checkLike(reply.stream_id),
        getNumberOfLikes(reply.stream_id),
      ]);
      setLiked(!!initialLiked);
      setLikeCount(initialCount);
    } catch (error) {
      console.error("Error cargando datos de la respuesta:", error);
    }
  };

  // Cargar datos inicialmente y configurar auto-refresh
  useEffect(() => {
    // Carga inicial
    loadReplyData();

    // Configurar intervalo de 5 segundos
    const interval = setInterval(() => {
      loadReplyData();
    }, 5000);

    // Limpiar intervalo al desmontar
    return () => clearInterval(interval);
  }, [reply.stream_id]);

  const handleLike = async () => {
    if (liked) {
      await underlikeObject(reply.stream_id);
      setLiked(false);
      setLikeCount((c) => Math.max(c - 1, 0));
    } else {
      await likeObject(reply.stream_id);
      setLiked(true);
      setLikeCount((c) => c + 1);
    }
    // Recargar inmediatamente después de dar/quitar like
    await loadReplyData();
  };

  const handleReport = () => {
    setIsReportOpen(true);
  };

  const handleSubmitReport = async () => {
    if (!reportReason.trim()) return;
    await reportObject(reply.stream_id, reportReason);
    console.log("Report reply:", reply.stream_id, reportReason);
    setIsReportOpen(false);
    setReportReason("");
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2 bg-gray-100 dark:bg-gray-700 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {reply.username}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-300">
            {new Date(reply.date).toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" })}
          </span>
        </div>
        <button onClick={() => setExpanded((e) => !e)} className="focus:outline-none">
          {expanded ? <FiChevronUp className="text-gray-600 dark:text-gray-300" /> : <FiChevronDown className="text-gray-600 dark:text-gray-300" />}
        </button>
      </div>

      {/* Content */}
      <div className="px-4 pt-2 pb-1 text-gray-900 dark:text-gray-100">
        <div className={`${expanded ? "" : "h-32 overflow-hidden"}`} dangerouslySetInnerHTML={{ __html: reply.content }} />
      </div>

      {/* Footer Actions */}
      <div className="px-4 pb-4 flex items-center">
        <button onClick={handleLike} className="flex items-center focus:outline-none">
          <FiHeart 
            className={liked ? "text-red-500 fill-current" : "text-gray-500 dark:text-gray-400"} 
            size={18} 
          />
          <span className="ml-1 text-sm text-gray-700 dark:text-gray-300">{likeCount}</span>
        </button>
        <button
          onClick={handleReport}
          className="flex items-center ml-4 focus:outline-none"
        >
          <FiFlag
            className="text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400"
            size={18}
          />
        </button>
      </div>
      {/* Report Modal */}
      {isReportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-gray-200">
              Reportar respuesta
            </h3>
            <textarea
              value={reportReason}
              onChange={e => setReportReason(e.target.value)}
              placeholder="Motivo del reporte…"
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
  );
};

export default ReplyCard;