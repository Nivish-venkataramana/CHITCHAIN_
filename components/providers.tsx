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
import { initDeterministicSmartAccount } from "@/lib/smart-account";

function PrivyUserSync({ onSync }: { onSync?: () => void }) {
  const { user: privyUser, authenticated } = usePrivy();
  const { wallets } = useWallets();
  const { setUser } = useDevUser();

  useEffect(() => {
    if (!authenticated || !privyUser) return;

    let isMounted = true;

    async function syncAccount() {
      try {
        const email = privyUser?.email?.address || "";
        const privyUserId = privyUser?.id;
        const username = email
          ? email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "").toLowerCase()
          : `user_${(privyUserId || "").slice(-6)}`;
        const displayName = email ? email.split("@")[0] : username;

        // 1. Immediately fetch existing user from database
        const syncRes = await fetch("/api/account/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            privyUserId,
            username,
            displayName,
          }),
        });

        if (syncRes.ok) {
          const dbUser = await syncRes.json();
          if (isMounted && dbUser) {
            setUser(dbUser);
            if (typeof window !== "undefined") {
              localStorage.setItem("chitchain_user_profile", JSON.stringify(dbUser));
              if (dbUser.walletAddress) {
                localStorage.setItem("chitchain_smart_wallet_address", dbUser.walletAddress);
              }
            }
          }
        }

        // 2. If wallets are available, initialize deterministic smart account
        if (wallets && wallets.length > 0) {
          const { address: scaAddress } = await initDeterministicSmartAccount({
            wallets,
            privyUser,
          });

          if (!isMounted || !scaAddress || !/^0x[a-f0-9]{40}$/i.test(scaAddress)) return;

          const updateRes = await fetch("/api/account/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              privyUserId,
              username,
              walletAddress: scaAddress,
              displayName,
            }),
          });

          if (updateRes.ok) {
            const syncedUser = await updateRes.json();
            if (isMounted && syncedUser) {
              setUser(syncedUser);
              if (typeof window !== "undefined") {
                localStorage.setItem("chitchain_smart_wallet_address", scaAddress);
                localStorage.setItem("chitchain_user_profile", JSON.stringify(syncedUser));
              }
            }
          }
        }

        onSync?.();
      } catch (err) {
        console.warn("Deterministic smart account sync notice:", err);
      }
    }

    syncAccount();

    return () => {
      isMounted = false;
    };
  }, [authenticated, privyUser, wallets]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [user, setUserState] = useState<UserProfile | null>(null);
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
    try {
      const cached = localStorage.getItem("chitchain_user_profile");
      if (cached) setUserState(JSON.parse(cached));
    } catch {}
    refreshUsers();
  }, []);

  const handleSetUser = (u: UserProfile | null) => {
    setUserState(u);
    if (u) {
      localStorage.setItem("chitchain_dev_user", u.username);
      localStorage.setItem("chitchain_user_profile", JSON.stringify(u));
      if (u.walletAddress) {
        localStorage.setItem("chitchain_smart_wallet_address", u.walletAddress);
      }
    } else {
      localStorage.removeItem("chitchain_dev_user");
      localStorage.removeItem("chitchain_user_profile");
      localStorage.removeItem("chitchain_smart_wallet_address");
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
