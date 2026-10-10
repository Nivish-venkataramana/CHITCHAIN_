"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useDevUser } from "@/components/providers";
import {
  ArrowLeft,
  Lock,
  Unlock,
  Trophy,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Users,
  Coins,
  ArrowRight,
  RotateCcw,
  Shield,
  UserCheck,
  User,
  Play,
  Calendar,
  X,
  TrendingUp,
  Percent,
} from "lucide-react";
import { fromBaseUnits } from "@/lib/validation";
import { generateSecureSalt, deriveDemoSalt } from "@/lib/bidding-store";

interface BidInfo {
  memberWallet: string;
  memberUsername: string;
  commitment: string;
  amount?: string;
  salt?: string;
  revealed: boolean;
  committedAt?: number;
}

interface BiddingState {
  circleId: string;
  cycle: number;
  phase: "Commit" | "Reveal" | "Settled";
  totalPool: string;
  floorBid: string;
  bids: BidInfo[];
  winner: {
    wallet: string;
    username: string;
    amount: string;
    dividend: string;
  } | null;
}

interface MonthSimulation {
  month: number;
  potAmount: string;
  floorAmount: string;
  winnerUsername: string;
  winnerDisplayName: string;
  winnerWallet: string;
  winningBid: string;
  dividend: string;
  dividendPerMember: string;
  bids: Array<{
    username: string;
    displayName: string;
    wallet: string;
    amount: string;
    isWinner: boolean;
    note?: string;
  }>;
}

// 4 Demo participants with suggested benchmark bids
const DEMO_PARTICIPANTS = [
  { username: "asharao01", displayName: "Asha Rao", wallet: "0x1111111111111111111111111111111111111111", targetBid: "3900" },
  { username: "vikramnair02", displayName: "Vikram Nair", wallet: "0x2222222222222222222222222222222222222222", targetBid: "3800" },
  { username: "meerajoshi03", displayName: "Meera Joshi", wallet: "0x3333333333333333333333333333333333333333", targetBid: "3850" },
  { username: "rohandas04", displayName: "Rohan Das", wallet: "0x4444444444444444444444444444444444444444", targetBid: "3950" },
];

