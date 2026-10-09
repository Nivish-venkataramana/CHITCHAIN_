"use client";

import { useState } from "react";
import Link from "next/link";
import { useAccount } from "@/hooks/useAccount";
import { useDevUser } from "@/components/providers";
import { defaultAddMoneyProvider } from "@/features/account/addMoney";
import { Wallet, Coins, ArrowLeft, CheckCircle, AlertCircle, Shield } from "lucide-react";

export default function AccountWalletPage() {
  const {
    authenticated,
    displayAddress,
    walletAddress,
    profile,
    balance,
    refetchBalance,
    embeddedWallet,
    chainError,
  } = useAccount();

  const { user: devUser } = useDevUser();
  const [minting, setMinting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const activeUser = profile || (authenticated ? {
    displayName: "Authenticated Member",
    username: "pending_profile",
    walletAddress: (walletAddress || "0x...") as `0x${string}`,
  } : devUser);

  const currentAddress = displayAddress || activeUser?.walletAddress;

  const handleMint = async () => {
    setMinting(true);
    setMessage(null);
    setErrorMsg(null);

    try {
      if (embeddedWallet) {
        // Gasless paymaster mint via Biconomy / AddMoneyProvider
        await defaultAddMoneyProvider.mintMockUSDC(embeddedWallet, 1000_000000n);
        await refetchBalance();
        setMessage("Successfully minted 1,000 MockUSDC via gasless paymaster faucet.");
      } else {
        // Fallback for dev fixture mode
        const target = activeUser?.username || "asharao01";
        const res = await fetch("/api/account/faucet", {
          method: "POST",
          headers: { "x-dev-user": target },
        });
        const data = await res.json();
        if (data.balanceUSDC) {
          await refetchBalance();
          setMessage("Successfully minted 1,000 MockUSDC via gasless paymaster faucet.");
        }
      }
    } catch (err: any) {
      console.error("Mint error:", err);
      setErrorMsg(err.message || "Failed to mint from faucet.");
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
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl">
              <Wallet className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Smart Vault Custody</h1>
              <p className="text-xs text-neutral-400 mt-0.5">
                ERC4337 Account: <span className="text-white font-semibold">{activeUser?.displayName}</span> (@{activeUser?.username})
              </p>
            </div>
          </div>
        </div>

        {chainError && (
          <div className="p-4 rounded-2xl bg-amber-950/60 border border-amber-800/50 text-amber-300 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
            <span>{chainError}</span>
          </div>
        )}

        {/* High End Luxury Bharat Gold Card Visual */}
        <div className="relative rounded-3xl bg-gradient-to-br from-neutral-900 via-neutral-950 to-amber-950/30 p-8 border border-amber-500/20 shadow-2xl space-y-6 overflow-hidden">
          <div className="flex items-center justify-between text-neutral-400">
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest font-bold text-amber-400">
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
              <span className="text-lg font-normal text-amber-400">USDC</span>
            </div>
          </div>

          <div className="pt-4 border-t border-neutral-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-neutral-500 block">Onchain Identity</span>
              <span className="font-mono text-neutral-300 break-all text-[11px]">{currentAddress}</span>
            </div>
          </div>
        </div>

        {/* Faucet Mint Action Button */}
        <div className="space-y-3">
          <button
            onClick={handleMint}
            disabled={minting}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 shadow-xl shadow-amber-500/20 cursor-pointer disabled:opacity-50"
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

        {errorMsg && (
          <div className="p-4 rounded-2xl bg-red-950/60 border border-red-800/50 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>
    </div>
  );
}
