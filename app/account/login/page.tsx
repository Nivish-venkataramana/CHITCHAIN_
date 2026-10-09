"use client";

import Link from "next/link";
import { useDevUser } from "@/components/providers";
import { KeyRound } from "lucide-react";

export default function AccountLoginPage() {
  const { user } = useDevUser();

  return (
    <div className="max-w-md mx-auto py-16 space-y-8 text-center">
      <div className="h-16 w-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-3xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-950/40">
        <KeyRound className="h-8 w-8" />
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-white tracking-tight">Smart Account Wallet</h1>
        <p className="text-xs text-neutral-400">
          Privy session authentication and Biconomy smart accounts on Base Sepolia.
        </p>
      </div>

      <div className="glass-panel p-6 space-y-5 text-left text-xs">
        <div className="p-4 bg-neutral-900/60 rounded-xl border border-white/5 space-y-2">
          <p className="text-[11px] font-medium text-neutral-400">Active Profile</p>
          <p className="font-bold text-emerald-400 text-sm">{user?.displayName}</p>
          <p className="font-mono text-neutral-400">@{user?.username}</p>
          <p className="font-mono text-[11px] text-neutral-500 break-all">{user?.walletAddress}</p>
        </div>

        <div className="space-y-3 pt-2">
          <Link
            href="/account/wallet"
            className="block w-full text-center py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-all shadow-lg shadow-emerald-900/30"
          >
            Open Wallet
          </Link>
          <Link
            href="/account/create"
            className="block w-full text-center py-3 rounded-xl border border-white/10 hover:bg-white/5 text-neutral-300 font-semibold transition-colors"
          >
            Create New Profile
          </Link>
        </div>
      </div>
    </div>
  );
}
