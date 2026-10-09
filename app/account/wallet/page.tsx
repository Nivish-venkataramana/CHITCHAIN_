"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAccount } from "@/hooks/useAccount";
import { useDevUser } from "@/components/providers";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { defaultAddMoneyProvider } from "@/features/account/addMoney";
import { fromBaseUnits } from "@/lib/validation";
import {
  Wallet,
  Coins,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Shield,
  History,
  RefreshCw,
  FileText,
  ExternalLink,
  ArrowDownLeft,
  ArrowUpRight,
  Users,
} from "lucide-react";

interface TxItem {
  hash: string;
  from: string;
  to: string;
  value: string;
  tokenSymbol: string;
  timeStamp: number;
  isError: boolean;
  type: "IN" | "OUT" | "CONTRACT";
  blockNumber?: string;
  explorerUrl: string;
}

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
  const { user: privyUser } = usePrivy();
  const { wallets } = useWallets();

  const [minting, setMinting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [faucetBalance, setFaucetBalance] = useState<string | null>(null);

  // Real onchain transactions and circles state
  const [transactions, setTransactions] = useState<TxItem[]>([]);
  const [loadingTxs, setLoadingTxs] = useState(true);
  const [myCircles, setMyCircles] = useState<any[]>([]);
  const [loadingCircles, setLoadingCircles] = useState(true);

  const activeUser = profile || devUser || (privyUser ? {
    displayName: privyUser?.email?.address ? privyUser.email.address.split("@")[0] : "Authenticated Member",
    username: privyUser?.email?.address ? privyUser.email.address.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "").toLowerCase() : "member",
    walletAddress: (walletAddress || "0x1111111111111111111111111111111111111111") as `0x${string}`,
  } : null);

  const currentAddress = displayAddress || activeUser?.walletAddress;

  const fetchDynamicBalance = async () => {
    if (activeUser?.username) {
      try {
        const res = await fetch("/api/account/faucet", {
          headers: { "x-dev-user": activeUser.username },
        });
        const data = await res.json();
        if (data?.balanceUSDC !== undefined) {
          setFaucetBalance(data.balanceUSDC);
        }
      } catch {}
    }
  };

  const fetchTransactions = async () => {
    if (!currentAddress || !/^0x[a-f0-9]{40}$/i.test(currentAddress)) {
      setTransactions([]);
      setLoadingTxs(false);
      return;
    }

    setLoadingTxs(true);
    try {
      const res = await fetch(`/api/account/transactions?address=${currentAddress}`, {
        headers: { "x-dev-user": activeUser?.username || "member" },
      });
      const data = await res.json();
      if (Array.isArray(data?.transactions)) {
        setTransactions(data.transactions);
      } else {
        setTransactions([]);
      }
    } catch (err) {
      console.warn("Transactions query notice:", err);
      setTransactions([]);
    } finally {
      setLoadingTxs(false);
    }
  };

  const fetchCircles = async () => {
    if (!activeUser?.username) {
      setMyCircles([]);
      setLoadingCircles(false);
      return;
    }
    setLoadingCircles(true);
    try {
      const res = await fetch("/api/circles/mine", {
        headers: { "x-dev-user": activeUser.username },
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setMyCircles(data);
      } else {
        setMyCircles([]);
      }
    } catch {
      setMyCircles([]);
    } finally {
      setLoadingCircles(false);
    }
  };

  useEffect(() => {
    fetchDynamicBalance();
    fetchTransactions();
    fetchCircles();
  }, [currentAddress, activeUser?.username]);

  const handleMint = async () => {
    setMinting(true);
    setMessage(null);
    setErrorMsg(null);

    try {
      const target = activeUser?.username || "nivishv08";
      const res = await fetch("/api/account/faucet", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-dev-user": target },
        body: JSON.stringify({ amount: 1000 }),
      });
      const data = await res.json();
      if (data.balanceUSDC !== undefined) {
        setFaucetBalance(data.balanceUSDC);
        await refetchBalance();
        setMessage(`Successfully deposited 1,000 Test USDC. Total balance: ${Number(data.balanceUSDC).toLocaleString()} USDC.`);
      }
      if (embeddedWallet) {
        try {
          await defaultAddMoneyProvider.mintMockUSDC(embeddedWallet, 1000_000000n);
          await refetchBalance();
        } catch {}
      }
      fetchTransactions();
      window.dispatchEvent(new Event("balance_updated"));
    } catch (err: any) {
      console.error("Mint error:", err);
      setErrorMsg(err.message || "Failed to deposit from faucet.");
    } finally {
      setMinting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-10 px-6 space-y-8 text-neutral-100">
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
              {Number(faucetBalance !== null ? faucetBalance : balance).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}{" "}
              <span className="text-lg font-normal text-amber-400">USDC</span>
            </div>
          </div>

          <div className="pt-4 border-t border-neutral-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-neutral-500 block">Onchain Identity</span>
              <span className="font-mono text-neutral-300 break-all text-[11px]">{currentAddress}</span>
            </div>
            {currentAddress && (
              <a
                href={`https://sepolia.basescan.org/address/${currentAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-amber-400 hover:text-amber-300 text-xs font-medium"
              >
                <span>View on BaseScan</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
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

      {/* Real Onchain Transaction History (Base Sepolia) */}
      <div className="rounded-3xl border border-neutral-900 bg-neutral-950 p-8 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-neutral-900 pb-4">
          <div className="flex items-center gap-2.5">
            <History className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white">Real Onchain Transaction History</h2>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-400">
              Base Sepolia Live
            </span>
          </div>

          <button
            onClick={fetchTransactions}
            disabled={loadingTxs}
            className="text-xs text-neutral-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Refresh onchain transactions"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingTxs ? "animate-spin text-amber-400" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {loadingTxs ? (
          <div className="py-12 text-center space-y-2 font-mono text-xs text-neutral-400">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-amber-400" />
            <p>Scanning Base Sepolia blockchain for onchain transactions...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12 space-y-3 font-mono">
            <FileText className="w-8 h-8 text-neutral-600 mx-auto" />
            <p className="text-xs text-neutral-400">No transactions found yet on Base Sepolia</p>
            {currentAddress && (
              <a
                href={`https://sepolia.basescan.org/address/${currentAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-amber-400 hover:text-amber-300 text-xs font-semibold pt-1"
              >
                <span>View address on BaseScan</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => (
              <div
                key={tx.hash}
                className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono transition-all hover:bg-neutral-900"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2.5 rounded-xl ${
                      tx.type === "IN"
                        ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/40"
                        : "bg-orange-950/60 text-orange-400 border border-orange-800/40"
                    }`}
                  >
                    {tx.type === "IN" ? (
                      <ArrowDownLeft className="w-4 h-4" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">
                        {tx.type === "IN" ? "+" : "-"} {tx.value} {tx.tokenSymbol}
                      </span>
                      {tx.isError && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] bg-red-950 border border-red-800 text-red-400">
                          Failed
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-neutral-500">
                      {new Date(tx.timeStamp).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-800/60 justify-between sm:justify-end">
                  <div className="text-right text-[11px] text-neutral-400 hidden md:block">
                    <span>{tx.type === "IN" ? "From: " : "To: "}</span>
                    <span className="text-neutral-300">
                      {(tx.type === "IN" ? tx.from : tx.to)?.slice(0, 6)}...
                      {(tx.type === "IN" ? tx.from : tx.to)?.slice(-4)}
                    </span>
                  </div>

                  <a
                    href={tx.explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[11px] transition-colors"
                  >
                    <span>{tx.hash.slice(0, 6)}...{tx.hash.slice(-4)}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Your Chit Circles Portfolio */}
      <div className="rounded-3xl border border-neutral-900 bg-neutral-950 p-8 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-neutral-900 pb-4">
          <div className="flex items-center gap-2.5">
            <Users className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white">Your Chit Circles Portfolio</h2>
          </div>
          <Link
            href="/circles/new"
            className="text-xs font-bold text-amber-400 hover:text-amber-300 uppercase tracking-wider"
          >
            + Create New Circle
          </Link>
        </div>

        {loadingCircles ? (
          <p className="text-xs text-neutral-500 text-center py-6 font-mono">Loading portfolio...</p>
        ) : myCircles.length === 0 ? (
          <div className="text-center py-8 space-y-3">
            <p className="text-xs text-neutral-400 font-mono">0 active chit circles joined.</p>
            <Link
              href="/circles/new"
              className="inline-block px-5 py-2.5 rounded-full bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs text-white font-semibold transition-all"
            >
              Start your first circle
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {myCircles.map((circle) => (
              <Link
                key={circle.id}
                href={`/circles/${circle.id}`}
                className="p-5 rounded-2xl bg-neutral-900/60 hover:bg-neutral-900 border border-neutral-800 transition-all space-y-3 group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-white group-hover:text-amber-400 transition-colors truncate">
                    {circle.name}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-800/60 text-amber-300 font-mono">
                    {circle.status}
                  </span>
                </div>
                <div className="text-xs text-neutral-400 space-y-1 font-mono">
                  <p>{circle.numPeople} Members • {circle.durationMonths} Months</p>
                  <p className="text-white font-bold">{fromBaseUnits(circle.monthlyAmount)} USDC/mo</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
