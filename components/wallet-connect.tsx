"use client";

import React, { useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useDevUser } from "@/components/providers";

export default function WalletConnect({
  onConnected,
}: {
  onConnected?: (provider: any, address: string) => void;
}) {
  const router = useRouter();
  const { setUser } = useDevUser();
  const [initializing, setInitializing] = useState(false);
  const [smartAccountAddress, setSmartAccountAddress] = useState<string | null>(null);

  // 1. Get the login function and auth state
  const { ready, authenticated, login } = usePrivy();

  // 2. Get the array of linked wallets
  const { wallets } = useWallets();

  const connectToSmartAccount = async () => {
    setInitializing(true);
    try {
      // 3. Find the specific embedded wallet Privy created
      const privyWallet = wallets.find((w) => w.walletClientType === "privy") || wallets[0];

      if (!privyWallet) return;

      // 4. Extract the Ethereum provider to use for signing and transactions
      const provider = await privyWallet.getEthereumProvider();

      // You now pass this `provider` into your Biconomy Nexus SDK 
      // to control the auto-pay logic on Base.
      const address = privyWallet.address;
      setSmartAccountAddress(address);

      if (onConnected) {
        onConnected(provider, address);
      }

      // Check / sync user profile with backend
      const checkRes = await fetch(`/api/users/by-wallet/${address.toLowerCase()}`);
      if (checkRes.ok) {
        const existingUser = await checkRes.json();
        if (existingUser?.username) {
          setUser(existingUser);
          router.push("/");
          return;
        }
      }

      // Auto-register profile if new
      const defaultUser = `user_${address.slice(2, 6).toLowerCase()}`;
      const createRes = await fetch("/api/account/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: defaultUser,
          walletAddress: address,
          displayName: defaultUser,
        }),
      });

      if (createRes.ok) {
        const newUser = await createRes.json();
        setUser(newUser);
        router.push("/");
      }
    } catch (err) {
      console.error("Smart account initialization error:", err);
    } finally {
      setInitializing(false);
    }
  };

  if (!ready) return <p className="text-xs text-neutral-500 text-center py-4">Loading...</p>;

  if (!authenticated) {
    return (
      <button
        onClick={login}
        className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs tracking-wider uppercase shadow-[0_0_25px_rgba(16,185,129,0.35)] transition-all flex items-center justify-center gap-2 cursor-pointer"
      >
        Log in to Connect
      </button>
    );
  }

  return (
    <button
      onClick={connectToSmartAccount}
      disabled={initializing}
      className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs tracking-wider uppercase shadow-[0_0_25px_rgba(16,185,129,0.35)] transition-all flex items-center justify-center gap-2 cursor-pointer"
    >
      {initializing ? "Initializing..." : "Initialize Savings Account"}
    </button>
  );
}

export function useSmartAccountProvider() {
  const { ready, authenticated, login } = usePrivy();
  const { wallets } = useWallets();

  const getSmartAccountProvider = async () => {
    const privyWallet = wallets.find((w) => w.walletClientType === "privy") || wallets[0];
    if (!privyWallet) return null;
    const provider = await privyWallet.getEthereumProvider();
    return { provider, address: privyWallet.address, wallet: privyWallet };
  };

  return {
    ready,
    authenticated,
    login,
    wallets,
    getSmartAccountProvider,
  };
}
