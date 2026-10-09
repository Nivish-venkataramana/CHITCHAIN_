"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PrivyProvider } from "@privy-io/react-auth";
import { UserProfile } from "@/handoffs/user-profile";

const UserContext = createContext<{
  user: UserProfile | null;
  setUser: (u: UserProfile | null) => void;
  users: UserProfile[];
}>({
  user: null,
  setUser: () => {},
  users: [],
});

export function useDevUser() {
  return useContext(UserContext);
}

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID || "cmv07umju004s0fjtwjr9l71v";

import { usePrivy, useWallets } from "@privy-io/react-auth";

function PrivyUserSync({ onSync }: { onSync?: () => void }) {
  const { user: privyUser, authenticated } = usePrivy();
  const { wallets } = useWallets();

  useEffect(() => {
    if (!authenticated || !privyUser) return;

    const embeddedWallet = wallets.find((w) => w.walletClientType === "privy") || wallets[0];
    const walletAddress = (
      embeddedWallet?.address ||
      privyUser?.wallet?.address ||
      ""
    ).toLowerCase();

    const email = privyUser?.email?.address || "";
    const username = email
      ? email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "").toLowerCase()
      : walletAddress
      ? `user_${walletAddress.slice(2, 6).toLowerCase()}`
      : "";

    const displayName = email ? email.split("@")[0] : username;

    if (username && walletAddress && /^0x[a-f0-9]{40}$/i.test(walletAddress)) {
      fetch("/api/account/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          walletAddress,
          displayName,
        }),
      })
        .then(() => onSync?.())
        .catch((err) => console.warn("Privy user sync notice:", err));
    }
  }, [authenticated, privyUser, wallets]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [user, setUser] = useState<UserProfile | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);

  const refreshUsers = () => {
    fetch("/api/users/search?q=")
      .then((r) => r.json())
      .then((allUsers: UserProfile[]) => {
        if (Array.isArray(allUsers)) {
          setUsers(allUsers);
        }
      })
      .catch((err) => console.error("Error loading users:", err));
  };

  useEffect(() => {
    refreshUsers();
  }, []);

  const handleSetUser = (u: UserProfile | null) => {
    setUser(u);
    if (u) {
      localStorage.setItem("chitchain_dev_user", u.username);
    } else {
      localStorage.removeItem("chitchain_dev_user");
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <PrivyProvider
        appId={PRIVY_APP_ID}
        config={{
          appearance: {
            theme: "dark",
            accentColor: "#10b981",
          },
          embeddedWallets: {
            createOnLogin: "users-without-wallets",
          },
        }}
      >
        <PrivyUserSync onSync={refreshUsers} />
        <UserContext.Provider value={{ user, setUser: handleSetUser, users }}>
          {children}
        </UserContext.Provider>
      </PrivyProvider>
    </QueryClientProvider>
  );
}
