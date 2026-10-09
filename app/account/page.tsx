"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDevUser } from "@/components/providers";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { createPublicClient, http, formatUnits, erc20Abi, parseAbiItem } from "viem";
import { baseSepolia } from "viem/chains";
import {
  Wallet,
  ArrowLeft,
  CheckCircle,
  Shield,
  Copy,
  ExternalLink,
  LogOut,
  Users,
  Check,
  Zap,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  History,
  FileText,
  AlertCircle,
} from "lucide-react";
import { fromBaseUnits } from "@/lib/validation";

const BASE_SEPOLIA_USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
const transferEventAbi = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 value)"
);

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org", {
    timeout: 3500,
    retryCount: 1,
  }),
});

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

export default function AccountProfilePage() {
  const router = useRouter();
  const { user, setUser } = useDevUser();
  const { user: privyUser, authenticated, ready, logout } = usePrivy();
  const { wallets } = useWallets();

  // Dynamic Identity extraction
  const embeddedWallet = wallets.find((w) => w.walletClientType === "privy") || wallets[0];
  const linkedWallet = privyUser?.linkedAccounts?.find(
    (a: any) => a.type === "wallet" || a.walletClientType === "privy"
  ) as any;
  const activeWalletAddress = (
    embeddedWallet?.address ||
    privyUser?.wallet?.address ||
    linkedWallet?.address ||
    user?.walletAddress ||
    ""
  ).toLowerCase();

  const userEmail = privyUser?.email?.address || "";
  const dynamicUsername = userEmail
    ? userEmail.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "").toLowerCase()
    : activeWalletAddress
    ? `user_${activeWalletAddress.slice(2, 6).toLowerCase()}`
    : user?.username || "member";

  const dynamicDisplayName = userEmail
    ? userEmail.split("@")[0]
    : user?.displayName || dynamicUsername;

  // Live onchain state
  const [balance, setBalance] = useState<string | null>(null);
  const [loadingBalance, setLoadingBalance] = useState<boolean>(true);
  const [copied, setCopied] = useState(false);
  
  // Real Circles & Mandate State
  const [myCircles, setMyCircles] = useState<any[]>([]);
  const [loadingCircles, setLoadingCircles] = useState(true);
  const [hasAutopaySession, setHasAutopaySession] = useState<boolean>(false);

  // Real onchain transactions state
  const [transactions, setTransactions] = useState<TxItem[]>([]);
  const [loadingTxs, setLoadingTxs] = useState(true);

  // Fetch Live On-Chain USDC Balance using viem
  const fetchLiveUSDCBalance = async () => {
    if (!activeWalletAddress || !/^0x[a-f0-9]{40}$/i.test(activeWalletAddress)) {
      setBalance("0.00");
      setLoadingBalance(false);
      return;
    }

    setLoadingBalance(true);
    try {
      const readPromise = publicClient.readContract({
        address: BASE_SEPOLIA_USDC,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [activeWalletAddress as `0x${string}`],
      });
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("RPC Timeout")), 2000));
      const rawBalance = (await Promise.race([readPromise, timeoutPromise])) as bigint;

      const formatted = Number(formatUnits(rawBalance, 6)).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 6,
      });
      setBalance(formatted);
    } catch (err) {
      console.warn("Notice reading onchain USDC balance:", err);
      try {
        const res = await fetch("/api/account/faucet", {
          headers: { "x-dev-user": dynamicUsername },
        });
        const data = await res.json();
        if (data?.balanceUSDC) {
          setBalance(Number(data.balanceUSDC).toLocaleString(undefined, { minimumFractionDigits: 2 }));
        } else {
          setBalance("0.00");
        }
      } catch {
        setBalance("0.00");
      }
    } finally {
      setLoadingBalance(false);
    }
  };

  // Fetch Member's Active Circles & Mandate Status
  const fetchMemberCircles = async () => {
    if (!dynamicUsername) {
      setMyCircles([]);
      setLoadingCircles(false);
      return;
    }
    setLoadingCircles(true);
    try {
      const res = await fetch("/api/circles/mine", {
        headers: { "x-dev-user": dynamicUsername },
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setMyCircles(data);
        const hasSession = data.some((c) => c.status === "FINALIZED");
        setHasAutopaySession(hasSession);
      } else {
        setMyCircles([]);
      }
    } catch (err) {
      console.error("Error loading circles:", err);
      setMyCircles([]);
    } finally {
      setLoadingCircles(false);
    }
  };

  // Fetch Real Onchain ERC-20 USDC Transfer Logs from Base Sepolia
  const fetchRealTransactions = async () => {
    if (!activeWalletAddress || !/^0x[a-f0-9]{40}$/i.test(activeWalletAddress)) {
      setTransactions([]);
      setLoadingTxs(false);
      return;
    }
    setLoadingTxs(true);
    try {
      const onchainTxs: TxItem[] = [];

      // 1. Fetch directly via viem getLogs on Base Sepolia USDC contract with dynamic block range
      try {
        const currentBlock = await publicClient.getBlockNumber();
        const fromBlock = currentBlock > 5000n ? currentBlock - 5000n : 0n;

        const logsPromise = Promise.all([
          publicClient.getLogs({
            address: BASE_SEPOLIA_USDC,
            event: transferEventAbi,
            args: {
              to: activeWalletAddress as `0x${string}`,
            },
            fromBlock,
            toBlock: "latest",
          }),
          publicClient.getLogs({
            address: BASE_SEPOLIA_USDC,
            event: transferEventAbi,
            args: {
              from: activeWalletAddress as `0x${string}`,
            },
            fromBlock,
            toBlock: "latest",
          }),
        ]);

        const timeoutLogs = new Promise<any[]>((_, reject) => setTimeout(() => reject(new Error("Logs Timeout")), 2500));
        const [inLogs, outLogs] = (await Promise.race([logsPromise, timeoutLogs])) as [any[], any[]];

        const allLogs = [...inLogs, ...outLogs];

        for (const log of allLogs) {
          const rawVal = log.args.value ?? 0n;
          const formattedVal = Number(formatUnits(rawVal, 6)).toFixed(2);
          const isOut = log.args.from?.toLowerCase() === activeWalletAddress;

          onchainTxs.push({
            hash: log.transactionHash,
            from: log.args.from || "",
            to: log.args.to || "",
            value: formattedVal,
            tokenSymbol: "USDC",
            timeStamp: Date.now(),
            isError: false,
            type: isOut ? "OUT" : "IN",
            blockNumber: log.blockNumber?.toString(),
            explorerUrl: `https://sepolia.basescan.org/tx/${log.transactionHash}`,
          });
        }
      } catch (error) {
        console.error("RPC Log Fetch Error:", error);
        setTransactions([]);
      }

      // 2. Fetch from BaseScan indexer API to complement / fallback
      try {
        const res = await fetch(`/api/account/transactions?address=${activeWalletAddress}`, {
          headers: { "x-dev-user": dynamicUsername },
        });
        const data = await res.json();

        if (Array.isArray(data?.transactions)) {
          for (const tx of data.transactions) {
            // Avoid duplicates
            if (!onchainTxs.some((existing) => existing.hash.toLowerCase() === tx.hash.toLowerCase())) {
              onchainTxs.push(tx);
            }
          }
        }
      } catch (apiErr) {
        console.warn("BaseScan API transactions query fallback notice:", apiErr);
      }

      // Sort logs by blockNumber/timestamp descending
      onchainTxs.sort((a, b) => {
        if (a.blockNumber && b.blockNumber && a.blockNumber !== b.blockNumber) {
          return Number(b.blockNumber) - Number(a.blockNumber);
        }
        return b.timeStamp - a.timeStamp;
      });

      setTransactions(onchainTxs);
    } catch (err) {
      console.error("Error loading real transactions:", err);
      setTransactions([]);
    } finally {
      setLoadingTxs(false);
    }
  };

  useEffect(() => {
    if (ready) {
      fetchLiveUSDCBalance();
      fetchMemberCircles();
      fetchRealTransactions();
    }
  }, [activeWalletAddress, dynamicUsername, ready]);

  const handleCopyWallet = () => {
    if (!activeWalletAddress) return;
    navigator.clipboard.writeText(activeWalletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLogout = async () => {
    try {
      if (logout) {
        await logout();
      }
    } catch (err) {
      console.warn("Privy logout error:", err);
    }
    setUser(null);
    router.push("/login");
  };

  if (!ready) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center space-y-3 font-mono text-xs">
        <RefreshCw className="w-6 h-6 text-amber-400 animate-spin" />
        <span>Loading Privy Smart Account...</span>
      </div>
    );
  }

  if (!authenticated && !activeWalletAddress) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center space-y-4">
        <Shield className="w-12 h-12 text-amber-400 animate-pulse" />
        <h2 className="text-2xl font-bold">No Active Session</h2>
        <p className="text-xs text-neutral-400 max-w-sm">
          Please authenticate with your email or smart wallet to access your account dashboard.
        </p>
        <Link
          href="/login"
          className="px-6 py-3 rounded-full bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs uppercase tracking-wider transition-all"
        >
          Go to Login
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-10 px-6 space-y-8 text-neutral-100 selection:bg-amber-500 selection:text-black">
      
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-900 pb-6">
        <div>
          <Link
            href="/home"
            className="inline-flex items-center gap-2 text-xs font-mono text-neutral-400 hover:text-white transition-colors mb-2 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </Link>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Member Account Hub</h1>
          <p className="text-xs text-neutral-400 mt-1 font-mono">
            Base Sepolia Smart Account
          </p>
        </div>

        <button
          onClick={handleLogout}
          className="self-start sm:self-auto px-4 py-2.5 rounded-full bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-red-300 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-lg"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Logout</span>
        </button>
      </div>

      {/* Top Section Grid (Balance Card + Profile Card) */}
      <div className="grid md:grid-cols-2 gap-6">
        
        {/* Left: Custody Balance Card */}
        <div className="rounded-3xl bg-neutral-950 p-8 border border-neutral-900 shadow-xl flex flex-col justify-between space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-bold text-amber-400">
              <Shield className="w-4 h-4" />
              <span>Wallet Custody</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-neutral-900 border border-neutral-800 text-[10px] font-mono text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Base Sepolia</span>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] uppercase tracking-wider text-neutral-500 block font-semibold">
              Live USDC Balance
            </span>
            <div className="text-3xl sm:text-4xl font-extrabold text-white font-mono tracking-tight flex items-baseline gap-2">
              {loadingBalance ? (
                <span className="animate-pulse text-neutral-500">... USDC</span>
              ) : (
                <>
                  <span>{balance ?? "0.00"}</span>
                  <span className="text-base font-normal text-neutral-400">USDC</span>
                </>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-neutral-900 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-neutral-500">Address</span>
              {activeWalletAddress && (
                <button
                  onClick={handleCopyWallet}
                  className="text-neutral-400 hover:text-white flex items-center gap-1 text-[11px] font-mono transition-colors cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              )}
            </div>
            <div className="p-2.5 rounded-xl bg-neutral-900/90 border border-neutral-800 font-mono text-[11px] text-neutral-300 break-all select-all">
              {activeWalletAddress || "No wallet address attached"}
            </div>

            {activeWalletAddress && (
              <a
                href={`https://sepolia.basescan.org/address/${activeWalletAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-amber-400 hover:text-amber-300 text-[11px] font-medium pt-0.5"
              >
                <span>View on BaseScan</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>

        {/* Right: Member Profile Card */}
        <div className="rounded-3xl border border-neutral-900 bg-neutral-950 p-8 shadow-xl flex flex-col justify-between space-y-6">
          <div className="space-y-6">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center font-bold text-black text-xl shadow-lg">
                {dynamicDisplayName.slice(0, 1).toUpperCase()}
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{dynamicDisplayName}</h3>
                <p className="text-xs font-mono text-neutral-400">@{dynamicUsername}</p>
                {userEmail && <p className="text-[11px] font-mono text-neutral-500 mt-0.5">{userEmail}</p>}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-900/50 border border-neutral-800 space-y-3 text-xs">
              <div className="flex justify-between items-center text-neutral-400">
                <span>Account Status</span>
                {authenticated ? (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Verified Member</span>
                  </span>
                ) : (
                  <span className="text-neutral-500 font-medium">Guest</span>
                )}
              </div>

              <div className="flex justify-between items-center text-neutral-400">
                <span>Autopay Mandate</span>
                {hasAutopaySession ? (
                  <span className="text-amber-300 font-semibold flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5" />
                    <span>Active</span>
                  </span>
                ) : (
                  <span className="text-neutral-500 font-medium font-mono text-[11px]">
                    Not Configured
                  </span>
                )}
              </div>

              <div className="flex justify-between items-center text-neutral-400">
                <span>Active Circles</span>
                <span className="text-white font-bold font-mono">
                  {loadingCircles ? "..." : `${myCircles.length} Circles`}
                </span>
              </div>
            </div>
          </div>
        </div>

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
            onClick={() => {
              fetchLiveUSDCBalance();
              fetchRealTransactions();
            }}
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
            {activeWalletAddress && (
              <a
                href={`https://sepolia.basescan.org/address/${activeWalletAddress}`}
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
