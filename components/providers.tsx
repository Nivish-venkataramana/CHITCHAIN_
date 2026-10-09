"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PrivyProvider, usePrivy, useWallets } from "@privy-io/react-auth";
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

function PrivyUserSync({ setUser, onSync }: { setUser: (u: UserProfile | null) => void; onSync?: () => void }) {
  const { user: privyUser, authenticated, ready } = usePrivy();
  const { wallets } = useWallets();

  useEffect(() => {
    if (!authenticated || !privyUser) return;

    const embeddedWallet = wallets.find((w) => w.walletClientType === "privy") || wallets[0];
    const linkedWallet = privyUser?.linkedAccounts?.find(
      (a: any) => a.type === "wallet" || a.walletClientType === "privy"
    ) as any;

    const walletAddress = (
      embeddedWallet?.address ||
      privyUser?.wallet?.address ||
      linkedWallet?.address ||
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
        .then((res) => (res.ok ? res.json() : null))
        .then((syncedUser) => {
          if (syncedUser && syncedUser.walletAddress) {
            setUser(syncedUser);
          } else {
            setUser({
              username,
              walletAddress: walletAddress as `0x${string}`,
              displayName,
            });
          }
          onSync?.();
        })
        .catch((err) => {
          console.warn("Privy user sync notice:", err);
          setUser({
            username,
            walletAddress: walletAddress as `0x${string}`,
            displayName,
          });
        });
    }
  }, [authenticated, privyUser, wallets, ready]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            staleTime: 5000,
          },
        },
      })
  );
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
    // Restore user from localStorage immediately on refresh/mount
    try {
      const savedProfile = localStorage.getItem("chitchain_user_profile");
      if (savedProfile) {
        const parsed = JSON.parse(savedProfile);
        if (parsed && parsed.walletAddress) {
          setUser(parsed);
        }
      } else {
        const savedUsername = localStorage.getItem("chitchain_dev_user");
        if (savedUsername) {
          fetch(`/api/users/by-username/${savedUsername}`)
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
              if (data && data.walletAddress) {
                setUser(data);
              }
            })
            .catch(() => {});
        }
      }
    } catch (e) {
      console.warn("Error restoring cached user session:", e);
    }

    refreshUsers();
  }, []);

  const handleSetUser = (u: UserProfile | null) => {
    setUser(u);
    if (u) {
      localStorage.setItem("chitchain_dev_user", u.username);
      localStorage.setItem("chitchain_user_profile", JSON.stringify(u));
    } else {
      localStorage.removeItem("chitchain_dev_user");
      localStorage.removeItem("chitchain_user_profile");
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <PrivyProvider
        appId={PRIVY_APP_ID}
        config={{
          appearance: {
            theme: "dark",
            accentColor: "#f59e0b",
          },
          embeddedWallets: {
            ethereum: {
              createOnLogin: "users-without-wallets",
            },
          },
        }}
      >
        <PrivyUserSync setUser={handleSetUser} onSync={refreshUsers} />
        <UserContext.Provider value={{ user, setUser: handleSetUser, users }}>
          {children}
        </UserContext.Provider>
      </PrivyProvider>
    </QueryClientProvider>
  );
}
