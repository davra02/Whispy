import { useEffect, useRef, useState } from "react";
import { getUserById } from "../ceramic/userService";

interface Message {
  stream_id: string;
  author: string;
  content: string;
  date: string;
  msgType: string;
}

interface ChatListProps {
  messages: Message[];
  shouldScrollToBottom?: boolean;
  onScrollComplete?: () => void;
}

const ChatList: React.FC<ChatListProps> = ({ 
  messages, 
  shouldScrollToBottom = false,
  onScrollComplete 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [myStreamId, setMyStreamId] = useState<string | null>(null);
  const [usernames, setUsernames] = useState<Record<string, string>>({});

  useEffect(() => {
    const stored = localStorage.getItem("orbis:user");
    const me = stored ? JSON.parse(stored).stream_id : null;
    setMyStreamId(me);
  }, []);

  // Solo hacer scroll cuando shouldScrollToBottom sea true
  useEffect(() => {
    if (shouldScrollToBottom && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
      onScrollComplete?.(); // Notificar que se completó el scroll
    }
  }, [messages, shouldScrollToBottom, onScrollComplete]);

  const sorted = [...messages].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  useEffect(() => {
    const authors = Array.from(new Set(sorted.map((m) => m.author)));
    const missing = authors.filter((id) => !usernames[id]);
    if (missing.length === 0) return;

    missing.forEach(async (id) => {
      try {
        const user = await getUserById(id);
        setUsernames((prev) => ({ ...prev, [id]: user.username }));
      } catch (e) {
        console.error("Error fetching username for", id, e);
      }
    });
  }, [sorted, usernames]);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto p-4 bg-gray-100 dark:bg-gray-900 flex flex-col space-y-3"
    >
      {sorted.map((msg) => {
        const isMine = msg.author === myStreamId;
        const time = new Date(msg.date).toLocaleTimeString("es-ES", {
          hour: "2-digit",
          minute: "2-digit",
        });
        const authorName =
          msg.author === myStreamId
            ? "Tú"
            : usernames[msg.author] || msg.author.substring(0, 6);

        return (
          <div
            key={msg.stream_id}
            className={`max-w-[80%] w-fit min-w-[100px] p-3 rounded-2xl shadow-md break-words flex flex-col
            ${isMine
                ? "self-end bg-blue-500 text-white"
                : "self-start bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
              }`}
          >
            {/* Autor */}
            <span className="mb-1 text-xs text-gray-300 dark:text-gray-400">
              {authorName}
            </span>

            {/* Contenido del mensaje */}
            <div className="flex-1 text-sm max-w-full overflow-hidden space-y-2">
              {msg.msgType === "text" && (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}

              {msg.msgType === "image" && (
                <img
                  src={msg.content}
                  alt="Imagen"
                  className="rounded-lg max-w-xs w-full object-cover border"
                />
              )}

              {msg.msgType === "audio" && (
                <audio
                  controls
                  src={msg.content}
                  preload="auto"
                  controlsList="nodownload"
                  className="w-full rounded-md"
                >
                  Tu navegador no soporta audio.
                </audio>
              )}

              {msg.msgType === "file" && (
                <div className="flex items-center space-x-2">
                  <span>📄</span>
                  <a
                    href={msg.content}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-100 underline break-all"
                  >
                    Documento adjunto
                  </a>
                </div>
              )}
            </div>

            {/* Hora */}
            <span className="mt-1 text-xs text-gray-300 dark:text-gray-400 self-end">
              {time}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default ChatList;