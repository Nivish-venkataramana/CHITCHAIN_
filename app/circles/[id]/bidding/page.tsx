"use client";

import { useState, useEffect, useMemo } from "react";
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
  FastForward,
  ChevronLeft,
  ChevronRight,
  Info,
} from "lucide-react";
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
  capacity?: number;
  durationMonths?: number;
  monthlyAmount?: string;
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
  discountPct: string;
  dividend: string;
  dividendPerMember: string;
  bids: Array<{
    username: string;
    displayName: string;
    wallet: string;
    amount: string;
    discountPct: string;
    isWinner: boolean;
    note?: string;
  }>;
}

// Default fallback demo participants
const DEFAULT_PARTICIPANTS = [
  { username: "asharao01", displayName: "Asha Rao", wallet: "0x1111111111111111111111111111111111111111" },
  { username: "vikramnair02", displayName: "Vikram Nair", wallet: "0x2222222222222222222222222222222222222222" },
  { username: "meerajoshi03", displayName: "Meera Joshi", wallet: "0x3333333333333333333333333333333333333333" },
  { username: "rohandas04", displayName: "Rohan Das", wallet: "0x4444444444444444444444444444444444444444" },
];

function parseUSDC(val: string | number | undefined | null): number {
  if (val === undefined || val === null) return 0;
  const s = String(val).replace(/,/g, "").trim();
  const n = parseFloat(s);
  if (isNaN(n)) return 0;
  // If value is represented in 6-decimal integer base units (>= 100,000 without decimal point)
  if (n >= 100_000 && !s.includes(".")) {
    return n / 1_000_000;
  }
  return n;
}

