"use client";
import React, { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { FiArrowLeft, FiPlus, FiX } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { checkJoined, getCommunityById, joinCommunity, leaveCommunity } from "@/app/ceramic/communityService";
import { createPost, retrieveCommunityPosts } from "@/app/ceramic/postService";
import dynamic from "next/dynamic";

const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });
import "react-quill-new/dist/quill.snow.css";
import { getUserByBcAdress } from "@/app/ceramic/userService";
import { parseToBcAddress } from "@/app/ceramic/orbisDB";
import PostCard from "@/app/components/post-card";





const CommunityPage: React.FC = () => {
  const { controller } = useParams() as { controller: string };
  const router = useRouter();
  const [community, setCommunity] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [showBanner, setShowBanner] = useState(true);
  const [joined, setJoined] = useState(false);    

  // estado editor
  const [editorOpen, setEditorOpen] = useState(false);
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");             

  const quillRef = useRef<any>(null);

  // Función para cargar datos de la comunidad y posts
  const loadCommunityData = async () => {
    try {
      const communityData = await getCommunityById(controller);
      setCommunity(communityData);
  
      const rawPosts = await retrieveCommunityPosts(controller);
      const postsConUser = await Promise.all(
        rawPosts.map(async post => {
          const bcAddress = parseToBcAddress(post.controller);
          let username = "Desconocido";

          if (bcAddress) {
            const user = await getUserByBcAdress(bcAddress);
            username = user.username;
          }

          return { ...post, username };
        })
      );
      setPosts(postsConUser);
    } catch (error) {
      console.error("Error cargando datos de la comunidad:", error);
    }
  };

  // Cargar estado de unión
  useEffect(() => {
    (async () => {
      try {
        setJoined(await checkJoined(controller));
      } catch (error) {
        console.error("Error verificando estado de unión:", error);
      }
    })();
  }, [controller]);

  const handleToggleJoin = async () => {
    if (joined) {
      await leaveCommunity(controller);
      setJoined(false);
    } else {
      await joinCommunity(controller);
      setJoined(true);
    }
  };

  // Cargar datos inicialmente y configurar auto-refresh
  useEffect(() => {
    // Carga inicial
    loadCommunityData();

    // Configurar intervalo de 5 segundos
    const interval = setInterval(() => {
      console.log("🔄 Recargando comunidad y posts...");
      loadCommunityData();
    }, 5000);

    // Limpiar intervalo al desmontar
    return () => clearInterval(interval);
  }, [controller]);

  useEffect(() => {
    const onScroll = () => setShowBanner(window.scrollY < 80);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleJoin = async () => {
    await joinCommunity(controller);
  };

  const handleSubmit = async () => {
    if (!content.trim()) return;
    await createPost(content, controller, title);
    // Recargar inmediatamente después de publicar
    await loadCommunityData();
    setContent("");
    setTitle("");
    setEditorOpen(false);
    console.log("Publicar:", content);
  };

  return (
    <div className="relative min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Banner */}
<div
  className={`fixed top-0 left-0 right-0 bg-white dark:bg-gray-800 shadow-md transition-transform duration-300 z-10 ${
    showBanner ? "translate-y-0" : "-translate-y-full"
  }`}
>
  <div className="flex items-center justify-between p-4">
    <button
      onClick={() => router.push("/")}
      className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition"
    >
      <FiArrowLeft className="text-xl" />
    </button>
    
    {/* Contenedor central con título y descripción */}
    <div className="flex-1 text-center px-4">
      <h1 className="text-lg font-bold truncate">
        {community?.name || "Cargando..."}
      </h1>
      {community?.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 truncate mt-1">
          {community.description}
        </p>
      )}
    </div>
    
    <button
      onClick={handleToggleJoin}
      className={`px-4 py-2 rounded-lg transition flex-shrink-0
        ${joined 
          ? "bg-red-500 hover:bg-red-600 text-white" 
          : "bg-blue-500 hover:bg-blue-600 text-white"
        }`}
    >
      {joined ? "Salir" : "Unirme"}       
    </button>
  </div>
</div>

      {/* Posts */}
      <div className="pt-20 px-4 space-y-4 pb-32">
      {posts.length > 0 ? (
  posts.map((post) => (
      <PostCard key={post.stream_id} post={post} />
          ))
        ) : (
          <p className="text-center text-gray-500 dark:text-gray-400">
            No hay publicaciones.
          </p>
        )}
      </div>

      {/* Floating Add Button */}
      <div className="fixed bottom-6 right-6">
        <motion.button
          onClick={() => setEditorOpen(o => !o)}
          className="w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-lg"
          whileTap={{ scale: 0.9 }}
        >
          {editorOpen ? <FiX size={24} /> : <FiPlus size={24} />}
        </motion.button>
      </div>

      {/* Editor Panel */}
<AnimatePresence>
  {editorOpen && (
    <motion.div
      className="
        fixed bottom-20
        right-6 left-auto
        max-w-3xl w-[calc(100%-3rem)] h-[60vh]
        p-6 bg-white dark:bg-gray-800
        rounded-2xl shadow-2xl z-20

        flex flex-col
        min-h-0
      "
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      transition={{ duration: 0.2 }}
    >
      {/* Input de título */}
      <input
              type="text"
              placeholder="Título del post…"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mb-4 p-2 border rounded bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />

      <ReactQuill
        theme="snow"
        value={content}
        onChange={setContent}
        modules={{
          toolbar: {
            container: [
              ["bold", "italic", "underline", "strike"],
              [{ list: "ordered" }, { list: "bullet" }],
              ["link", "image"],
            ],
          },
        }}
        className="
          flex flex-col
          flex-1
          min-h-0
          bg-white dark:bg-gray-800
          text-gray-900 dark:text-gray-100
          mb-4
        "
      />

      <button
        onClick={handleSubmit}
        className="mt-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
      >
        Publicar
      </button>

      <style jsx global>{`
        .ql-toolbar {
          background-color: #f3f4f6;
          border-bottom: 1px solid #d1d5db;
        }
        .dark .ql-toolbar {
          background-color: rgb(134, 138, 146);
          border-bottom: 1px solid #4b5563;
        }
        .ql-toolbar .ql-formats button {
          color: #1f2937;
        }
        .dark .ql-toolbar .ql-formats button {
          color: #f3f4f6;
        }

        .ql-container {
          flex: 1 !important;
          display: flex !important;
          flex-direction: column !important;
          min-height: 0 !important;
          overflow-y: auto;
          border: none;
        }
        .ql-editor {
          flex: 1 !important;
          min-height: 0 !important;
        }
      `}</style>
    </motion.div>
  )}
</AnimatePresence>


    </div>
  );
};

export default CommunityPage;