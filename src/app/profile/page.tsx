"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FiUser } from "react-icons/fi";

interface Profile {
  stream_id: string;
  controller: string;
  bio: string;
  username: string;
  profilePicture?: string;
}

const ProfilePage = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem("orbis:user");
    if (!stored) {
      router.push("/login");
      return;
    }
    const data: Profile = JSON.parse(stored);
    setProfile(data);
  }, [router]);

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-md">
        <div className="flex flex-col items-center">
          <div className="w-32 h-32 bg-gray-200 dark:bg-gray-700 rounded-full mb-4 overflow-hidden flex items-center justify-center">
            {profile.profilePicture ? (
              <img
                src={profile.profilePicture}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              <FiUser className="w-16 h-16 text-gray-500 dark:text-gray-400" />
            )}
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
          <button
            onClick={() => router.push("/")}
            className="mt-6 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
          >
            Volver
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;