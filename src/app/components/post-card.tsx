import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiChevronDown, FiChevronUp, FiFlag, FiHeart, FiMessageCircle } from "react-icons/fi";
import { checkLike, getNumberOfLikes, underlikeObject, likeObject } from "../ceramic/likeService";
import { getNumberOfReplies } from "../ceramic/replyService";
import { reportObject } from "../ceramic/reportService";


interface Post {
  stream_id: string;
  title?: string;
  date: string;
  content: string;
  username: string;
}

const PostCard: React.FC<{ post: Post }> = ({ post }) => {
  const [expanded, setExpanded] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [replyCount, setReplyCount] = useState(0);
  const [isReportOpen, setIsReportOpen] = useState(false);   
  const [reportReason, setReportReason] = useState("");         
  const router = useRouter();

  // Función para cargar datos (likes, replies, estado de like)
  const loadPostData = async () => {
    try {
      const [initialLiked, initialLikes, initialReplies] = await Promise.all([
        checkLike(post.stream_id),
        getNumberOfLikes(post.stream_id),
        getNumberOfReplies(post.stream_id),
      ]);
      setLiked(!!initialLiked);
      setLikeCount(initialLikes);
      setReplyCount(initialReplies);
    } catch (error) {
      console.error("Error cargando datos del post:", error);
    }
  };

  // Cargar datos inicialmente y configurar auto-refresh
  useEffect(() => {
    // Carga inicial
    loadPostData();

    // Configurar intervalo de 5 segundos
    const interval = setInterval(() => {
      loadPostData();
    }, 5000);

    // Limpiar intervalo al desmontar
    return () => clearInterval(interval);
  }, [post.stream_id]);

  const handleLike = async () => {
    if (liked) {
      await underlikeObject(post.stream_id);
      setLiked(false);
      setLikeCount((count) => Math.max(count - 1, 0));
    } else {
      await likeObject(post.stream_id);
      setLiked(true);
      setLikeCount((count) => count + 1);
    }
    // Recargar inmediatamente después de dar/quitar like
    await loadPostData();
  };

  const handleReport = () => {
    setIsReportOpen(true);
  };

  const handleSubmitReport = async () => {
    if (!reportReason.trim()) return;
    await reportObject(post.stream_id, reportReason);
    console.log("Report post:", post.stream_id, reportReason);
    setIsReportOpen(false);
    setReportReason("");
  };

  const navigateToPost = () => {
    router.push(`/post/${post.stream_id}`);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      {/* HEADER */}
      <div className="px-4 py-2 bg-gray-100 dark:bg-gray-700">
        <h2
          onClick={navigateToPost}
          className="text-xl font-semibold text-gray-900 dark:text-gray-100 hover:underline cursor-pointer"
        >
          {post.title || "Sin título"}
        </h2>
        <div className="flex items-center text-sm text-gray-700 dark:text-gray-300 mt-1">
          <span>
            {new Date(post.date).toLocaleString("es-ES", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </span>
          <span className="mx-2">•</span>
          <span>{post.username}</span>
        </div>
      </div>

      {/* CONTENT */}
      <div className="px-4 pt-2 pb-1 text-base text-gray-900 dark:text-gray-100 transition-all duration-200">
        <div
          className={`${expanded ? "" : "h-40 overflow-hidden"}`}
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </div>

      {/* ACTIONS */}
      <div className="px-4 pb-4 flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={handleLike}
            className="flex items-center focus:outline-none"
          >
            <FiHeart
              className={liked ? "text-red-500 fill-current" : "text-gray-500 dark:text-gray-400"}
              size={20}
            />
            <span className="ml-1 text-sm text-gray-700 dark:text-gray-300">
              {likeCount}
            </span>
          </button>

          <button
            onClick={navigateToPost}
            className="flex items-center ml-4 focus:outline-none"
          >
            <FiMessageCircle
              className="text-gray-500 dark:text-gray-400"
              size={20}
            />
            <span className="ml-1 text-sm text-gray-700 dark:text-gray-300">
              {replyCount}
            </span>
          </button>
          {/* Report */}
          <button
            onClick={handleReport}
            className="flex items-center ml-4 focus:outline-none"
          >
            <FiFlag className="text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400" size={20} />
          </button>
        </div>

        <button
          onClick={() => setExpanded((e) => !e)}
          className="flex items-center text-blue-500 hover:text-blue-600"
        >
          {expanded ? <FiChevronUp /> : <FiChevronDown />}
          <span className="ml-1 text-sm">
            {expanded ? "Ver menos" : "Ver más"}
          </span>
        </button>
      </div>
      {/* Report Modal */}
      {isReportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-gray-200">
              Reportar publicación
            </h3>
            <textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
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

export default PostCard;