function formatUSDC(val: string | number | undefined | null): string {
  const num = typeof val === "number" ? val : parseUSDC(val);
  return num.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export default function BiddingModulePage() {
  const params = useParams();
  const circleId = params.id as string;
  const { user, setUser } = useDevUser();

  const [state, setState] = useState<BiddingState | null>(null);
  const [circleData, setCircleData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [bidAmount, setBidAmount] = useState<string>("3800");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Simulation Modal state
  const [showSimModal, setShowSimModal] = useState(false);
  const [selectedMonthTab, setSelectedMonthTab] = useState<number>(1);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);

  const loadData = async () => {
    try {
      const [bidRes, circleRes] = await Promise.all([
        fetch(`/api/circles/${circleId}/bidding`, {
          headers: user?.username ? { "x-dev-user": user.username } : undefined,
        }),
        fetch(`/api/circles/${circleId}`, {
          headers: user?.username ? { "x-dev-user": user.username } : undefined,
        }),
      ]);

      const bidData = await bidRes.json();
      if (bidData && !bidData.error) {
        setState(bidData);
      }

      const cData = await circleRes.json();
      if (cData && !cData.error) {
        setCircleData(cData);
      }
    } catch (err) {
      console.error("Error loading bidding or circle state:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [circleId, user?.username]);

  // Derive circle parameters
  const capacity = circleData?.numPeople || state?.capacity || 4;
  const durationMonths = circleData?.durationMonths || state?.durationMonths || 4;
  const rawMonthly = circleData?.monthlyAmount || state?.monthlyAmount || "1000";
  const monthlyAmountNum = parseUSDC(rawMonthly) || 1000;
  const totalPotNum = monthlyAmountNum * capacity;
  const floorBidNum = totalPotNum * 0.5;

  // Build participant list
  const activeParticipants: Array<{ username: string; displayName: string; wallet: string }> = useMemo(() => {
    if (circleData?.members && Array.isArray(circleData.members) && circleData.members.length > 0) {
      return circleData.members.map((m: any, idx: number) => {
        if (typeof m === "string") {
          const matched = DEFAULT_PARTICIPANTS[idx % DEFAULT_PARTICIPANTS.length];
          return {
            username: matched?.username || `member_${idx + 1}`,
            displayName: matched?.displayName || `Member ${idx + 1}`,
            wallet: m,
          };
        }
        return {
          username: m.username || `member_${idx + 1}`,
          displayName: m.displayName || m.username || `Member ${idx + 1}`,
          wallet: m.walletAddress || m.wallet || `0x${idx + 1}`,
        };
      });
    }
    return DEFAULT_PARTICIPANTS;
  }, [circleData]);

  // Set default bid amount when user changes or defaults load
  useEffect(() => {
    if (totalPotNum > 0) {
      const suggested = Math.round(totalPotNum * 0.95);
      setBidAmount(String(suggested));
    }
  }, [totalPotNum]);

  // Generate dynamic simulation across ALL duration months
  const dynamicSimulation: MonthSimulation[] = useMemo(() => {
    const sims: MonthSimulation[] = [];
    const pool = totalPotNum || 4000;
    const floor = floorBidNum || 2000;
    const totalMonths = Math.max(1, durationMonths || 4);
    const parts = [...activeParticipants];

    // Priority order for winners
    const winnerSequence = [...parts];

    for (let m = 1; m <= totalMonths; m++) {
      const winnerIdx = (m - 1) % winnerSequence.length;
      const roundWinner = winnerSequence[winnerIdx];

      // Discount percentages gradually step down as tenure matures
      // Month 1 has highest liquidity need (e.g. 5% discount), final month has 0% discount
      let discountRate = 0;
      if (totalMonths > 1) {
        discountRate = Math.max(0, ((totalMonths - m) / (totalMonths - 1)) * 0.05);
      }

      const winningBidVal = m === totalMonths ? pool : Math.round(pool * (1 - discountRate));
      const dividendTotal = Math.max(0, pool - winningBidVal);
      const divPerMember = dividendTotal / (parts.length || 1);

      const roundBids = parts.map((p, pIdx) => {
        const hasWonBefore = winnerSequence.slice(0, m - 1).some((w) => w.username === p.username);
        const isCurrentWinner = p.username === roundWinner.username;

        if (hasWonBefore) {
          return {
            username: p.username,
            displayName: p.displayName,
            wallet: `${p.wallet.slice(0, 6)}...${p.wallet.slice(-4)}`,
            amount: "—",
            discountPct: "0%",
            isWinner: false,
            note: "Past Winner (Contributes monthly share without bidding)",
          };
        }

        if (isCurrentWinner) {
          return {
            username: p.username,
            displayName: p.displayName,
            wallet: `${p.wallet.slice(0, 6)}...${p.wallet.slice(-4)}`,
            amount: formatUSDC(winningBidVal),
            discountPct: `${(discountRate * 100).toFixed(1)}%`,
            isWinner: true,
            note:
              m === totalMonths
                ? "Final Member — Receives 100% Full Pot (0% Discount)"
                : `Lowest Bid (${(discountRate * 100).toFixed(1)}% discount) — Awarded Month ${m} Pot`,
          };
        }

        // Other non-winning bidders bid higher (smaller discount)
        const competitorDiscount = Math.max(0, discountRate - 0.0125 * (pIdx + 1));
        const competitorBid = Math.round(pool * (1 - competitorDiscount));
        return {
          username: p.username,
          displayName: p.displayName,
          wallet: `${p.wallet.slice(0, 6)}...${p.wallet.slice(-4)}`,
          amount: formatUSDC(competitorBid),
          discountPct: `${(competitorDiscount * 100).toFixed(1)}%`,
          isWinner: false,
          note: `${(competitorDiscount * 100).toFixed(1)}% discount offered`,
        };
      });

      sims.push({
        month: m,
        potAmount: formatUSDC(pool),
        floorAmount: formatUSDC(floor),
        winnerUsername: roundWinner.username,
        winnerDisplayName: roundWinner.displayName,
        winnerWallet: roundWinner.wallet,
        winningBid: formatUSDC(winningBidVal),
        discountPct: `${(discountRate * 100).toFixed(1)}%`,
        dividend: formatUSDC(dividendTotal),
        dividendPerMember: formatUSDC(divPerMember),
        bids: roundBids,
      });
    }

    return sims;
  }, [totalPotNum, floorBidNum, durationMonths, activeParticipants]);

  // Realtime client validation
  useEffect(() => {
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

    if (num < floorBidNum) {
      setValidationError(`Bid amount must be at least 50% of the round pot (${formatUSDC(floorBidNum)} USDC).`);
      return;
    }

    if (num > totalPotNum) {
      setValidationError(`Bid amount cannot exceed the round pot (${formatUSDC(totalPotNum)} USDC).`);
      return;
    }

    setValidationError(null);
  }, [bidAmount, floorBidNum, totalPotNum]);

  // Auto-play timer for full simulation
  useEffect(() => {
    let timer: any;
    if (isAutoPlaying && showSimModal) {
      timer = setInterval(() => {
        setSelectedMonthTab((prev) => (prev >= durationMonths ? 1 : prev + 1));
      }, 2400);
    }
    return () => clearInterval(timer);
  }, [isAutoPlaying, showSimModal, durationMonths]);

  const userBid = state?.bids.find(
    (b) =>
      user &&
      (b.memberWallet.toLowerCase() === user.walletAddress.toLowerCase() ||
        b.memberUsername.toLowerCase() === user.username.toLowerCase())
  );

  const handleSwitchParticipant = (p: { username: string; displayName: string; wallet: string }) => {
    setUser({
      username: p.username,
      walletAddress: p.wallet as `0x${string}`,
      displayName: p.displayName,
      createdAt: new Date().toISOString(),
    });
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

      setSuccessMsg(`Secret bid of ${formatUSDC(bidAmount)} USDC cryptographically hashed & committed!`);
      loadData();
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

      setSuccessMsg(`Bid of ${formatUSDC(parsedAmount)} USDC verified and published onchain!`);
      loadData();
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
      loadData();
    } catch (err: any) {
      setError(err.message || "Failed to settle auction");
    } finally {
      setSubmitting(false);
    }
  };

  // Quick 1-Click Demo Auction Simulation for Month 1
  const handleQuickDemoRun = async () => {
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      for (const p of activeParticipants) {
        const salt = deriveDemoSalt(circleId, state?.cycle || 1, p.wallet);
        const target = Math.round(totalPotNum * 0.95);
        await fetch(`/api/circles/${circleId}/bidding/commit`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-dev-user": p.username,
            "x-dev-wallet": p.wallet,
          },
          body: JSON.stringify({ amount: String(target), salt }),
        });
      }

      for (const p of activeParticipants) {
        const salt = deriveDemoSalt(circleId, state?.cycle || 1, p.wallet);
        const target = Math.round(totalPotNum * 0.95);
        const baseUnits = BigInt(Math.round(target * 1_000_000)).toString();
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

      const settleRes = await fetch(`/api/circles/${circleId}/bidding/settle`, { method: "POST" });
      const settleData = await settleRes.json();
      if (!settleRes.ok) throw new Error(settleData.error || "Failed to settle demo run");

      setSuccessMsg(`🎉 1-Click Demo Auction Completed! Winner awarded pot with lowest bid.`);
      loadData();
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

  const committedCount = state?.bids.length || 0;
  const revealedCount = state?.bids.filter((b) => b.revealed).length || 0;
  const currentSimMonth = dynamicSimulation.find((m) => m.month === selectedMonthTab) || dynamicSimulation[0];

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
            onClick={() => {
              setSelectedMonthTab(1);
              setShowSimModal(true);
            }}
            className="px-3.5 py-1.5 rounded-xl border border-amber-500/50 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            title={`View Bidding of all ${durationMonths} months in circle`}
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span>Full {durationMonths}-Month Simulation</span>
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
                Commit and Reveal Scheme on Base Sepolia • {durationMonths}-Month Tenure
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
            PHASE: {state?.phase?.toUpperCase() || "COMMIT"}
          </span>
        </div>

        {/* Demo Account Switcher Bar */}
        <div className="p-3.5 rounded-2xl border border-white/10 bg-white/[0.02] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-400 font-semibold flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-amber-400" />
              <span>Select Active Participant ({activeParticipants.length} Members)</span>
            </span>
            <span className="text-[10px] font-mono text-neutral-400">
              Active: <strong className="text-white">@{user?.username || "none"}</strong>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {activeParticipants.map((p) => {
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="p-4 rounded-2xl bg-neutral-900/70 border border-white/10 space-y-1">
            <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-400 block font-semibold">
              Minimum Floor Bid (50%)
            </span>
            <span className="font-bold text-white text-xl font-mono block">
              {formatUSDC(floorBidNum)} <span className="text-xs text-neutral-400 font-normal">USDC</span>
            </span>
          </div>
          <div className="p-4 rounded-2xl bg-neutral-900/70 border border-white/10 space-y-1">
            <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-400 block font-semibold">
              Total Round Pot in Vault
            </span>
            <span className="font-bold text-white text-xl font-mono block">
              {formatUSDC(totalPotNum)} <span className="text-xs text-neutral-400 font-normal">USDC</span>
            </span>
          </div>
          <div className="p-4 rounded-2xl bg-neutral-900/70 border border-white/10 space-y-1">
            <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-400 block font-semibold">
              Monthly / Member
            </span>
            <span className="font-bold text-white text-xl font-mono block">
              {formatUSDC(monthlyAmountNum)} <span className="text-xs text-neutral-400 font-normal">USDC</span>
            </span>
          </div>
        </div>

        {/* Phase 1: Commit Phase */}
        {(!state || state.phase === "Commit") && (
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
                    Bid Amount for @{user?.username || "participant"} (Min: {formatUSDC(floorBidNum)} USDC)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      placeholder={String(Math.round(totalPotNum * 0.95))}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.03] pl-4 pr-16 py-3 text-sm text-white focus:outline-none focus:border-white/30 font-mono transition-colors"
                    />
                    <span className="absolute right-4 top-3 text-xs font-bold text-neutral-400">USDC</span>
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
                  <span>
                    Progress: {committedCount} of {activeParticipants.length} members committed
                  </span>
                  <span>
                    {activeParticipants.length - committedCount > 0
                      ? `Waiting for ${activeParticipants.length - committedCount} member(s)`
                      : "Ready for Reveal"}
                  </span>
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
                <span>
                  {submitting
                    ? "Recovering Salt & Verifying..."
                    : `1-Click Reveal for @${user?.username || "participant"}`}
                </span>
              </button>
            ) : (
              <div className="p-3.5 bg-emerald-950/40 border border-emerald-800/40 rounded-xl text-xs text-emerald-300 font-semibold flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>Bid for @{user?.username} revealed & verified onchain</span>
                </div>
                <span className="font-mono text-white font-bold">{formatUSDC(userBid.amount!)} USDC</span>
              </div>
            )}

            {/* Revealed Bids Board */}
            <div className="p-3.5 rounded-xl border border-white/10 bg-white/[0.02] space-y-2">
              <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-400 block font-semibold">
                Auction Reveal Board ({revealedCount} of {activeParticipants.length})
              </span>
              <div className="space-y-1.5">
                {activeParticipants.map((p) => {
                  const b = state.bids.find((item) => item.memberWallet.toLowerCase() === p.wallet.toLowerCase());
                  return (
                    <div
                      key={p.username}
                      className="flex items-center justify-between text-xs font-mono py-1 border-b border-white/5 last:border-0"
                    >
                      <span className="text-neutral-300">
                        @{p.username} ({p.displayName})
                      </span>
                      {b?.revealed ? (
                        <span className="text-emerald-400 font-bold">{formatUSDC(b.amount!)} USDC</span>
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
                <span className="text-neutral-400 block uppercase tracking-wider text-[10px] font-mono">
                  Winning Member
                </span>
                <span className="font-bold text-emerald-400 text-base block font-mono">
                  @{state.winner.username}
                </span>
                <span className="font-mono text-[10px] text-neutral-500">
                  {state.winner.wallet.slice(0, 8)}...{state.winner.wallet.slice(-6)}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-neutral-400 block uppercase tracking-wider text-[10px] font-mono">
                  Winning Payout Pot
                </span>
                <span className="font-bold text-white text-base block font-mono">
                  {formatUSDC(state.winner.amount)} USDC
                </span>
                <span className="text-[11px] text-amber-400 font-medium font-mono block">
                  +{formatUSDC(state.winner.dividend)} USDC Carried as Dividend
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
      {/* Whole New Interactive Full Circle Timeperiod Simulation Modal */}
      {/* ========================================================================= */}
      {showSimModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-3xl max-h-[92vh] rounded-3xl border border-white/15 bg-neutral-950 p-5 sm:p-7 shadow-2xl overflow-y-auto space-y-5 text-neutral-100 relative">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                    {durationMonths}-Month Circle Auction Simulation
                  </h2>
                  <p className="text-xs text-neutral-400">
                    Full Tenure Bidding Engine: Lowest Discount Bid Winner & Monthly Dividend Distribution
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

            {/* Timeline Scrubber */}
            <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400">
                <span>Circle Timeline Progress</span>
                <span className="text-amber-400 font-bold">
                  {selectedMonthTab === 999 ? "Complete Ledger Summary" : `Month ${selectedMonthTab} of ${durationMonths}`}
                </span>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-1.5">
                {dynamicSimulation.map((sim) => {
                  const isSelected = selectedMonthTab === sim.month;
                  return (
                    <button
                      key={sim.month}
                      type="button"
                      onClick={() => {
                        setSelectedMonthTab(sim.month);
                        setIsAutoPlaying(false);
                      }}
                      className={`p-2 rounded-xl text-center border transition-all cursor-pointer ${
                        isSelected
                          ? "border-amber-500 bg-amber-500/20 text-amber-300 font-bold shadow-md shadow-amber-500/10"
                          : "border-white/5 bg-white/[0.02] text-neutral-400 hover:border-white/20 hover:text-white"
                      }`}
                    >
                      <div className="text-[10px] uppercase font-mono">M{sim.month}</div>
                      <div className="text-[9px] truncate font-bold text-white">@{sim.winnerUsername}</div>
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMonthTab(999);
                    setIsAutoPlaying(false);
                  }}
                  className={`p-2 rounded-xl text-center border transition-all cursor-pointer ${
                    selectedMonthTab === 999
                      ? "border-emerald-500 bg-emerald-500/20 text-emerald-300 font-bold"
                      : "border-white/5 bg-white/[0.02] text-neutral-400 hover:border-white/20 hover:text-white"
                  }`}
                >
                  <div className="text-[10px] uppercase font-mono">Summary</div>
                  <div className="text-[9px] truncate font-bold text-white">Ledger</div>
                </button>
              </div>
            </div>

            {/* Playback Controls & Month Navigation */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedMonthTab((prev) => (prev <= 1 ? durationMonths : prev - 1))}
                  className="p-2 rounded-xl border border-white/10 bg-white/[0.02] text-neutral-300 hover:text-white hover:bg-white/5 cursor-pointer text-xs flex items-center gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Prev</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMonthTab((prev) => (prev >= durationMonths ? 1 : prev + 1))}
                  className="p-2 rounded-xl border border-white/10 bg-white/[0.02] text-neutral-300 hover:text-white hover:bg-white/5 cursor-pointer text-xs flex items-center gap-1"
                >
                  <span>Next</span>
                  <ChevronRight className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMonthTab(999)}
                  className="px-3 py-2 rounded-xl border border-white/10 bg-white/[0.02] text-neutral-300 hover:text-white hover:bg-white/5 cursor-pointer text-xs flex items-center gap-1"
                >
                  <Trophy className="h-3.5 w-3.5 text-amber-400" />
                  <span>View Ledger</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                className={`px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  isAutoPlaying
                    ? "border-amber-500 bg-amber-500/20 text-amber-300"
                    : "border-white/10 bg-white/[0.02] text-neutral-300 hover:text-white"
                }`}
              >
                <Play className={`h-3.5 w-3.5 ${isAutoPlaying ? "animate-spin" : "fill-current"}`} />
                <span>{isAutoPlaying ? "Auto-Playing Timeline..." : "Auto-Play Full Simulation"}</span>
              </button>
            </div>

            {/* Content for Individual Month (Months 1 to durationMonths) */}
            {selectedMonthTab <= durationMonths && (
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
                        Awarded Payout Pot: <strong className="text-emerald-300">{currentSimMonth.winningBid} USDC</strong>{" "}
                        ({currentSimMonth.discountPct} discount)
                      </p>
                    </div>
                  </div>

                  <div className="text-right sm:border-l sm:border-emerald-500/20 sm:pl-4">
                    <span className="text-[10px] font-mono uppercase text-neutral-400 block">Round Benefit</span>
                    <span className="text-xs font-mono text-amber-300 font-bold">
                      +{currentSimMonth.dividend} USDC Distributed as Dividends
                    </span>
                  </div>
                </div>

                {/* All Participant Bids for this Month */}
                <div className="p-4 rounded-2xl border border-white/10 bg-white/[0.02] space-y-3">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <span className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-neutral-400" />
                      <span>Participant Bids in Month {currentSimMonth.month}</span>
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

            {/* Complete Ledger Summary Table (Tab 999) */}
            {selectedMonthTab === 999 && (
              <div className="p-4 rounded-2xl border border-white/10 bg-white/[0.02] space-y-4">
                <div className="border-b border-white/10 pb-2 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white font-mono flex items-center gap-1.5">
                    <Trophy className="h-4 w-4 text-amber-400" />
                    <span>Complete {durationMonths}-Month Circle Settlement Ledger</span>
                  </h3>
                  <span className="text-[10px] font-mono text-neutral-400">
                    Total Volume: {formatUSDC(totalPotNum * durationMonths)} USDC
                  </span>
                </div>

                <div className="overflow-x-auto no-scrollbar">
                  <table className="w-full text-xs font-mono text-left">
                    <thead>
                      <tr className="border-b border-white/10 text-[10px] uppercase text-neutral-400 tracking-wider">
                        <th className="py-2 pr-3">Participant</th>
                        <th className="py-2 px-3">Month Won</th>
                        <th className="py-2 px-3">Winning Pot</th>
                        <th className="py-2 px-3">Gross Contribution</th>
                        <th className="py-2 px-3 text-right">Net Financial Position</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {dynamicSimulation.map((sim) => {
                        const grossPaid = monthlyAmountNum * durationMonths;
                        return (
                          <tr key={sim.month} className="hover:bg-white/[0.02]">
                            <td className="py-2.5 pr-3 font-bold text-white">
                              @{sim.winnerUsername} ({sim.winnerDisplayName})
                            </td>
                            <td className="py-2.5 px-3 text-emerald-400 font-bold">Month {sim.month}</td>
                            <td className="py-2.5 px-3 font-bold text-white">{sim.winningBid} USDC</td>
                            <td className="py-2.5 px-3 text-neutral-300">{formatUSDC(grossPaid)} USDC</td>
                            <td className="py-2.5 px-3 text-right text-emerald-400 font-bold">
                              {sim.month === durationMonths
                                ? `+${formatUSDC(monthlyAmountNum * 0.15 * (durationMonths - 1))} USDC Max Saver Gain`
                                : sim.month === 1
                                ? "Instant Liquidity Advantage"
                                : `Month ${sim.month} Liquidity Advantage`}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/20 text-[11px] font-mono text-amber-200">
                  💡 <strong>Chit Fund Game Theory Verified:</strong> Early bidders receive fast circle liquidity at a minor discount; late savers receive the 100% full pot with zero discount and accumulate all monthly dividend discounts.
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
