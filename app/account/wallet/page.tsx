"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useDevUser } from "@/components/providers";
import { Wallet, Coins, ArrowLeft, CheckCircle2 } from "lucide-react";

export default function AccountWalletPage() {
  const { user } = useDevUser();
  const [balance, setBalance] = useState<string>("0");
  const [minting, setMinting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchBalance = () => {
    if (!user) return;
    fetch("/api/account/faucet", {
      headers: { "x-dev-user": user.username },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.balanceUSDC) setBalance(data.balanceUSDC);
      })
      .catch((err) => console.error("Error loading balance:", err));
  };

  useEffect(() => {
    fetchBalance();
  }, [user]);

  const handleMint = async () => {
    if (!user) return;
    setMinting(true);
    setMessage(null);

    try {
      const res = await fetch("/api/account/faucet", {
        method: "POST",
        headers: { "x-dev-user": user.username },
      });
      const data = await res.json();
      if (data.balanceUSDC) {
        setBalance(data.balanceUSDC);
        setMessage("Minted 1,000 MockUSDC via gasless paymaster.");
      }
    } catch {
      setMessage("Failed to mint from faucet.");
    } finally {
      setMinting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-8 space-y-8">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-xs text-neutral-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to home
      </Link>

      <div className="rounded-3xl glass-panel-glow p-8 space-y-8">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-2xl">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Smart Account</h1>
            <p className="text-xs text-neutral-400 font-mono">
              @{user?.username}
            </p>
          </div>
        </div>

        {/* Address Card */}
        <div className="p-5 bg-white/[0.02] rounded-2xl border border-white/5 space-y-1.5 text-xs">
          <span className="text-neutral-500 font-medium block uppercase tracking-wider text-[10px]">
            Public Key (Smart Account Address)
          </span>
          <p className="font-mono text-neutral-300 break-all text-xs">{user?.walletAddress}</p>
        </div>

        {/* Balance Card */}
        <div className="p-8 bg-gradient-to-br from-neutral-900 to-black rounded-3xl border border-emerald-500/30 space-y-6 shadow-[0_0_30px_rgba(16,185,129,0.15)]">
          <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-widest block">
            MockUSDC Balance
          </span>
          <div className="text-4xl font-extrabold text-white flex items-baseline gap-2">
            <span>{Number(balance).toLocaleString()}</span>
            <span className="text-sm font-semibold text-neutral-400">USDC</span>
          </div>

          <button
            onClick={handleMint}
            disabled={minting}
            className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Coins className="h-4 w-4" />
            {minting ? "Minting..." : "Faucet: Mint 1,000 MockUSDC"}
          </button>
        </div>

        {message && (
          <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>{message}</span>
          </div>
        )}
      </div>
    </div>
  );
}
