"use client";

import Link from "next/link";
import { useDevUser } from "@/components/providers";
import { KeyRound, ShieldCheck, Wallet } from "lucide-react";

export default function AccountLoginPage() {
  const { user } = useDevUser();

  return (
    <div className="max-w-md mx-auto py-12 space-y-6 text-center">
      <div className="h-16 w-16 bg-blue-100 text-blue-600 rounded-3xl flex items-center justify-center mx-auto">
        <KeyRound className="h-8 w-8" />
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-slate-900">Wallet Login & Smart Account</h1>
        <p className="text-xs text-slate-500">
          [Pruthvik Slice: Privy Auth + Biconomy Smart Account on Base Sepolia]
        </p>
      </div>

      <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-4 text-left text-xs">
        <div className="p-3 bg-slate-50 rounded-xl border space-y-1">
          <p className="font-semibold text-slate-700">Currently Active Fixture Account:</p>
          <p className="font-bold text-blue-600 text-sm">{user?.displayName}</p>
          <p className="font-mono text-slate-500">@{user?.username}</p>
          <p className="font-mono text-[11px] text-slate-400 break-all">{user?.walletAddress}</p>
        </div>

        <div className="space-y-2 pt-2">
          <Link
            href="/account/wallet"
            className="block w-full text-center py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors"
          >
            Go to Smart Account Wallet
          </Link>
          <Link
            href="/account/create"
            className="block w-full text-center py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold transition-colors"
          >
            Create New Account Profile
          </Link>
        </div>
      </div>
    </div>
  );
}
