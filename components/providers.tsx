"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { UserProfile } from "@/handoffs/user-profile";

const UserContext = createContext<{
  user: UserProfile | null;
  setUser: (u: UserProfile) => void;
  users: UserProfile[];
}>({
  user: null,
  setUser: () => {},
  users: [],
});

export function useDevUser() {
  return useContext(UserContext);
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [user, setUser] = useState<UserProfile | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);

  useEffect(() => {
    // Load initial session
    fetch("/api/users/search?q=")
      .then((r) => r.json())
      .then((allUsers: UserProfile[]) => {
        setUsers(allUsers);
        const storedUser = localStorage.getItem("chitchain_dev_user");
        if (storedUser) {
          const found = allUsers.find((u) => u.username === storedUser);
          if (found) {
            setUser(found);
            return;
          }
        }
        if (allUsers.length > 0) {
          setUser(allUsers[0]);
        }
      })
      .catch((err) => console.error("Error loading users:", err));
  }, []);

  const handleSetUser = (u: UserProfile) => {
    setUser(u);
    localStorage.setItem("chitchain_dev_user", u.username);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <UserContext.Provider value={{ user, setUser: handleSetUser, users }}>
        {children}
      </UserContext.Provider>
    </QueryClientProvider>
  );
}
