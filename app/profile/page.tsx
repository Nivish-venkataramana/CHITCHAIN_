"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDevUser } from "@/components/providers";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { createPublicClient, http, formatUnits, erc20Abi } from "viem";
import { baseSepolia } from "viem/chains";
import {
  User,
  Copy,
  Check,
  Coins,
  LogOut,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";

import { fetchLiveBalanceUSDC } from "@/lib/client-balance";

export default function ProfilePage() {
  const router = useRouter();
  const { user, setUser } = useDevUser();
  const { user: privyUser, authenticated, logout } = usePrivy();
  const { wallets } = useWallets();

  const embeddedWallet = wallets.find((w) => w.walletClientType === "privy") || wallets[0];
  const activeWalletAddress = (
    user?.walletAddress ||
    (typeof window !== "undefined" ? localStorage.getItem("chitchain_smart_wallet_address") : "") ||
    (privyUser as any)?.smartWallet?.address ||
    embeddedWallet?.address ||
    privyUser?.wallet?.address ||
    ""
  ).toLowerCase();

  const userEmail = privyUser?.email?.address || "";
  const dynamicUsername = userEmail
    ? userEmail.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "").toLowerCase()
    : user?.username ||
      (activeWalletAddress ? `user_${activeWalletAddress.slice(2, 6).toLowerCase()}` : "member");

  const dynamicDisplayName = userEmail
    ? userEmail.split("@")[0]
    : user?.displayName || dynamicUsername;

  const [mounted, setMounted] = useState(false);
  const [balance, setBalance] = useState<string | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [copied, setCopied] = useState(false);
  const [faucetLoading, setFaucetLoading] = useState(false);
  const [faucetMessage, setFaucetMessage] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchLiveBalance = async () => {
    if (!activeWalletAddress || !/^0x[a-f0-9]{40}$/i.test(activeWalletAddress)) {
      setBalance("0.00");
      setLoadingBalance(false);
      return;
    }
    setLoadingBalance(true);
    const val = await fetchLiveBalanceUSDC(activeWalletAddress, dynamicUsername);
    setBalance(
      val.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
    setLoadingBalance(false);
  };

  useEffect(() => {
    fetchLiveBalance();
  }, [activeWalletAddress, dynamicUsername]);

  const handleCopy = () => {
    if (!activeWalletAddress) return;
    navigator.clipboard.writeText(activeWalletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClaimFaucet = async () => {
    if (!activeWalletAddress) return;
    setFaucetLoading(true);
    setFaucetMessage(null);
    try {
      const res = await fetch("/api/account/faucet", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-dev-user": dynamicUsername,
        },
        body: JSON.stringify({
          walletAddress: activeWalletAddress,
          amountUSDC: "1000",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setFaucetMessage("1,000 USDC credited.");
        fetchLiveBalance();
      } else {
        setFaucetMessage(data.error || "Faucet failed.");
      }
    } catch (err: any) {
      setFaucetMessage(err.message || "Faucet failed.");
    } finally {
      setFaucetLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (logout) await logout();
    } catch (err) {
      console.warn("Logout notice:", err);
    }
    setUser(null);
    router.push("/login");
  };

  if (!mounted) {
    return (
      <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 space-y-6 text-neutral-100 flex flex-col justify-between min-h-[calc(100vh-6rem)]">
        <div className="flex-1 flex flex-col justify-center">
          <div className="rounded-3xl border border-white/10 bg-transparent p-6 sm:p-7 space-y-5 shadow-2xl animate-pulse">
            <div className="grid sm:grid-cols-2 gap-6 pb-5 border-b border-white/10">
              <div className="space-y-2">
                <div className="h-3 w-20 bg-white/10 rounded" />
                <div className="h-6 w-36 bg-white/10 rounded" />
              </div>
              <div className="space-y-2">
                <div className="h-3 w-20 bg-white/10 rounded" />
                <div className="h-6 w-36 bg-white/10 rounded" />
              </div>
            </div>
            <div className="space-y-2 pb-5 border-b border-white/10">
              <div className="h-3 w-32 bg-white/10 rounded" />
              <div className="h-10 w-full bg-white/5 rounded-xl border border-white/10" />
            </div>
            <div className="grid sm:grid-cols-2 gap-6 items-center pb-5 border-b border-white/10">
              <div className="space-y-2">
                <div className="h-3 w-28 bg-white/10 rounded" />
                <div className="h-8 w-32 bg-white/10 rounded" />
              </div>
              <div className="h-10 w-36 bg-white/5 rounded-xl border border-white/10 sm:ml-auto" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 space-y-6 text-neutral-100 flex flex-col justify-between min-h-[calc(100vh-6rem)] py-2">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col justify-center">
        {/* Symmetrical Profile Details Card */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Row 1: Username & Name */}
          <div className="grid sm:grid-cols-2 gap-6 pb-2">
            <div className="space-y-1">
              <span className="text-xs font-mono text-neutral-400 uppercase tracking-wider font-semibold">
                Display Name
              </span>
              <p className="text-lg sm:text-xl font-bold text-white tracking-tight">{dynamicDisplayName}</p>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-mono text-neutral-400 uppercase tracking-wider font-semibold">
                Username
              </span>
              <p className="text-lg sm:text-xl font-mono font-bold text-white tracking-tight">@{dynamicUsername}</p>
            </div>
          </div>

          {/* Row 2: Smart Wallet Address */}
          <div className="space-y-2 pb-2">
            <span className="text-xs font-mono text-neutral-400 uppercase tracking-wider font-semibold">
              Smart Wallet Address
            </span>
            <div className="flex items-center justify-between gap-3 p-4 font-mono text-sm">
              <span className="text-neutral-200 truncate">{activeWalletAddress || "No wallet connected"}</span>
              <button
                type="button"
                onClick={handleCopy}
                disabled={!activeWalletAddress}
                className="p-1.5 text-neutral-400 hover:text-white transition-colors cursor-pointer shrink-0"
                title="Copy Address"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Row 3: Live Balance & Gasless Faucet */}
          <div className="grid sm:grid-cols-2 gap-6 items-center pb-2">
            <div className="space-y-1">
              <span className="text-xs font-mono text-neutral-400 uppercase tracking-wider font-semibold">
                Onchain USDC Balance
              </span>
              <p className="text-2xl sm:text-3xl font-extrabold font-mono text-white tracking-tight">
                {loadingBalance ? "..." : balance} <span className="text-xs text-neutral-400 font-normal">USDC</span>
              </p>
            </div>

            <div className="flex flex-col sm:items-end gap-1.5">
              <a
                href={
                  activeWalletAddress
                    ? `https://sepolia.basescan.org/address/${activeWalletAddress}`
                    : "https://sepolia.basescan.org"
                }
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-3 rounded-xl bg-white text-black hover:bg-neutral-200 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
                title="View on Base Sepolia Explorer"
              >
                <ExternalLink className="h-4 w-4" />
                <span>See Transactions</span>
              </a>
            </div>
          </div>

          {/* Row 4: Disconnect Button */}
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleLogout}
              className="px-5 py-2.5 rounded-xl text-neutral-400 hover:text-red-400 transition-colors text-xs sm:text-sm font-semibold flex items-center gap-2 cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
