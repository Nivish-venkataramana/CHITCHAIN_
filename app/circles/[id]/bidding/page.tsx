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
  AlertCircle,
  CheckCircle2,
  Coins,
  ArrowRight,
  Eye,
} from "lucide-react";
import { fromBaseUnits } from "@/lib/validation";
import { deriveDemoSalt } from "@/lib/bidding-store";

interface BidInfo {
  memberWallet: string;
  memberUsername: string;
  commitment: string;
  amount?: string;
  salt?: string;
  revealed: boolean;
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

export default function BiddingModulePage() {
  const params = useParams();
  const circleId = params.id as string;
  const { user } = useDevUser();

  const [state, setState] = useState<BiddingState | null>(null);
  const [loading, setLoading] = useState(true);
  const [bidAmount, setBidAmount] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadBiddingState = () => {
    fetch(`/api/circles/${circleId}/bidding`)
      .then((r) => r.json())
      .then((data) => {
        if (data && !data.error) setState(data);
      })
      .catch((err) => console.error("Error loading bidding state:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadBiddingState();
  }, [circleId]);

  const userBid = state?.bids.find(
    (b) => user && b.memberWallet.toLowerCase() === user.walletAddress.toLowerCase()
  );

  const handleCommit = async () => {
    if (!user) return;
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/circles/${circleId}/bidding/commit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-dev-user": user.username,
        },
        body: JSON.stringify({ amount: bidAmount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to commit bid");

      localStorage.setItem(`chitchain_bid_${circleId}_${user.username}`, bidAmount);
      setSuccessMsg("Secret bid hashed and committed to Base Sepolia vault");
      loadBiddingState();
    } catch (err: any) {
      setError(err.message || "Failed to commit bid");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReveal = async () => {
    if (!user) return;
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const stored = localStorage.getItem(`chitchain_bid_${circleId}_${user.username}`) || userBid?.amount || "3800";
      const salt = deriveDemoSalt(user.walletAddress, 1);

      const res = await fetch(`/api/circles/${circleId}/bidding/reveal`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-dev-user": user.username,
        },
        body: JSON.stringify({
          amount: stored,
          salt: salt,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reveal bid");

      setSuccessMsg("1-Click Reveal verified onchain! Bid revealed successfully.");
      loadBiddingState();
    } catch (err: any) {
      setError(err.message || "Failed to reveal bid");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSettle = async () => {
    if (!user) return;
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/circles/${circleId}/bidding/settle`, {
        method: "POST",
        headers: { "x-dev-user": user.username },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to settle round");

      setSuccessMsg(`Round settled! Winner is @${data.winner.username} taking ${fromBaseUnits(data.winner.amount)} USDC`);
      loadBiddingState();
    } catch (err: any) {
      setError(err.message || "Failed to settle round");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="p-8 text-center text-xs font-mono text-neutral-400 rounded-3xl border border-white/10 bg-transparent">
          Loading sealed auction...
        </div>
      </div>
    );
  }

  const poolFormatted = state ? fromBaseUnits(state.totalPool) : "0";
  const floorFormatted = state ? fromBaseUnits(state.floorBid) : "0";

  return (
    <div className="w-full max-w-5xl mx-auto px-2 sm:px-4 flex flex-col justify-between h-[calc(100vh-5.5rem)] max-h-[calc(100vh-5.5rem)] text-neutral-100 gap-3">
      {/* Top Bar */}
      <div className="flex items-center justify-between shrink-0">
        <Link
          href={`/circles/${circleId}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Return to Circle</span>
        </Link>
      </div>

      {/* Header Banner */}
      <div className="rounded-2xl border border-white/10 bg-transparent p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 shadow-lg">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Confidential Bidding</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider border border-white/20 text-neutral-200">
              Phase: {state?.phase}
            </span>
          </div>
          <p className="text-[11px] text-neutral-400">
            Commit-Reveal Sealed Bid Auction on Base Sepolia
          </p>
        </div>

        {/* Global Action */}
        <div className="flex items-center gap-2">
          {state?.phase === "Reveal" && (
            <button
              onClick={handleSettle}
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-white text-black font-semibold text-xs hover:bg-neutral-200 transition-colors shadow-md cursor-pointer"
            >
              <span>{submitting ? "Settling..." : "Settle Winner"}</span>
            </button>
          )}

          {state?.phase === "Settled" && (
            <Link
              href={`/circles/${circleId}/pool`}
              className="px-4 py-2 rounded-xl bg-white text-black font-semibold text-xs flex items-center gap-1.5 hover:bg-neutral-200 transition-colors shadow-md"
            >
              <Coins className="h-3.5 w-3.5" />
              <span>View Updated Ledger</span>
            </Link>
          )}
        </div>
      </div>

      {/* Symmetrical Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
        <div className="rounded-2xl border border-white/10 bg-transparent p-2.5 sm:p-3 text-center space-y-0.5 shadow-sm">
          <span className="text-[10px] uppercase tracking-wider text-neutral-400 block font-semibold">Total Pot Pool</span>
          <p className="text-base sm:text-lg font-bold text-white font-mono">{Number(poolFormatted).toLocaleString()} USDC</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-transparent p-2.5 sm:p-3 text-center space-y-0.5 shadow-sm">
          <span className="text-[10px] uppercase tracking-wider text-neutral-400 block font-semibold">Minimum Floor Bid</span>
          <p className="text-base sm:text-lg font-bold text-white font-mono">{Number(floorFormatted).toLocaleString()} USDC</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-transparent p-2.5 sm:p-3 text-center space-y-0.5 shadow-sm">
          <span className="text-[10px] uppercase tracking-wider text-neutral-400 block font-semibold">Round Cycle</span>
          <p className="text-base sm:text-lg font-bold text-white font-mono">Cycle {state?.cycle || 1}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-transparent p-2.5 sm:p-3 text-center space-y-0.5 shadow-sm">
          <span className="text-[10px] uppercase tracking-wider text-neutral-400 block font-semibold">Status</span>
          <p className="text-base sm:text-lg font-bold text-white font-mono">{state?.phase}</p>
        </div>
      </div>

      {error && (
        <div className="p-2.5 rounded-xl border border-red-900/60 bg-red-950/40 text-red-300 text-xs flex items-center gap-2 shrink-0">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-2.5 rounded-xl border border-emerald-900/60 bg-emerald-950/40 text-emerald-300 text-xs flex items-center gap-2 shrink-0">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Symmetrical 2-Column Area */}
      <div className="grid md:grid-cols-2 gap-3.5 flex-1 min-h-0">
        {/* Left Column: Your Secret Bid */}
        <div className="rounded-2xl border border-white/10 bg-transparent p-4 flex flex-col justify-between h-full min-h-0 shadow-xl space-y-3">
          <div className="space-y-3">
            <div className="border-b border-white/10 pb-2.5">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Lock className="h-4 w-4 text-neutral-300" />
                <span>Your Confidential Bid</span>
              </h2>
              <p className="text-[11px] text-neutral-400 mt-0.5">Lowest bid wins pot; remainder distributed as dividend</p>
            </div>

            {state?.phase === "Commit" && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-neutral-300">
                    Bid Amount (USDC)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="Enter bid e.g. 3800"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value.replace(/\D/g, ""))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-white/10 bg-white/[0.03] text-white focus:outline-none focus:border-white/30 font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
                <p className="text-[10px] text-neutral-400 font-mono">
                  Floor rule: Min {Number(floorFormatted).toLocaleString()} USDC (50% max discount).
                </p>
              </div>
            )}

            {state?.phase === "Reveal" && (
              <div className="p-3 rounded-xl border border-white/10 bg-white/[0.02] space-y-2">
                <p className="text-xs font-semibold text-white">Reveal Phase Active</p>
                <p className="text-[11px] text-neutral-300 font-mono leading-relaxed">
                  Reveal your secret salt to verify your commitment hash onchain.
                </p>
              </div>
            )}

            {state?.phase === "Settled" && state.winner && (
              <div className="p-3 rounded-xl border border-emerald-500/40 bg-emerald-950/20 space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
                  <Trophy className="h-4 w-4" />
                  <span>Winner: @{state.winner.username}</span>
                </div>
                <p className="text-[11px] text-emerald-200 font-mono">
                  Payout: {fromBaseUnits(state.winner.amount)} USDC • Dividend: {fromBaseUnits(state.winner.dividend)} USDC
                </p>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-white/10">
            {state?.phase === "Commit" && (
              <button
                onClick={handleCommit}
                disabled={submitting || !bidAmount.trim()}
                className="w-full py-2.5 rounded-xl bg-white text-black font-semibold text-xs hover:bg-neutral-200 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
              >
                <span>{submitting ? "Hashing..." : userBid ? "Update Secret Bid" : "Commit Secret Bid"}</span>
              </button>
            )}

            {state?.phase === "Reveal" && (
              <button
                onClick={handleReveal}
                disabled={submitting}
                className="w-full py-2.5 rounded-xl bg-white text-black font-semibold text-xs hover:bg-neutral-200 transition-colors shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Eye className="h-3.5 w-3.5" />
                <span>{submitting ? "Verifying..." : "1-Click Reveal Salt"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Participant Commitment Hashes */}
        <div className="rounded-2xl border border-white/10 bg-transparent p-4 flex flex-col h-full min-h-0 shadow-xl space-y-3">
          <div className="border-b border-white/10 pb-2.5 shrink-0">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Coins className="h-4 w-4 text-neutral-300" />
              <span>Participant Sealed Commitments</span>
            </h3>
            <p className="text-[11px] text-neutral-400 mt-0.5">Real-time onchain hash verification</p>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-2 pr-1">
            {state?.bids.map((b) => (
              <div
                key={b.memberWallet}
                className="p-2.5 rounded-xl border border-white/10 bg-white/[0.02] flex items-center justify-between text-xs hover:border-white/20 transition-colors"
              >
                <div className="space-y-0.5">
                  <span className="font-semibold text-white text-xs block">@{b.memberUsername}</span>
                  <p className="text-[10px] font-mono text-neutral-400 truncate max-w-[200px]">
                    {b.commitment.slice(0, 16)}...
                  </p>
                </div>

                <div>
                  {b.revealed ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono border border-emerald-500/40 text-emerald-400 bg-emerald-950/20">
                      {fromBaseUnits(b.amount || "0")} USDC
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono border border-neutral-700 text-neutral-400 bg-neutral-900/20">
                      Sealed
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