// Full 4-Month Circle Auction Lifecycle Simulation Data
const FULL_LIFECYCLE_SIMULATION: MonthSimulation[] = [
  {
    month: 1,
    potAmount: "4,000",
    floorAmount: "2,000",
    winnerUsername: "vikramnair02",
    winnerDisplayName: "Vikram Nair",
    winnerWallet: "0x2222222222222222222222222222222222222222",
    winningBid: "3,800",
    dividend: "200",
    dividendPerMember: "50",
    bids: [
      { username: "vikramnair02", displayName: "Vikram Nair", wallet: "0x2222...2222", amount: "3,800", isWinner: true, note: "Lowest Bid (5% discount) — Awarded Pot" },
      { username: "meerajoshi03", displayName: "Meera Joshi", wallet: "0x3333...3333", amount: "3,850", isWinner: false, note: "3.75% discount offered" },
      { username: "asharao01", displayName: "Asha Rao", wallet: "0x1111...1111", amount: "3,900", isWinner: false, note: "2.5% discount offered" },
      { username: "rohandas04", displayName: "Rohan Das", wallet: "0x4444...4444", amount: "3,950", isWinner: false, note: "1.25% discount offered" },
    ],
  },
  {
    month: 2,
    potAmount: "4,000",
    floorAmount: "2,000",
    winnerUsername: "meerajoshi03",
    winnerDisplayName: "Meera Joshi",
    winnerWallet: "0x3333333333333333333333333333333333333333",
    winningBid: "3,820",
    dividend: "180",
    dividendPerMember: "45",
    bids: [
      { username: "meerajoshi03", displayName: "Meera Joshi", wallet: "0x3333...3333", amount: "3,820", isWinner: true, note: "Lowest Bid (4.5% discount) — Awarded Month 2 Pot" },
      { username: "asharao01", displayName: "Asha Rao", wallet: "0x1111...1111", amount: "3,890", isWinner: false, note: "2.75% discount offered" },
      { username: "rohandas04", displayName: "Rohan Das", wallet: "0x4444...4444", amount: "3,940", isWinner: false, note: "1.5% discount offered" },
      { username: "vikramnair02", displayName: "Vikram Nair", wallet: "0x2222...2222", amount: "—", isWinner: false, note: "Past Winner (Contributes without bidding)" },
    ],
  },
  {
    month: 3,
    potAmount: "4,000",
    floorAmount: "2,000",
    winnerUsername: "asharao01",
    winnerDisplayName: "Asha Rao",
    winnerWallet: "0x1111111111111111111111111111111111111111",
    winningBid: "3,880",
    dividend: "120",
    dividendPerMember: "30",
    bids: [
      { username: "asharao01", displayName: "Asha Rao", wallet: "0x1111...1111", amount: "3,880", isWinner: true, note: "Lowest Bid (3% discount) — Awarded Month 3 Pot" },
      { username: "rohandas04", displayName: "Rohan Das", wallet: "0x4444...4444", amount: "3,920", isWinner: false, note: "2% discount offered" },
      { username: "vikramnair02", displayName: "Vikram Nair", wallet: "0x2222...2222", amount: "—", isWinner: false, note: "Past Winner (Contributes only)" },
      { username: "meerajoshi03", displayName: "Meera Joshi", wallet: "0x3333...3333", amount: "—", isWinner: false, note: "Past Winner (Contributes only)" },
    ],
  },
  {
    month: 4,
    potAmount: "4,000",
    floorAmount: "2,000",
    winnerUsername: "rohandas04",
    winnerDisplayName: "Rohan Das",
    winnerWallet: "0x4444444444444444444444444444444444444444",
    winningBid: "4,000",
    dividend: "0",
    dividendPerMember: "0",
    bids: [
      { username: "rohandas04", displayName: "Rohan Das", wallet: "0x4444...4444", amount: "4,000", isWinner: true, note: "Final Member — Receives 100% Full Pot with 0% Discount" },
      { username: "asharao01", displayName: "Asha Rao", wallet: "0x1111...1111", amount: "—", isWinner: false, note: "Past Winner (Contributes only)" },
      { username: "vikramnair02", displayName: "Vikram Nair", wallet: "0x2222...2222", amount: "—", isWinner: false, note: "Past Winner (Contributes only)" },
      { username: "meerajoshi03", displayName: "Meera Joshi", wallet: "0x3333...3333", amount: "—", isWinner: false, note: "Past Winner (Contributes only)" },
    ],
  },
];

