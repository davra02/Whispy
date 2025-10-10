import React, { useState, useRef, useEffect } from "react";
import ThemeToggle from "./ThemeToggle";
import { FiUser } from "react-icons/fi";
import { useRouter } from "next/navigation";
import { searchUsersByUsername } from "../ceramic/userService";

const Header: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [userName, setUserName] = useState("");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);

  // cerrar menú
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // leer usuario e imagen
  useEffect(() => {
    const stored = localStorage.getItem("orbis:user");
    if (stored) {
      const parsed = JSON.parse(stored);
      setUserName(parsed.username || "");
      // si existe parsed.image o parsed.profilePicture
      setProfileImage(parsed.image || parsed.profilePicture || null);
    }
  }, []);
  // búsqueda en vivo con debounce
  useEffect(() => {
    const handler = setTimeout(async () => {
      if (!searchTerm.trim()) {
        setSearchResults([]);
        return;
      }
      try {
        const users = await searchUsersByUsername(searchTerm.trim());
        setSearchResults(users);
      } catch {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  return (
    <header className="bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 b-2 shadow-md flex items-center relative">
      <div className="flex items-center mr-20">
        <img src="Whispy.png" alt="Logo" className="m-3 h-10" />
        <h1 className="text-xl font-bold ml-2">Whispy</h1>
      </div>

      {/* Buscador en medio */}
      <div className="flex-1 mx-4 relative ml-10">
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Buscar usuario..."
          className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {searchResults.length > 0 && (
          <ul className="absolute left-0 right-0 mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md max-h-60 overflow-auto z-50">
            {searchResults.map(user => (
              <li
                key={user.stream_id}
                onClick={() => {
                  setSearchTerm("");
                  setSearchResults([]);
                  router.push(`/profile/${encodeURIComponent(user.username)}`);
                }}
                className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer"
              >
                {user.username} {user.controller}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* avatar y menú */}
    <div className="flex items-center space-x-4 mr-4">
        <div className="relative" ref={menuRef}>
          {profileImage ? (
            <img
              src={profileImage}
              alt="Avatar"
              className="h-8 w-8 rounded-full cursor-pointer object-cover"
              onClick={() => setMenuOpen(o => !o)}
            />
          ) : (
            <FiUser
              className="h-8 w-8 cursor-pointer"
              onClick={() => setMenuOpen(o => !o)}
            />
          )}
          {menuOpen && (
            <div className="origin-top-right absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 rounded-md shadow-lg z-50">
              <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 font-bold">
                {userName || "Usuario"}
              </div>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  router.push("/profile");
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              >
                Mi Perfil
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  router.push("/settings");
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              >
                Ajustes
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem("orbis:session");
                  localStorage.removeItem("orbis:user");
                  setMenuOpen(false);
                  router.push("/login");
                }}
                className="w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              >
                Cerrar Sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;