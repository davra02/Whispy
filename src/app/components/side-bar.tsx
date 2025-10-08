import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { FiArrowLeft, FiSettings, FiLogOut, FiChevronUp, FiChevronDown, FiCheck, FiX, FiSlash, FiMoreVertical, FiChevronRight, FiChevronLeft, FiUsers, FiMenu, FiUserPlus } from "react-icons/fi";
import { useRouter } from "next/navigation";
import ThemeToggle from "./ThemeToggle";
import { createChat, getChatMembers, leaveChat, retrieveMyChats, addMember, removeMember } from "../ceramic/chatService";
import { acceptFriendRequest, countFriendRequests, deleteContact, retrieveContacts, retrieveFriendRequests, sendFriendRequest } from "../ceramic/relationService";
import { createCommunity, retrieveMyCommunities, searchCommunities } from "../ceramic/communityService";


interface SideBarProps {
  selectedChatId: string | null;
  onSelectChat: (chatId: string | null) => void;
}

const SideBar: React.FC<SideBarProps> = ({ selectedChatId, onSelectChat }) => {
  const [activeSection, setActiveSection] = useState<
    "main" | "contacts" | "chats" | "communities"
  >("main");

  const [confirmBlockId, setConfirmBlockId] = useState<string | null>(null);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [isPendingOpen, setIsPendingOpen] = useState(false);
  const [contacts, setContacts] = useState<any[]>([]);
  const [newContactId, setNewContactId] = useState("");
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCreateChatOpen, setIsCreateChatOpen] = useState(false);
  const [chatName, setChatName] = useState("");
  const [members, setMembers] = useState<string[]>([]);
  const [chats, setChats] = useState<any[]>([]);
  const [availableContacts, setAvailableContacts] = useState<any[]>([]);
  const [selectedMembersForChat, setSelectedMembersForChat] = useState<string[]>([]);
  const [contactSearchTerm, setContactSearchTerm] = useState("");
  const [chatMenuOpenFor, setChatMenuOpenFor] = useState<string | null>(null);
  const [showMembersFor, setShowMembersFor] = useState<string | null>(null);
  const [chatMembers, setChatMembers] = useState<{ username: string; userId: string }[]>([]);
  const [communities, setCommunities] = useState<any[]>([]);
  const [isCreateCommunityOpen, setIsCreateCommunityOpen] = useState(false);
  const [newCommunityName, setNewCommunityName] = useState("");
  const [newCommunityDesc, setNewCommunityDesc] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [communityMenuOpen, setCommunityMenuOpen] = useState(false);
  const [isExploreOpen, setIsExploreOpen] = useState(false);
  const [exploreTerm, setExploreTerm] = useState("");
  const [exploreResults, setExploreResults] = useState<any[]>([]);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [membersChat, setMembersChat] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [contactToDelete, setContactToDelete] = useState<string>("");
  const [confirmLeaveChatId, setConfirmLeaveChatId] = useState<string | null>(null);
  const [chatToDelete, setChatToDelete] = useState<string>("");
  const [isAddingMemberToChat, setIsAddingMemberToChat] = useState(false);
  const [addMemberSearchTerm, setAddMemberSearchTerm] = useState("");
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [confirmRemoveMember, setConfirmRemoveMember] = useState<{ chatId: string; userId: string; username: string } | null>(null);

  const router = useRouter();

  const handleBack = () => setActiveSection("main");

  // Animaciones para las transiciones
  const variants = {
    hidden: { x: "-100%", opacity: 0 },
    visible: { x: 0, opacity: 1 },
    exit: { x: "100%", opacity: 0 },
  };

  const handleDeleteContact = async (contactId: string) => {
    try {
      await deleteContact(contactId);
      console.log("Contacto eliminado:", contactId);
      setConfirmDeleteId(null);
      const updatedContacts = await retrieveContacts();
      setContacts(updatedContacts);
    } catch (error) {
      console.error("Error eliminando contacto:", error);
    }
  };

  const openDeleteConfirmation = (contactId: string, contactName: string) => {
    setConfirmDeleteId(contactId);
    setContactToDelete(contactName);
  };

  const openLeaveChatModal = (chatId: string, chatTitle: string) => {
    setConfirmLeaveChatId(chatId);
    setChatToDelete(chatTitle);
  };

  const openMembersModal = async (chatId: string, title: string) => {
    try {
      const members:any = await getChatMembers(chatId);
      setMembersChat(title);
      setChatMembers(members);
      setShowMembersFor(chatId);
      setCurrentChatId(chatId);
    } catch (e) {
      console.error("Error cargando miembros de chat:", e);
    }
  };

  const openRemoveMemberConfirmation = (chatId: string, userId: string, username: string) => {
    setConfirmRemoveMember({ chatId, userId, username });
  };

  const handleRemoveMember = async () => {
    if (!confirmRemoveMember) return;
    
    try {
      await removeMember(confirmRemoveMember.chatId, confirmRemoveMember.userId);
      // Recargar miembros
      const updatedMembers:any = await getChatMembers(confirmRemoveMember.chatId);
      setChatMembers(updatedMembers);
      const updatedChats = await retrieveMyChats();
      setChats(updatedChats);
      setConfirmRemoveMember(null);
    } catch (error) {
      console.error("Error eliminando miembro:", error);
      setConfirmRemoveMember(null);
    }
  };

  const handleAddMemberToExistingChat = async (chatId: string, userId: string) => {
    try {
      await addMember(chatId, userId);
      // Recargar miembros
      const updatedMembers:any = await getChatMembers(chatId);
      setChatMembers(updatedMembers);
      setAddMemberSearchTerm("");
      setIsAddingMemberToChat(false);
    } catch (error) {
      console.error("Error añadiendo miembro:", error);
    }
  };

  // Filtrar contactos que NO están ya en el chat
  const availableContactsForChat = useMemo(() => {
    if (!isAddingMemberToChat || !currentChatId) return [];
    const memberIds = chatMembers.map(m => m.userId);
    return contacts.filter(c => 
      !memberIds.includes(c.stream_id) &&
      (c.username || c.controller).toLowerCase().includes(addMemberSearchTerm.toLowerCase())
    );
  }, [contacts, chatMembers, addMemberSearchTerm, isAddingMemberToChat, currentChatId]);

  useEffect(() => {
    (async () => {
      try {
        const count = await countFriendRequests();
        setPendingCount(count);
      } catch (e) {
        console.error("Error contando solicitudes:", e);
      }
    })();
  }, []);

  useEffect(() => {
    setPendingCount(pendingRequests.length);
  }, [pendingRequests]);

  // Actualizar pendingRequests cada 5 segundos
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const pending = await retrieveFriendRequests();
        setPendingRequests(pending);
      } catch (e) {
        console.error("Error actualizando solicitudes pendientes:", e);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Obtener chats cuando se selecciona la sección "chats"
  useEffect(() => {
    const fetchChats = async () => {
      try {
        const myChats = await retrieveMyChats();
        console.log("Chats obtenidos:", myChats);
        setChats(myChats);
      } catch (error) {
        console.error("Error al obtener los chats:", error);
      }
    };

    if (activeSection === "chats") {
      fetchChats();
    }

    if (activeSection === "communities") {
      retrieveMyCommunities()
        .then(rows => setCommunities(rows))
        .catch(console.error);
    }
  }, [activeSection]);

  useEffect(() => {
    if (!exploreTerm) {
      setExploreResults([]);
      return;
    }
    let active = true;
    (async () => {
      try {
        const rows = await searchCommunities(exploreTerm);
        if (active) setExploreResults(rows);
      } catch (e) {
        console.error("Error buscando comunidades:", e);
      }
    })();
    return () => { active = false };
  }, [exploreTerm]);

  const handleCreateCommunity = async () => {
    if (!newCommunityName.trim()) return;
    try {
      await createCommunity(newCommunityName, newCommunityDesc);
      setIsCreateCommunityOpen(false);
      setNewCommunityName("");
      setNewCommunityDesc("");
      const rows = await retrieveMyCommunities();
      setCommunities(rows);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (isCreateChatOpen) {
      (async () => {
        try {
          const data = await retrieveContacts();
          setAvailableContacts(data);
        } catch (err) {
          console.error("Error cargando contactos para chat:", err);
        }
      })();
    }
  }, [isCreateChatOpen]);

  // Cargar contactos cuando se abre el modal de añadir miembro
  useEffect(() => {
    if (isAddingMemberToChat) {
      (async () => {
        try {
          const data = await retrieveContacts();
          setContacts(data);
        } catch (err) {
          console.error("Error cargando contactos:", err);
        }
      })();
    }
  }, [isAddingMemberToChat]);

  const filteredContacts = useMemo(() => 
    availableContacts
      .filter(c => {
        const name = (c.username || c.controller).toLowerCase();
        return name.includes(contactSearchTerm.toLowerCase());
      })
      .filter(c => !selectedMembersForChat.includes(c.stream_id))
  , [availableContacts, contactSearchTerm, selectedMembersForChat]);


  const handleSelectMember = (streamId: string, checked: boolean) => {
    setSelectedMembersForChat(prev =>
      checked
        ? [...prev, streamId]
        : prev.filter(id => id !== streamId)
    );
  };

  const handleContactsClick = async () => {
    setActiveSection("contacts");
    try {
      const data = await retrieveContacts();
      setContacts(data);
      const pending = await retrieveFriendRequests();
      setPendingRequests(pending);
    } catch (error) {
      console.error("Error al obtener contactos o pendientes:", error);
    }
  };

  const handleAcceptRequest = async (userPeer: string, eventPeer: string) => {
    try {
      await acceptFriendRequest(userPeer, eventPeer);
      const updatedContacts = await retrieveContacts();
      setContacts(updatedContacts);
      const updatedPending = await retrieveFriendRequests();
      setPendingRequests(updatedPending);
    } catch (error) {
      console.error("Error al aceptar petición:", error);
    }
  };

  const handleRejectRequest = async (streamId: string) => {
    try {
      setPendingRequests(prev => prev.filter(req => req.stream_id !== streamId));
    } catch (error) {
      console.error("Error al rechazar petición:", error);
    }
  };

  const performBlock = async () => {
    if (!confirmBlockId) return;
    try {
      await handleBlockRequest(confirmBlockId);
    } catch (e) {
      console.error("Error bloqueando usuario:", e);
    }
    setConfirmBlockId(null);
  };

  const handleBlockRequest = async (from: string) => {
    console.log("Bloquear usuario:", from);
  };

  const handleSendFriendRequest = async (to: string) => {
    try {
      await sendFriendRequest(to);
      setIsAddContactOpen(false);
    } catch (error) {
      console.error("Error enviando petición de amistad:", error);
    }
  };

  const handleMemberChange = (index: number, value: string) => {
    const newMembers = [...members];
    newMembers[index] = value;
    setMembers(newMembers);
  };

  const addMemberInput = () => {
    setMembers([...members, ""]);
  };

  const removeMemberInput = (index: number) => {
    const newMembers = [...members];
    newMembers.splice(index, 1);
    setMembers(newMembers);
  };

  const handleCreateChat = async () => {
    if (!chatName.trim() || selectedMembersForChat.length === 0) return;
    try {
      await createChat(chatName, selectedMembersForChat);
      const myChats = await retrieveMyChats();
      setChats(myChats);
      setIsCreateChatOpen(false);
      setChatName("");
      setSelectedMembersForChat([]);
    } catch (error) {
      console.error("Error creando chat:", error);
    }
  };

  const openCommunityPopup = () => {
    setCommunityMenuOpen((o) => !o);
  };

  return (
    <div
      className={`flex flex-col bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200
                  shadow-lg overflow-hidden h-full transition-all duration-300
                  ${collapsed ? "w-16" : "w-64"}`}
    >
      {/* Toggle button */}
      <div className="flex justify-end bg-gray-300 dark:bg-gray-800">
      <button
        onClick={() => setCollapsed(c => !c)}
        className="m-2 p-2 rounded hover:bg-gray-300 dark:hover:bg-gray-700 transition self-end"
      >
        {collapsed ? <FiChevronRight /> : <FiChevronLeft />}
      </button>
      </div>
    {/* Contenido superior: Menú y secciones */}
    {!collapsed && (
        <>
    <div className="flex-grow">
      <div className="flex items-center">
        {activeSection !== "main" && (
          <button
            onClick={handleBack}
            className="p-2 rounded-full hover:bg-gray-400 dark:hover:bg-gray-600 transition"
          >
            <FiArrowLeft className="text-xl" />
          </button>
        )}
        <h2
          className={`text-lg font-bold ${
            activeSection === "main" ? "hidden" : "block"
          }`}
        >
          {activeSection === "contacts" && "Contactos"}
          {activeSection === "chats" && "Chats"}
          {activeSection === "communities" && "Comunidades"}
        </h2>
      </div>

      <motion.div
        key={activeSection}
        variants={variants}
        initial="hidden"
        animate="visible"
        exit="exit"
        transition={{ duration: 0.3 }}
        className="p-4"
      >
        {activeSection === "main" && (
          <div className="space-y-4">
            <div className="flex">
             <div className="relative flex-grow">
                  <button
                    onClick={handleContactsClick}
                    className="w-full p-3 bg-blue-500 text-white rounded-l-lg hover:bg-blue-600 transition"
                  >
                    Contactos
                  </button>
                  {pendingCount > 0 && (
                    <span className="absolute -top-1 -left-1 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
                      {pendingCount}
                    </span>
                  )}
                </div>
              <button
                onClick={() => setIsAddContactOpen(true)}
                className="p-3 bg-blue-500 text-white rounded-r-lg hover:bg-blue-600 transition"
              >
              <FiUserPlus className="text-xl" />
              </button>
              </div>
                <button
                  onClick={() => setActiveSection("chats")}
                  className="w-full p-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
                >
                  Chats
                </button>
                <div className="flex">
                  <button
                    onClick={() => setActiveSection("communities")}
                    className="flex-grow p-3 bg-violet-500 text-white rounded-l-lg hover:bg-violet-600 transition"
                  >
                    Comunidades
                  </button>
                  <div className="flex relative">
                  <button
                    onClick={openCommunityPopup}
                    className="p-3 bg-violet-500 text-white rounded-r-lg hover:bg-violet-600 transition"
                  >
                    <FiMenu className="text-xl" />
                  </button>
                  {communityMenuOpen && (
                  <div className="absolute top-full right-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg z-50">
                    <button
                      onClick={() => {
                        setIsCreateCommunityOpen(true);
                        setCommunityMenuOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                      Crear comunidad
                    </button>
                    <button
                      onClick={() => {
                        setIsExploreOpen(true);
                        setCommunityMenuOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      Explorar comunidades
                    </button>

                  </div>
                )}
                </div>
                </div>
            </div>
          )}

    {activeSection === "contacts" && (
        <>
          <ul className="space-y-2">
            {contacts.length > 0 ? (
              contacts.map((c) => (
                <li
                  key={c.stream_id}
                  className="flex items-center bg-gray-300 dark:bg-gray-700 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600 transition"
                >
                  <div
                    onClick={() => router.push(`/profile/${c.stream_id}`)}
                    className="flex-1 p-3 cursor-pointer"
                  >
                    {c.username || c.controller}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openDeleteConfirmation(c.stream_id, c.username || c.controller);
                    }}
                    className="p-3 text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900 rounded-r-lg transition"
                    style={{ paddingTop: '15px', paddingBottom: '15px' }}
                  >
                    <FiX className="text-lg" />
                  </button>
                </li>
              ))
            ) : (
              <p>No hay contactos.</p>
            )}
          </ul>
          {/* Modal de confirmación para eliminar contacto */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 p-6 rounded-lg shadow-lg w-80"
          >
            <h3 className="text-lg font-bold mb-4">Confirmar eliminación</h3>
            <p className="mb-6">
              ¿Estás seguro de que quieres eliminar a <strong>{contactToDelete}</strong> de tus contactos?
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-400 dark:hover:bg-gray-600 transition"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteContact(confirmDeleteId)}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
              >
                Eliminar
              </button>
            </div>
          </motion.div>
        </div>
      )}

        {/* BANDA DE PENDING */}
        <div
          onClick={() => setIsPendingOpen((o) => !o)}
          className="mt-4 bg-yellow-100 dark:bg-yellow-700 flex justify-between items-center px-4 py-2 rounded-lg cursor-pointer"
        >
          <span className="text-yellow-800 dark:text-yellow-200">
            Solicitudes pendientes ({pendingRequests.length})
          </span>
          {isPendingOpen ? (
            <FiChevronUp className="text-yellow-800 dark:text-yellow-200" />
          ) : (
            <FiChevronDown className="text-yellow-800 dark:text-yellow-200" />
          )}
        </div>

        {isPendingOpen && (
          <ul className="mt-2 space-y-2">
          {pendingRequests.length > 0 ? (
            pendingRequests.map((req) => (
              <li
                key={req.stream_id}
                className="flex justify-between items-center bg-yellow-50 dark:bg-yellow-800 p-3 rounded-lg"
              >
                <span className="text-gray-800 dark:text-gray-200">
                  {req.username}
                </span>
                <div className="flex space-x-2">
                <button
                  onClick={() => handleAcceptRequest(req.userStream, req.eventToRespond)}
                  className="p-1 bg-green-500 text-white rounded-full hover:bg-green-600 transition"
                >
                  <FiCheck className="text-lg" />
                </button>
                <button
                  onClick={() => handleRejectRequest(req.stream_id)}
                  className="p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition"
                >
                  <FiX className="text-lg" />
                </button>
                <button
                  onClick={() => setConfirmBlockId(req.stream_id)}
                  className="p-1 bg-gray-500 text-white rounded-full hover:bg-gray-600 transition"
                >
                  <FiSlash className="text-lg" />
                </button>
                </div>
              </li>
            ))
          ) : (
            <p className="px-4 py-2 text-gray-600 dark:text-gray-400">
              No hay solicitudes pendientes.
            </p>
          )}
        </ul>
        )}
      </>
    )}

    {/* Confirmación de bloqueo */}
    {confirmBlockId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 p-6 rounded-lg shadow-lg w-80"
          >
            <h3 className="text-lg font-bold mb-4">Confirmar bloqueo</h3>
            <p className="mb-6">
              ¿Estás seguro de bloquear a este usuario? Ya no podrás ver sus peticiones.
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setConfirmBlockId(null)}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-400 dark:hover:bg-gray-600 transition"
              >
                Cancelar
              </button>
              <button
                onClick={performBlock}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
              >
                Bloquear
              </button>
            </div>
          </motion.div>
        </div>
      )}

{activeSection === "chats" && (
        <>
          <ul className="space-y-2">
          {chats.map((chat) => {
  const isSelected = chat.stream_id === selectedChatId;
  return (
    <li key={chat.stream_id} className="relative flex items-center">
      <div
        onClick={() => onSelectChat(chat.stream_id)}
        className={`flex-1 px-3 py-3 rounded-l-lg cursor-pointer transition ${
          isSelected
            ? "bg-indigo-500 text-white"
            : "bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600"
        }`}
      >
        {chat.title || `Chat ${chat.stream_id.substring(0, 6)}`}
      </div>
      <button
        onClick={() =>
          setChatMenuOpenFor(
            chatMenuOpenFor === chat.stream_id ? null : chat.stream_id
          )
        }
        className={`px-3 py-3 pb-4 rounded-r-lg flex items-center justify-center transition ${
          isSelected
            ? "bg-indigo-500 text-white"
            : "bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600"
        }`}
      >
        <FiMoreVertical className="text-xl" />
      </button>
                  {chatMenuOpenFor === chat.stream_id && (
                    <div className="absolute right-0 top-0 w-36 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg z-50">
                      <button
                        onClick={() => {
                          openMembersModal(chat.stream_id, chat.title);
                          setChatMenuOpenFor(null);
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                      >
                        Ver miembros
                      </button>
                      <button
                        onClick={() => {
                          openLeaveChatModal(chat.stream_id, chat.title);
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                      >
                        Salir del chat
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          <button
            onClick={() => setIsCreateChatOpen(true)}
            className="mt-4 w-full p-3 bg-indigo-500 text-white rounded-lg"
          >
            Crear Chat
          </button>
        </>
      )}
      {/* Modal de confirmación para salir del chat */}
      {confirmLeaveChatId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 p-6 rounded-lg shadow-lg w-80"
          >
            <h3 className="text-lg font-bold mb-4">Confirmar salida</h3>
            <p className="mb-6">
              ¿Estás seguro de que quieres salir de <strong>{chatToDelete}</strong>? Ya no tendrás acceso a este chat.
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setConfirmLeaveChatId(null)}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-400 dark:hover:bg-gray-600 transition"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  try {
                    await leaveChat(confirmLeaveChatId!);
                    const myChats = await retrieveMyChats();
                    setChats(myChats);
                    if (selectedChatId === confirmLeaveChatId) {
                      onSelectChat(null);
                    }
                  } catch (e) {
                    console.error("Error saliendo del chat:", e);
                  }
                  setConfirmLeaveChatId(null);
                }}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
              >
                Salir
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal de confirmación para eliminar miembro */}
      {confirmRemoveMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 p-6 rounded-lg shadow-lg w-80"
          >
            <h3 className="text-lg font-bold mb-4">Confirmar eliminación</h3>
            <p className="mb-6">
              ¿Estás seguro de que quieres eliminar a <strong>{confirmRemoveMember.username}</strong> del chat?
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setConfirmRemoveMember(null)}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-400 dark:hover:bg-gray-600 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleRemoveMember}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
              >
                Eliminar
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal de miembros MEJORADO */}
      {showMembersFor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 p-6 rounded-lg shadow-lg w-96 max-h-[80vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Miembros de {membersChat}</h3>
              <button onClick={() => {
                setShowMembersFor(null);
                setIsAddingMemberToChat(false);
                setAddMemberSearchTerm("");
              }}>
                <FiX />
              </button>
            </div>

            {/* Lista de miembros con botón de eliminar */}
            <ul className="space-y-2 mb-4">
              {chatMembers.map((m) => (
                <li
                  key={m.userId}
                  className="flex items-center justify-between px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg"
                >
                  <span
                    onClick={() => {
                      setShowMembersFor(null);
                      router.push(`/profile/${m.userId}`);
                    }}
                    className="cursor-pointer hover:text-blue-500 flex-1"
                  >
                    {m.username}
                  </span>
                  <button
                    onClick={() => openRemoveMemberConfirmation(showMembersFor, m.userId, m.username)}
                    className="ml-2 p-1 text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900 rounded transition"
                  >
                    <FiX className="text-lg" />
                  </button>
                </li>
              ))}
            </ul>

            {/* Botón para abrir/cerrar sección de añadir miembro */}
            {!isAddingMemberToChat ? (
              <button
                onClick={() => setIsAddingMemberToChat(true)}
                className="w-full p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition flex items-center justify-center"
              >
                <FiUserPlus className="mr-2" />
                Añadir miembro
              </button>
            ) : (
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">Añadir nuevo miembro</h4>
                <input
                  type="text"
                  value={addMemberSearchTerm}
                  onChange={e => setAddMemberSearchTerm(e.target.value)}
                  placeholder="Buscar contacto..."
                  className="w-full p-2 border rounded-lg mb-2 bg-gray-50 dark:bg-gray-700"
                />
                {addMemberSearchTerm && availableContactsForChat.length > 0 && (
                  <ul className="max-h-40 overflow-auto border rounded-lg">
                    {availableContactsForChat.map(c => (
                      <li
                        key={c.stream_id}
                        onClick={() => handleAddMemberToExistingChat(showMembersFor, c.stream_id)}
                        className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer"
                      >
                        {c.username || c.controller}
                      </li>
                    ))}
                  </ul>
                )}
                {addMemberSearchTerm && availableContactsForChat.length === 0 && (
                  <p className="text-sm text-gray-500">No hay contactos disponibles</p>
                )}
                <button
                  onClick={() => {
                    setIsAddingMemberToChat(false);
                    setAddMemberSearchTerm("");
                  }}
                  className="mt-2 w-full p-2 bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600 transition"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

{activeSection === "communities" && (
        <>
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold">Mis comunidades</h3>
            <button
              onClick={() => setIsCreateCommunityOpen(true)}
              className="px-3 py-1 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition flex"
            >
        +<FiUsers className="text-xl" /> 
        </button>
          </div>
          <ul className="space-y-2">
            {communities.length > 0 ? (
              communities.map(c => (
                <li
                  key={c.stream_id}
                  onClick={() => router.push(`/community/${c.stream_id}`)}
                  className="p-3 bg-gray-300 dark:bg-gray-700 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600 transition cursor-pointer"
                >
                  {c.name}
                </li>
              ))
            ) : (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                No participas en ninguna comunidad.
              </p>
            )}
          </ul>
        </>
      )}

{isCreateCommunityOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 p-6 rounded-lg shadow-lg w-80"
          >
            <h3 className="text-lg font-bold mb-4">Crear Comunidad</h3>
            <input
              type="text"
              value={newCommunityName}
              onChange={e => setNewCommunityName(e.target.value)}
              placeholder="Nombre"
              className="w-full p-2 border rounded-lg mb-3 bg-gray-100 dark:bg-gray-700"
            />
            <textarea
              value={newCommunityDesc}
              onChange={e => setNewCommunityDesc(e.target.value)}
              placeholder="Descripción"
              className="w-full p-2 border rounded-lg mb-4 bg-gray-100 dark:bg-gray-700"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setIsCreateCommunityOpen(false)}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-700 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateCommunity}
                className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition"
              >
                Crear
              </button>
            </div>
          </motion.div>
        </div>
      )}

      
      </motion.div>
    </div>

    

      {/* Modal de Añadir Contacto */}
      {isAddContactOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 p-6 rounded-lg shadow-lg w-80"
          >
            <h2 className="text-lg font-bold mb-4">Añadir Contacto</h2>
            <input
              type="text"
              placeholder="Dirección blockchain o nombre de usuario"
              className="w-full p-2 border rounded-lg bg-gray-100 dark:bg-gray-700 mb-4"
              onChange={e => setNewContactId(e.target.value)}
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setIsAddContactOpen(false)}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600 transition"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleSendFriendRequest(newContactId)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
              >
                Enviar
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal de Crear Chat */}
      {isCreateChatOpen && (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 p-6 rounded-lg shadow-lg w-96"
      >
        <h2 className="text-lg font-bold mb-4">Crear Chat</h2>
        <div className="mb-4">
          <label className="block text-sm mb-1">Nombre del Chat</label>
          <input
            type="text"
            value={chatName}
            onChange={e => setChatName(e.target.value)}
            placeholder="Ingrese el nombre del chat"
            className="w-full p-2 border rounded-lg bg-gray-100 dark:bg-gray-700"
          />
        </div>

        {/* Etiquetas de miembros seleccionados */}
        <div className="mb-4 flex flex-wrap gap-2">
          {selectedMembersForChat.map(streamId => {
            const contact = availableContacts.find(c => c.stream_id === streamId);
            return (
              <div
                key={streamId}
                className="flex items-center bg-blue-100 dark:bg-blue-700 text-gray-800 dark:text-gray-200 px-2 py-1 rounded-full"
              >
                <span className="mr-1 text-sm">
                  {contact?.username || contact?.controller}
                </span>
                <FiX
                  className="cursor-pointer"
                  onClick={() => handleSelectMember(streamId, false)}
                />
              </div>
            );
          })}
        </div>

        {/* Buscador de contactos */}
        <div className="mb-4 relative">
          <input
            type="text"
            value={contactSearchTerm}
            onChange={e => setContactSearchTerm(e.target.value)}
            placeholder="Añadir miembros..."
            className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-700"
          />
          {contactSearchTerm && filteredContacts.length > 0 && (
            <ul className="absolute left-0 right-0 mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md max-h-40 overflow-auto z-50">
              {filteredContacts.map(c => (
                <li
                  key={c.stream_id}
                  onClick={() => {
                    handleSelectMember(c.stream_id, true);
                    setContactSearchTerm("");
                  }}
                  className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer"
                >
                  {c.username || c.controller}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex justify-end space-x-2">
          <button
            onClick={() => setIsCreateChatOpen(false)}
            className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600 transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleCreateChat}
            className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition"
          >
            Crear
          </button>
        </div>
      </motion.div>
    </div>
  )}
  </>
      )}
       {isExploreOpen && (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-20 z-50">
      <div className="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 p-6 rounded-lg shadow-lg w-96 max-h-[80vh] overflow-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">Explorar comunidades</h3>
          <button onClick={() => setIsExploreOpen(false)}>
            <FiX />
          </button>
        </div>
        <input
          type="text"
          value={exploreTerm}
          onChange={e => setExploreTerm(e.target.value)}
          placeholder="Buscar..."
          className="w-full mb-4 p-2 border rounded-lg bg-gray-100 dark:bg-gray-700"
        />
        <div className="grid grid-cols-2 gap-3">
          {exploreResults.map(c => (
            <div
              key={c.stream_id}
              onClick={() => {
                setIsExploreOpen(false);
                router.push(`/community/${c.stream_id}`);
              }}
              className="cursor-pointer p-3 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 text-center"
            >
              {c.name}
            </div>
          ))}
          {exploreTerm && exploreResults.length === 0 && (
            <p className="col-span-2 text-center text-sm text-gray-500">No hay resultados</p>
          )}
        </div>
      </div>
    </div>
  )}
    </div>
  );
  
};

export default SideBar;