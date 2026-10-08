"use client";

import { useState } from "react";
import Link from "next/link";
import { useDevUser } from "@/components/providers";
import { Wallet, Coins, Plus, CheckCircle, ArrowLeft } from "lucide-react";

export default function AccountWalletPage() {
  const { user } = useDevUser();
  const [balance, setBalance] = useState(5000);
  const [minting, setMinting] = useState(false);

  const handleMint = () => {
    setMinting(true);
    setTimeout(() => {
      setBalance((b) => b + 1000);
      setMinting(false);
    }, 600);
  };

  return (
    <div className="max-w-xl mx-auto py-6 space-y-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to home
      </Link>

      <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
            <Wallet className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Smart Account Wallet</h1>
            <p className="text-xs text-slate-500">[Pruthvik Slice: Gasless via Base Sepolia Paymaster]</p>
          </div>
        </div>

        {/* Address Card */}
        <div className="p-4 bg-slate-50 rounded-xl border space-y-1 text-xs">
          <span className="text-slate-500 font-semibold block">Public Key (Smart Account Address):</span>
          <p className="font-mono font-bold text-slate-800 break-all">{user?.walletAddress}</p>
        </div>

        {/* Balance Card */}
        <div className="p-6 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl space-y-4 shadow-md">
          <span className="text-xs font-medium text-blue-100 uppercase tracking-wider block">
            MockUSDC Balance (6 decimals)
          </span>
          <div className="text-3xl font-extrabold flex items-baseline gap-2">
            <span>{balance.toLocaleString()}</span>
            <span className="text-sm font-semibold text-blue-200">USDC</span>
          </div>

          <button
            onClick={handleMint}
            disabled={minting}
            className="w-full py-2.5 rounded-xl bg-white text-blue-700 font-bold text-xs hover:bg-blue-50 transition-colors flex items-center justify-center gap-1.5 shadow"
          >
            <Coins className="h-4 w-4" />
            {minting ? "Minting Gasless Test USDC..." : "Faucet: Add 1,000 MockUSDC"}
          </button>
        </div>
      </div>
    </div>
  );
}
