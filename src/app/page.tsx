"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "./components/header";
import ChatList from "./components/chat-list";
import ChatInput from "./components/chat-input";
import SideBar from "./components/side-bar";
import { getMe } from "./ceramic/userService";
import { retrieveMessages, sendMessage } from "./ceramic/messageService";
import { useSession } from "@/context/SessionContext";
import { useAuthRedirect } from "@/hooks/useAuthRedirect";
import { FiMessageCircle } from "react-icons/fi";

const ChatApp = () => {
  const { isUnlocked, privateKey } = useSession();
  useAuthRedirect(true, { isUnlocked });
  const [user, setUser] = useState<string | null>(null);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const userLS = localStorage.getItem("orbis:user");
    if (userLS) {
      setUser(JSON.parse(userLS).stream_id);
    } 
  }, [router]);

  // Cuando cambia el chat seleccionado, cargamos mensajes
  useEffect(() => {
    if (!selectedChatId || !privateKey || !user) {
      setChatMessages([]);
      return;
    }
    let isMounted = true;

    setShouldScrollToBottom(true);

    const fetchMessages = async () => {
      try {
        const msgs = await retrieveMessages(selectedChatId, user, privateKey);
        if (!isMounted) return;
        
        const sortedMsgs = msgs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setChatMessages(sortedMsgs);
        // NO hacer scroll automático en fetch periódico
        setShouldScrollToBottom(false);
      } catch (e) {
        console.error("Error loading messages:", e);
      }
    };

    fetchMessages();
    // Hacer scroll inicial cuando se selecciona un chat
    setShouldScrollToBottom(false);

    const intervalId = setInterval(fetchMessages, 3000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [selectedChatId, privateKey, user]);

  const handleSend = async (rawMessage: string) => {
    if (!selectedChatId || !user || !privateKey) return;

    try {
      const { msgType, content } = JSON.parse(rawMessage);
      await sendMessage(content, selectedChatId, user, privateKey, msgType);
      
      // Recargar mensajes Y hacer scroll al enviar
      const msgs = await retrieveMessages(selectedChatId, user, privateKey);
      setChatMessages(
        msgs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      );
      setShouldScrollToBottom(true); // SÍ hacer scroll al enviar mensaje
    } catch (err) {
      console.error("Error enviando mensaje:", err);
    }
  };

  if (!user || !privateKey) return null;

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <SideBar
          selectedChatId={selectedChatId}
          onSelectChat={(chatId: string | null) => setSelectedChatId(chatId)}
        />

        <div className="flex flex-col flex-1">
          {selectedChatId ? (
            <>
              <ChatList 
                messages={chatMessages} 
                shouldScrollToBottom={shouldScrollToBottom}
                onScrollComplete={() => setShouldScrollToBottom(false)}
              />
              <ChatInput
                onSendMessage={handleSend}
                disabled={!selectedChatId}
              />
            </>
          ) : (
            <div className="flex flex-col flex-1 items-center justify-center text-center p-6">
              <FiMessageCircle
                size={64}
                className="text-gray-500 dark:text-gray-400 mb-4"
              />
              <h2 className="text-3xl font-bold text-gray-700 dark:text-gray-200">
                Bienvenido a Whispy
              </h2>
              <p className="mt-2 text-gray-500 dark:text-gray-400">
                Selecciona un chat para comenzar
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ChatApp;