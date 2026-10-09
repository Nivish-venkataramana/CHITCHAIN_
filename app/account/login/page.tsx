"use client";

import Link from "next/link";
import { useDevUser } from "@/components/providers";
import { KeyRound, Shield, Wallet, ArrowRight } from "lucide-react";

export default function AccountLoginPage() {
  const { user } = useDevUser();

  return (
    <div className="max-w-md mx-auto py-16 px-6 space-y-8 text-center text-neutral-100">
      <div className="h-16 w-16 bg-red-600/10 border border-red-600/20 text-red-400 rounded-3xl flex items-center justify-center mx-auto shadow-xl">
        <KeyRound className="h-8 w-8" />
      </div>

      <div className="space-y-2">
        <span className="text-xs uppercase tracking-widest font-bold text-red-500">
          Smart Account Access
        </span>
        <h1 className="text-3xl font-bold text-white tracking-tight">Custodial Authentication</h1>
        <p className="text-xs text-neutral-400">
          Privy Auth and Biconomy Smart Account on Base Sepolia
        </p>
      </div>

      <div className="rounded-3xl border border-neutral-900 bg-neutral-950 p-8 shadow-2xl space-y-6 text-left text-xs">
        <div className="p-4 bg-neutral-900/80 rounded-2xl border border-neutral-800 space-y-1.5">
          <p className="font-semibold text-neutral-400 uppercase tracking-wider text-[10px]">Active Member Session</p>
          <p className="font-bold text-white text-base">{user?.displayName}</p>
          <p className="font-mono text-neutral-400">@{user?.username}</p>
          <p className="font-mono text-[11px] text-neutral-500 break-all">{user?.walletAddress}</p>
        </div>

        <div className="space-y-3 pt-2">
          <Link
            href="/login"
            className="w-full text-center py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs uppercase tracking-wider transition-all block shadow-lg shadow-amber-500/20"
          >
            Sign In with Privy Wallet
          </Link>
          <Link
            href="/account/wallet"
            className="w-full text-center py-3.5 rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs uppercase tracking-wider transition-all block border border-neutral-800"
          >
            Access Smart Vault Wallet
          </Link>
          <Link
            href="/account/create"
            className="w-full text-center py-3.5 rounded-2xl border border-neutral-800 hover:bg-neutral-900 text-neutral-300 hover:text-white font-bold text-xs uppercase tracking-wider transition-all block"
          >
            Create New Account Profile
          </Link>
        </div>
      </div>
    </div>
  );
}