export default function BiddingModulePage() {
  const params = useParams();
  const circleId = params.id as string;
  const { user, setUser } = useDevUser();

  const [state, setState] = useState<BiddingState | null>(null);
  const [loading, setLoading] = useState(true);
  const [bidAmount, setBidAmount] = useState<string>("3800");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Full Timeperiod Simulation Modal state
  const [showSimModal, setShowSimModal] = useState(false);
  const [selectedMonthTab, setSelectedMonthTab] = useState<number>(1);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);

  const loadBiddingState = () => {
    fetch(`/api/circles/${circleId}/bidding`, {
      headers: user?.username ? { "x-dev-user": user.username } : undefined,
    })
      .then((r) => r.json())
      .then((data) => {
        if (data && !data.error) setState(data);
      })
      .catch((err) => console.error("Error loading bidding state:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadBiddingState();
  }, [circleId, user?.username]);

  // Adjust suggested target bid whenever demo user changes
  useEffect(() => {
    if (user?.username) {
      const match = DEMO_PARTICIPANTS.find((p) => p.username.toLowerCase() === user.username.toLowerCase());
      if (match) {
        setBidAmount(match.targetBid);
      }
    }
  }, [user?.username]);

  // Realtime client validation against 50% floor and total pool
  useEffect(() => {
    if (!state) return;
    const raw = String(bidAmount || "").trim();
    if (!raw) {
      setValidationError("Please enter a valid bid amount.");
      return;
    }

    const num = parseFloat(raw);
    if (isNaN(num) || num <= 0) {
      setValidationError("Please enter a valid positive USDC bid amount.");
      return;
    }

    const floorNum = Number(fromBaseUnits(state.floorBid));
    const poolNum = Number(fromBaseUnits(state.totalPool));

    if (num < floorNum) {
      setValidationError(`Bid amount must be at least 50% of the round pot (${floorNum.toLocaleString()} USDC).`);
      return;
    }

    if (num > poolNum) {
      setValidationError(`Bid amount cannot exceed the round pot (${poolNum.toLocaleString()} USDC).`);
      return;
    }

    setValidationError(null);
  }, [bidAmount, state]);

  // Auto-play timer for full simulation
  useEffect(() => {
    let timer: any;
    if (isAutoPlaying && showSimModal) {
      timer = setInterval(() => {
        setSelectedMonthTab((prev) => (prev >= 4 ? 1 : prev + 1));
      }, 2500);
    }
    return () => clearInterval(timer);
  }, [isAutoPlaying, showSimModal]);

  const userBid = state?.bids.find(
    (b) => user && (
      b.memberWallet.toLowerCase() === user.walletAddress.toLowerCase() ||
      b.memberUsername.toLowerCase() === user.username.toLowerCase()
    )
  );

  const handleSwitchParticipant = (p: typeof DEMO_PARTICIPANTS[0]) => {
    const newUser = {
      username: p.username,
      walletAddress: p.wallet as `0x${string}`,
      displayName: p.displayName,
      createdAt: new Date().toISOString(),
    };
    setUser(newUser);
    setBidAmount(p.targetBid);
    setError(null);
    setSuccessMsg(null);
  };

  const handleCommit = async () => {
    if (!user) {
      setError("Please select an active participant to submit a bid.");
      return;
    }

    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      // Generate secure high-entropy salt and save to private participant storage
      const salt = generateSecureSalt();
      const storageKey = `chitchain_bid_secret_${circleId}_${user.username}`;
      localStorage.setItem(storageKey, JSON.stringify({ amount: bidAmount, salt }));

      const res = await fetch(`/api/circles/${circleId}/bidding/commit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-dev-user": user.username,
          "x-dev-wallet": user.walletAddress,
        },
        body: JSON.stringify({ amount: bidAmount, salt }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to commit bid");

      setSuccessMsg(`Secret bid of ${Number(bidAmount).toLocaleString()} USDC cryptographically hashed & committed!`);
      loadBiddingState();
    } catch (err: any) {
      setError(err.message || "Failed to commit bid");
    } finally {
      setSubmitting(false);
    }
  };

  const handle1ClickReveal = async () => {
    if (!user) return;
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const storageKey = `chitchain_bid_secret_${circleId}_${user.username}`;
      const saved = localStorage.getItem(storageKey);
      let parsedAmount = bidAmount;
      let parsedSalt = deriveDemoSalt(circleId, state?.cycle || 1, user.walletAddress);

      if (saved) {
        try {
          const obj = JSON.parse(saved);
          if (obj.amount) parsedAmount = obj.amount;
          if (obj.salt) parsedSalt = obj.salt;
        } catch {}
      }

      const baseUnits = BigInt(Math.round(parseFloat(parsedAmount) * 1_000_000)).toString();

      const res = await fetch(`/api/circles/${circleId}/bidding/reveal`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-dev-user": user.username,
          "x-dev-wallet": user.walletAddress,
        },
        body: JSON.stringify({ amountBaseUnits: baseUnits, salt: parsedSalt }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reveal bid");

      setSuccessMsg(`Bid of ${Number(parsedAmount).toLocaleString()} USDC verified and published onchain!`);
      loadBiddingState();
    } catch (err: any) {
      setError(err.message || "Failed to reveal bid");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSettle = async () => {
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/circles/${circleId}/bidding/settle`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to settle auction");

      setSuccessMsg("Auction settled! Winner selected with lowest discount bid.");
      loadBiddingState();
    } catch (err: any) {
      setError(err.message || "Failed to settle auction");
    } finally {
      setSubmitting(false);
    }
  };

  // Quick 1-Click Demo Auction Simulation for the current cycle
  const handleQuickDemoRun = async () => {
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      // 1. Commit all 4 demo bids
      for (const p of DEMO_PARTICIPANTS) {
        const salt = deriveDemoSalt(circleId, state?.cycle || 1, p.wallet);
        await fetch(`/api/circles/${circleId}/bidding/commit`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-dev-user": p.username,
            "x-dev-wallet": p.wallet,
          },
          body: JSON.stringify({ amount: p.targetBid, salt }),
        });
      }

      // 2. Reveal all 4 demo bids
      for (const p of DEMO_PARTICIPANTS) {
        const salt = deriveDemoSalt(circleId, state?.cycle || 1, p.wallet);
        const baseUnits = BigInt(Math.round(parseFloat(p.targetBid) * 1_000_000)).toString();
        await fetch(`/api/circles/${circleId}/bidding/reveal`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-dev-user": p.username,
            "x-dev-wallet": p.wallet,
          },
          body: JSON.stringify({ amountBaseUnits: baseUnits, salt }),
        });
      }

      // 3. Settle auction
      const settleRes = await fetch(`/api/circles/${circleId}/bidding/settle`, { method: "POST" });
      const settleData = await settleRes.json();
      if (!settleRes.ok) throw new Error(settleData.error || "Failed to settle demo run");

      setSuccessMsg("🎉 1-Click Demo Auction Completed! Vikram Nair won with lowest bid of 3,800 USDC (200 USDC dividend carry).");
      loadBiddingState();
    } catch (err: any) {
      setError(err.message || "Failed to execute quick demo auction");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="p-8 text-center text-xs font-mono text-neutral-400 rounded-3xl border border-white/10 bg-transparent">
          Loading confidential sealed auction...
        </div>
      </div>
    );
  }

  const poolUSDC = state ? Number(fromBaseUnits(state.totalPool)).toLocaleString() : "4,000";
  const floorUSDC = state ? Number(fromBaseUnits(state.floorBid)).toLocaleString() : "2,000";
  const committedCount = state?.bids.length || 0;
  const revealedCount = state?.bids.filter((b) => b.revealed).length || 0;
  const currentSimMonth = FULL_LIFECYCLE_SIMULATION.find((m) => m.month === selectedMonthTab) || FULL_LIFECYCLE_SIMULATION[0];

  return (
    <div className="w-full max-w-4xl mx-auto py-6 px-4 space-y-6 text-neutral-100">
      {/* Top Bar with Demo Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link
          href={`/circles/${circleId}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Return to Circle</span>
        </Link>

        {/* Demo Simulation Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowSimModal(true)}
            className="px-3.5 py-1.5 rounded-xl border border-amber-500/50 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            title="View Bidding of the whole timeperiod set in circle"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span>Full Timeperiod Simulation</span>
          </button>

          <button
            type="button"
            onClick={handleQuickDemoRun}
            disabled={submitting}
            className="px-3.5 py-1.5 rounded-xl bg-white text-black hover:bg-neutral-200 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
            title="Auto-commit, reveal, and settle Month 1 demo auction in 1 click"
          >
            <Play className="h-3 w-3 fill-current" />
            <span>{submitting ? "Simulating..." : "1-Click Demo Auction"}</span>
          </button>
        </div>
      </div>

      {/* Main Container Card */}
      <div className="rounded-3xl border border-white/10 bg-neutral-950 p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden">
        {/* Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Confidential Sealed Auction</h1>
              <p className="text-xs text-neutral-400 mt-0.5">
                Commit and Reveal Scheme on Base Sepolia
              </p>
            </div>
          </div>
          <span
            className={`px-3.5 py-1 rounded-full text-xs font-bold font-mono uppercase tracking-wider self-start sm:self-auto border ${
              state?.phase === "Settled"
                ? "bg-emerald-950/80 text-emerald-300 border-emerald-800/60"
                : state?.phase === "Reveal"
                ? "bg-amber-950/80 text-amber-300 border-amber-800/60"
                : "bg-red-950/80 text-red-300 border-red-800/60"
            }`}
          >
            PHASE: {state?.phase?.toUpperCase()}
          </span>
        </div>

        {/* Demo Account Switcher Bar */}
        <div className="p-3.5 rounded-2xl border border-white/10 bg-white/[0.02] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-400 font-semibold flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-amber-400" />
              <span>Select Active Demo Participant (4 Members)</span>
            </span>
            <span className="text-[10px] font-mono text-neutral-400">
              Active: <strong className="text-white">@{user?.username || "none"}</strong>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {DEMO_PARTICIPANTS.map((p) => {
              const isSelected = user?.username?.toLowerCase() === p.username.toLowerCase();
              const pBid = state?.bids.find((b) => b.memberWallet.toLowerCase() === p.wallet.toLowerCase());
              return (
                <button
                  key={p.username}
                  type="button"
                  onClick={() => handleSwitchParticipant(p)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? "border-amber-500/60 bg-amber-500/10 text-white shadow-md shadow-amber-500/10"
                      : "border-white/10 bg-white/[0.02] text-neutral-400 hover:border-white/20 hover:text-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold truncate">@{p.username}</span>
                    {pBid?.revealed ? (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/50">
                        Revealed
                      </span>
                    ) : pBid ? (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-red-950 text-red-300 border border-red-800/50">
                        Committed
                      </span>
                    ) : (
                      <span className="text-[9px] text-neutral-500">Pending</span>
                    )}
                  </div>
                  <div className="text-[10px] text-neutral-400 font-mono mt-0.5 flex justify-between">
                    <span>{p.displayName}</span>
                    <span className="text-amber-400/90">{p.targetBid} USDC</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-800/60 text-red-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Global Success Banner */}
        {successMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Bidding Rules Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="p-4 rounded-2xl bg-neutral-900/70 border border-white/10 space-y-1">
            <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-400 block font-semibold">
              Minimum Floor Bid (50%)
            </span>
            <span className="font-bold text-white text-xl font-mono block">
              {floorUSDC} <span className="text-xs text-neutral-400 font-normal">USDC</span>
            </span>
          </div>
          <div className="p-4 rounded-2xl bg-neutral-900/70 border border-white/10 space-y-1">
            <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-400 block font-semibold">
              Total Round Pot in Vault
            </span>
            <span className="font-bold text-white text-xl font-mono block">
              {poolUSDC} <span className="text-xs text-neutral-400 font-normal">USDC</span>
            </span>
          </div>
        </div>

        {/* Phase 1: Commit Phase */}
        {state?.phase === "Commit" && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6 space-y-5">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Lock className="h-4 w-4 text-red-400" />
                <span>Submit Your Confidential Bid</span>
              </h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Specify the payout pot amount you would accept. Your bid remains cryptographically sealed until the reveal window opens.
              </p>
            </div>

            {!userBid ? (
              <div className="space-y-3.5">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold text-neutral-300">
                    Bid Amount for @{user?.username || "participant"} (Min: {floorUSDC} USDC)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      placeholder="3800"
                      className="w-full rounded-xl border border-white/10 bg-white/[0.03] pl-4 pr-16 py-3 text-sm text-white focus:outline-none focus:border-white/30 font-mono transition-colors"
                    />
                    <span className="absolute right-4 top-3 text-xs font-bold text-neutral-400">
                      USDC
                    </span>
                  </div>

                  {validationError && (
                    <p className="text-[11px] text-red-400 font-mono flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      <span>{validationError}</span>
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleCommit}
                  disabled={submitting || Boolean(validationError)}
                  className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer ${
                    !validationError && !submitting
                      ? "bg-white text-black hover:bg-neutral-200"
                      : "bg-white/10 text-neutral-500 border border-white/10 cursor-not-allowed"
                  }`}
                >
                  {submitting ? "Hashing and Committing..." : "Hash and Commit Secret Bid"}
                </button>
              </div>
            ) : (
              <div className="p-4 bg-white/[0.02] rounded-xl border border-white/10 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Bid successfully committed for @{user?.username}</span>
                </div>
                <p className="text-[11px] font-mono text-neutral-400 break-all">
                  Commitment Hash: <span className="text-white">{userBid.commitment}</span>
                </p>
                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-neutral-400 text-[11px] font-mono">
                  <span>Progress: {committedCount} of 4 members committed</span>
                  <span>{4 - committedCount > 0 ? `Waiting for ${4 - committedCount} member(s)` : "Ready for Reveal"}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Phase 2: Reveal Phase */}
        {state?.phase === "Reveal" && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Unlock className="h-4 w-4 text-amber-400" />
                <span>1-Click Reveal Active</span>
              </h3>
              <span className="text-xs text-neutral-400 font-mono">
                {revealedCount} of {committedCount} Revealed
              </span>
            </div>

            <p className="text-xs text-amber-300/90 leading-relaxed bg-amber-950/30 p-3.5 rounded-xl border border-amber-800/40">
              Important: Bids must be revealed to be eligible for payout. Unrevealed bids are discarded during settlement.
            </p>

            {!userBid?.revealed ? (
              <button
                type="button"
                onClick={handle1ClickReveal}
                disabled={submitting}
                className="w-full py-3.5 rounded-xl bg-white hover:bg-neutral-200 text-black font-bold text-xs uppercase tracking-wider shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="h-4 w-4 text-red-600" />
                <span>{submitting ? "Recovering Salt & Verifying..." : `1-Click Reveal for @${user?.username || "participant"}`}</span>
              </button>
            ) : (
              <div className="p-3.5 bg-emerald-950/40 border border-emerald-800/40 rounded-xl text-xs text-emerald-300 font-semibold flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>Bid for @{user?.username} revealed & verified onchain</span>
                </div>
                <span className="font-mono text-white font-bold">{fromBaseUnits(userBid.amount!)} USDC</span>
              </div>
            )}

            {/* Revealed Bids Board */}
            <div className="p-3.5 rounded-xl border border-white/10 bg-white/[0.02] space-y-2">
              <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-400 block font-semibold">
                Auction Reveal Board ({revealedCount} of 4)
              </span>
              <div className="space-y-1.5">
                {DEMO_PARTICIPANTS.map((p) => {
                  const b = state.bids.find((item) => item.memberWallet.toLowerCase() === p.wallet.toLowerCase());
                  return (
                    <div key={p.username} className="flex items-center justify-between text-xs font-mono py-1 border-b border-white/5 last:border-0">
                      <span className="text-neutral-300">@{p.username} ({p.displayName})</span>
                      {b?.revealed ? (
                        <span className="text-emerald-400 font-bold">{fromBaseUnits(b.amount!)} USDC</span>
                      ) : b ? (
                        <span className="text-amber-400/80 italic">Sealed (Pending Reveal)</span>
                      ) : (
                        <span className="text-neutral-600">No Commit</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={handleSettle}
                disabled={submitting || revealedCount === 0}
                className="w-full py-3 rounded-xl bg-white text-black font-semibold text-xs uppercase tracking-wider hover:bg-neutral-200 transition-colors cursor-pointer shadow-md"
              >
                <span>{submitting ? "Settling..." : "Settle Auction Pot and Pick Winner"}</span>
              </button>
            </div>
          </div>
        )}

        {/* Phase 3: Settled Phase */}
        {state?.phase === "Settled" && state.winner && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6 space-y-5">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Trophy className="h-5 w-5 text-emerald-400" />
              <span>Auction Settled: Winner Selected</span>
            </h3>

            <div className="grid sm:grid-cols-2 gap-3.5 bg-neutral-900/80 rounded-xl p-4 border border-white/10 text-xs">
              <div className="space-y-1">
                <span className="text-neutral-400 block uppercase tracking-wider text-[10px] font-mono">Winning Member</span>
                <span className="font-bold text-emerald-400 text-base block font-mono">
                  @{state.winner.username}
                </span>
                <span className="font-mono text-[10px] text-neutral-500">
                  {state.winner.wallet.slice(0, 8)}...{state.winner.wallet.slice(-6)}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-neutral-400 block uppercase tracking-wider text-[10px] font-mono">Winning Payout Pot</span>
                <span className="font-bold text-white text-base block font-mono">
                  {fromBaseUnits(state.winner.amount)} USDC
                </span>
                <span className="text-[11px] text-amber-400 font-medium font-mono block">
                  +{fromBaseUnits(state.winner.dividend)} USDC Carried to Month 2
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <Link
                href={`/circles/${circleId}/pool`}
                className="px-4 py-2 rounded-xl bg-white text-black font-semibold text-xs flex items-center gap-1.5 hover:bg-neutral-200 transition-colors shadow-md"
              >
                <span>View Month 2 Pool in Vault</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* Interactive Full Timeperiod Simulation Modal */}
      {/* ========================================================================= */}
      {showSimModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-3xl max-h-[90vh] rounded-3xl border border-white/15 bg-neutral-950 p-5 sm:p-7 shadow-2xl overflow-y-auto space-y-5 text-neutral-100 relative">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                    Full Circle Timeperiod Bidding Simulation
                  </h2>
                  <p className="text-xs text-neutral-400">
                    4-Month Circle Lifecycle: Lowest Discount Bid Winner & Monthly Dividend Distribution
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowSimModal(false);
                  setIsAutoPlaying(false);
                }}
                className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Month Navigation Tabs & Auto-Play Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 p-1 bg-white/[0.03] border border-white/10 rounded-2xl">
                {[1, 2, 3, 4].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setSelectedMonthTab(m);
                      setIsAutoPlaying(false);
                    }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      selectedMonthTab === m
                        ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
                        : "text-neutral-400 hover:text-white"
                    }`}
                  >
                    Month {m}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMonthTab(5); // 5 represents Summary Table
                    setIsAutoPlaying(false);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedMonthTab === 5
                      ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  Full Summary
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  isAutoPlaying
                    ? "border-amber-500 bg-amber-500/20 text-amber-300"
                    : "border-white/10 bg-white/[0.02] text-neutral-300 hover:text-white"
                }`}
              >
                <Play className={`h-3 w-3 ${isAutoPlaying ? "animate-spin" : "fill-current"}`} />
                <span>{isAutoPlaying ? "Auto-Playing..." : "Auto-Play Walkthrough"}</span>
              </button>
            </div>

            {/* Content for Months 1-4 */}
            {selectedMonthTab <= 4 && (
              <div className="space-y-4">
                {/* Month Highlights Banner */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-2xl border border-white/10 bg-white/[0.02] space-y-0.5 text-center">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-400 block font-semibold">
                      Month {currentSimMonth.month} Round Pot
                    </span>
                    <span className="text-base font-bold text-white font-mono block">
                      {currentSimMonth.potAmount} USDC
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 space-y-0.5 text-center">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-emerald-400 block font-semibold">
                      Lowest Bid Winner
                    </span>
                    <span className="text-base font-bold text-emerald-300 font-mono block">
                      @{currentSimMonth.winnerUsername} ({currentSimMonth.winningBid} USDC)
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl border border-amber-500/30 bg-amber-950/20 space-y-0.5 text-center">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-amber-400 block font-semibold">
                      Dividend Generated
                    </span>
                    <span className="text-base font-bold text-amber-300 font-mono block">
                      +{currentSimMonth.dividend} USDC ({currentSimMonth.dividendPerMember} USDC/member)
                    </span>
                  </div>
                </div>

                {/* Winner Spotlight Card */}
                <div className="p-4 rounded-2xl border border-emerald-500/40 bg-emerald-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400">
                      <Trophy className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-wider font-mono text-emerald-400 font-bold block">
                        Month {currentSimMonth.month} Winning Member
                      </span>
                      <h4 className="text-base font-bold text-white">
                        {currentSimMonth.winnerDisplayName} (@{currentSimMonth.winnerUsername})
                      </h4>
                      <p className="text-[11px] font-mono text-neutral-400">
                        Awarded Payout Pot: <strong className="text-emerald-300">{currentSimMonth.winningBid} USDC</strong>
                      </p>
                    </div>
                  </div>

                  <div className="text-right sm:border-l sm:border-emerald-500/20 sm:pl-4">
                    <span className="text-[10px] font-mono uppercase text-neutral-400 block">Member Benefit</span>
                    <span className="text-xs font-mono text-amber-300 font-bold">
                      +{currentSimMonth.dividend} USDC Dividend Discount
                    </span>
                  </div>
                </div>

                {/* All Bids Table for this Month */}
                <div className="p-4 rounded-2xl border border-white/10 bg-white/[0.02] space-y-3">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <span className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-neutral-400" />
                      <span>All Participant Bids in Month {currentSimMonth.month}</span>
                    </span>
                    <span className="text-[10px] font-mono text-neutral-400">
                      Minimum Floor: {currentSimMonth.floorAmount} USDC (50%)
                    </span>
                  </div>

                  <div className="space-y-2">
                    {currentSimMonth.bids.map((b) => (
                      <div
                        key={b.username}
                        className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono transition-all ${
                          b.isWinner
                            ? "border-emerald-500/60 bg-emerald-950/30 text-white shadow-sm"
                            : "border-white/5 bg-white/[0.01] text-neutral-300"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">@{b.username}</span>
                          <span className="text-neutral-400 text-[11px]">({b.displayName})</span>
                          {b.isWinner && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-black font-extrabold text-[9px] uppercase tracking-wider flex items-center gap-1">
                              <Trophy className="h-2.5 w-2.5" />
                              Winner
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 text-right">
                          <span className="text-[11px] text-neutral-400">{b.note}</span>
                          <span className={`text-sm font-bold ${b.isWinner ? "text-emerald-400" : "text-white"}`}>
                            {b.amount === "—" ? "—" : `${b.amount} USDC`}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Summary Table for Full Timeperiod (Tab 5) */}
            {selectedMonthTab === 5 && (
              <div className="p-4 rounded-2xl border border-white/10 bg-white/[0.02] space-y-4">
                <div className="border-b border-white/10 pb-2 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white font-mono flex items-center gap-1.5">
                    <Trophy className="h-4 w-4 text-amber-400" />
                    <span>Complete 4-Month Circle Settlement Ledger</span>
                  </h3>
                  <span className="text-[10px] font-mono text-neutral-400">
                    Total Volume: 16,000 USDC
                  </span>
                </div>

                <div className="overflow-x-auto no-scrollbar">
                  <table className="w-full text-xs font-mono text-left">
                    <thead>
                      <tr className="border-b border-white/10 text-[10px] uppercase text-neutral-400 tracking-wider">
                        <th className="py-2 pr-3">Participant</th>
                        <th className="py-2 px-3">Month Won</th>
                        <th className="py-2 px-3">Winning Bid</th>
                        <th className="py-2 px-3">Total Paid</th>
                        <th className="py-2 px-3 text-right">Net Position</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      <tr className="hover:bg-white/[0.02]">
                        <td className="py-2.5 pr-3 font-bold text-white">@vikramnair02 (Vikram)</td>
                        <td className="py-2.5 px-3 text-emerald-400 font-bold">Month 1</td>
                        <td className="py-2.5 px-3 font-bold text-white">3,800 USDC</td>
                        <td className="py-2.5 px-3 text-neutral-300">3,875 USDC</td>
                        <td className="py-2.5 px-3 text-right text-emerald-400 font-bold">Fast Liquidity (-75 USDC)</td>
                      </tr>
                      <tr className="hover:bg-white/[0.02]">
                        <td className="py-2.5 pr-3 font-bold text-white">@meerajoshi03 (Meera)</td>
                        <td className="py-2.5 px-3 text-emerald-400 font-bold">Month 2</td>
                        <td className="py-2.5 px-3 font-bold text-white">3,820 USDC</td>
                        <td className="py-2.5 px-3 text-neutral-300">3,875 USDC</td>
                        <td className="py-2.5 px-3 text-right text-emerald-400 font-bold">Month 2 Pot (-55 USDC)</td>
                      </tr>
                      <tr className="hover:bg-white/[0.02]">
                        <td className="py-2.5 pr-3 font-bold text-white">@asharao01 (Asha)</td>
                        <td className="py-2.5 px-3 text-emerald-400 font-bold">Month 3</td>
                        <td className="py-2.5 px-3 font-bold text-white">3,880 USDC</td>
                        <td className="py-2.5 px-3 text-neutral-300">3,875 USDC</td>
                        <td className="py-2.5 px-3 text-right text-emerald-400 font-bold">+5 USDC Gain</td>
                      </tr>
                      <tr className="hover:bg-white/[0.02]">
                        <td className="py-2.5 pr-3 font-bold text-white">@rohandas04 (Rohan)</td>
                        <td className="py-2.5 px-3 text-emerald-400 font-bold">Month 4</td>
                        <td className="py-2.5 px-3 font-bold text-white">4,000 USDC</td>
                        <td className="py-2.5 px-3 text-neutral-300">3,875 USDC</td>
                        <td className="py-2.5 px-3 text-right text-emerald-400 font-bold">+125 USDC Max Saver Gain</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/20 text-[11px] font-mono text-amber-200">
                  💡 <strong>Chit Fund Game Theory Verified:</strong> Early bidders (@vikramnair02) accept a small discount for immediate access to capital; patient savers (@rohandas04) receive the full 4,000 USDC pot while enjoying 125 USDC of accumulated monthly dividend discounts.
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  setShowSimModal(false);
                  setIsAutoPlaying(false);
                }}
                className="px-4 py-2 rounded-xl border border-white/10 bg-white/[0.02] text-neutral-300 hover:text-white text-xs font-semibold cursor-pointer"
              >
                Close Simulation
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowSimModal(false);
                  setIsAutoPlaying(false);
                  handleQuickDemoRun();
                }}
                className="px-4 py-2 rounded-xl bg-white text-black hover:bg-neutral-200 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>Apply Demo Result to Current Circle</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
