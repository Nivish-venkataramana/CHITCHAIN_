"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useDevUser } from "@/components/providers";
import { Wallet, Coins, ArrowLeft, CheckCircle, AlertCircle, Sparkles, Shield, ArrowUpRight } from "lucide-react";

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
        if (data.balanceUSDC) {
          setBalance(data.balanceUSDC);
        }
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
        setMessage("Successfully minted 1,000 MockUSDC via gasless paymaster faucet.");
      }
    } catch (err: any) {
      setMessage("Failed to mint from faucet.");
    } finally {
      setMinting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-10 px-6 space-y-8 text-neutral-100">
      <Link
        href="/home"
        className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Return to Dashboard</span>
      </Link>

      <div className="rounded-3xl border border-neutral-900 bg-neutral-950 p-8 shadow-2xl space-y-8 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-red-600/10 border border-red-600/20 text-red-400 rounded-2xl">
              <Wallet className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Smart Vault Custody</h1>
              <p className="text-xs text-neutral-400 mt-0.5">
                ERC4337 Account: <span className="text-white font-semibold">{user?.displayName}</span> (@{user?.username})
              </p>
            </div>
          </div>
        </div>

        {/* High End Luxury Metal Card Visual inspired by Xapo Bank */}
        <div className="relative rounded-3xl bg-gradient-to-br from-neutral-900 via-neutral-950 to-red-950/40 p-8 border border-neutral-800 shadow-2xl space-y-6 overflow-hidden">
          <div className="flex items-center justify-between text-neutral-400">
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest font-bold text-red-400">
              <Shield className="w-4 h-4" />
              <span>ChitChain Private Member</span>
            </div>
            <span className="text-xs font-mono text-neutral-500">Base Sepolia</span>
          </div>

          <div className="space-y-1 pt-4">
            <span className="text-xs uppercase tracking-widest text-neutral-400 block font-semibold">
              Available Stablecoin Balance
            </span>
            <div className="text-4xl sm:text-5xl font-extrabold text-white font-mono tracking-tight">
              {Number(balance).toLocaleString()}{" "}
              <span className="text-lg font-normal text-neutral-400">USDC</span>
            </div>
          </div>

          <div className="pt-4 border-t border-neutral-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-neutral-500 block">Onchain Identity</span>
              <span className="font-mono text-neutral-300 break-all text-[11px]">{user?.walletAddress}</span>
            </div>
          </div>
        </div>

        {/* Faucet Mint Action Button */}
        <div className="space-y-3">
          <button
            onClick={handleMint}
            disabled={minting}
            className="w-full py-4 rounded-2xl bg-white hover:bg-neutral-200 text-black font-bold text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 shadow-xl shadow-white/5 cursor-pointer"
          >
            <Coins className="h-4 w-4" />
            <span>{minting ? "Minting Gasless Test USDC..." : "Deposit 1,000 Test USDC"}</span>
          </button>
        </div>

        {message && (
          <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-800/50 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>{message}</span>
          </div>
        )}
      </div>
    </div>
  );
}
