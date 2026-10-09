"use client";

import React, { useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useDevUser } from "@/components/providers";
import { Wallet, LogOut, CheckCircle2, ShieldCheck, ArrowRight } from "lucide-react";
import Link from "next/link";

export function WalletConnect() {
  const { ready, authenticated, user: privyUser, logout } = usePrivy();
  const { wallets } = useWallets();
  const { user: devUser, setUser } = useDevUser();
  const [connecting, setConnecting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!ready || !authenticated) return null;

  const handleConnectSmartAccount = async () => {
    setConnecting(true);
    setStatusMessage(null);

    // 1. Find the specific embedded wallet Privy created or first connected wallet
    const privyWallet = wallets.find((w) => w.walletClientType === "privy") || wallets[0];

    if (!privyWallet) {
      console.error("No Privy embedded wallet found.");
      setStatusMessage("No Privy embedded wallet found.");
      setConnecting(false);
      return;
    }

    try {
      // 2. Extract Ethereum provider for Biconomy Nexus SDK / smart account signing
      const provider = await privyWallet.getEthereumProvider();
      console.log("Successfully extracted provider:", provider);

      const address = privyWallet.address;
      setStatusMessage(`Smart Account active: ${address.slice(0, 6)}...${address.slice(-4)}`);

      // 3. Sync or create user profile on backend
      const checkRes = await fetch(`/api/users/by-wallet/${address.toLowerCase()}`);
      if (checkRes.ok) {
        const existing = await checkRes.json();
        if (existing?.username) {
          setUser(existing);
          return;
        }
      }

      // Auto-register
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
      }
    } catch (error) {
      console.error("Failed to get provider:", error);
      setStatusMessage("Failed to extract wallet provider.");
    } finally {
      setConnecting(false);
    }
  };

  const displayName =
    privyUser?.email?.address ||
    (privyUser?.google as any)?.name ||
    devUser?.username ||
    "User Authenticated";

  const walletAddr =
    privyUser?.wallet?.address ||
    wallets?.[0]?.address ||
    devUser?.walletAddress;

  return (
    <div className="w-full max-w-sm rounded-3xl glass-panel-glow p-8 space-y-6 shadow-2xl">
      {/* Header */}
      <div className="space-y-1 text-center sm:text-left">
        <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider block">
          Connected Session
        </span>
        <h3 className="text-xl font-bold text-white tracking-tight">Welcome back</h3>
        <p className="text-xs text-neutral-400 font-mono break-all">{displayName}</p>
      </div>

      {/* Wallet Address Chip if available */}
      {walletAddr && (
        <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
          <span className="text-[10px] text-neutral-500 uppercase tracking-wider block font-medium">
            Smart Account Address
          </span>
          <p className="font-mono text-xs text-neutral-300 break-all">{walletAddr}</p>
        </div>
      )}

      {statusMessage && (
        <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-3 pt-1">
        <button
          onClick={handleConnectSmartAccount}
          disabled={connecting}
          className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs tracking-wider uppercase shadow-[0_0_25px_rgba(16,185,129,0.35)] transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <ShieldCheck className="h-4 w-4" />
          <span>{connecting ? "Initializing..." : "Initialize Savings Account"}</span>
        </button>

        <button
          onClick={() => {
            setUser(null);
            logout();
          }}
          className="w-full py-3 rounded-xl bg-white/[0.03] hover:bg-red-950/20 border border-white/10 hover:border-red-500/30 text-neutral-400 hover:text-red-300 font-semibold text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
          <span>Log out</span>
        </button>
      </div>
    </div>
  );
}
