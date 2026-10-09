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
  const [bidAmount, setBidAmount] = useState<string>("3800");
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
      setSuccessMsg("Secret bid committed.");
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
      const savedBid = localStorage.getItem(`chitchain_bid_${circleId}_${user.username}`) || bidAmount;
      const baseUnits = BigInt(Math.round(parseFloat(savedBid) * 1_000_000)).toString();
      const salt = deriveDemoSalt(circleId, state?.cycle || 1, user.walletAddress);

      const res = await fetch(`/api/circles/${circleId}/bidding/reveal`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-dev-user": user.username,
        },
        body: JSON.stringify({ amountBaseUnits: baseUnits, salt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reveal bid");

      setSuccessMsg("Bid revealed.");
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
    try {
      const res = await fetch(`/api/circles/${circleId}/bidding/settle`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to settle auction");

      setSuccessMsg("Auction settled. Winner paid and dividend carried.");
      loadBiddingState();
    } catch (err: any) {
      setError(err.message || "Failed to settle auction");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-sm text-neutral-500 glass-panel rounded-3xl">
        Loading auction...
      </div>
    );
  }

  const poolUSDC = state ? fromBaseUnits(state.totalPool) : "4000";
  const floorUSDC = state ? fromBaseUnits(state.floorBid) : "2000";

  return (
    <div className="max-w-3xl mx-auto py-8 space-y-8">
      <Link
        href={`/circles/${circleId}`}
        className="inline-flex items-center gap-2 text-xs text-neutral-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to circle
      </Link>

      <div className="rounded-3xl glass-panel-glow p-8 space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-2xl">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Secret Bidding</h1>
              <p className="text-xs text-neutral-400">
                Commit-Reveal Auction
              </p>
            </div>
          </div>
          <span
            className={`px-3.5 py-1 rounded-full text-xs font-medium border ${
              state?.phase === "Settled"
                ? "bg-emerald-950/40 text-emerald-300 border-emerald-500/30"
                : state?.phase === "Reveal"
                ? "bg-amber-950/40 text-amber-300 border-amber-500/30"
                : "bg-neutral-800 text-neutral-300 border-white/10"
            }`}
          >
            Phase: {state?.phase}
          </span>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Rules */}
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5">
            <span className="text-neutral-500 block text-[11px]">Floor Bid (50%):</span>
            <span className="font-bold text-white text-base mt-1 block">{floorUSDC} USDC</span>
          </div>
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5">
            <span className="text-neutral-500 block text-[11px]">Total Pool:</span>
            <span className="font-bold text-white text-base mt-1 block">{poolUSDC} USDC</span>
          </div>
        </div>

        {/* Stages */}
        {state?.phase === "Commit" && (
          <div className="rounded-2xl border border-white/10 p-6 bg-white/[0.02] space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Lock className="h-4 w-4 text-emerald-400" />
              Commit Secret Bid
            </h3>

            {!userBid ? (
              <div className="space-y-4">
                <div className="relative">
                  <input
                    type="number"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    placeholder="3800"
                    className="w-full rounded-xl glass-input pl-4 pr-16 py-3 text-sm focus:outline-none"
                  />
                  <span className="absolute right-4 top-3.5 text-xs font-semibold text-neutral-500">
                    USDC
                  </span>
                </div>
                <button
                  onClick={handleCommit}
                  disabled={submitting}
                  className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all cursor-pointer"
                >
                  {submitting ? "Committing..." : "Commit Secret Bid"}
                </button>
              </div>
            ) : (
              <div className="p-5 bg-emerald-950/20 rounded-xl border border-emerald-500/20 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-emerald-300 font-semibold">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  Your bid is committed.
                </div>
                <p className="text-[11px] font-mono text-neutral-500 break-all">
                  Commitment: {userBid.commitment}
                </p>
                <p className="text-neutral-400 text-[11px]">
                  {state.bids.length} of 4 members committed.
                </p>
              </div>
            )}
          </div>
        )}

        {state?.phase === "Reveal" && (
          <div className="rounded-2xl border border-amber-500/30 p-6 bg-amber-950/10 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Unlock className="h-4 w-4 text-amber-400" />
                Reveal Phase
              </h3>
              <span className="text-xs text-neutral-400">
                {state.bids.filter((b) => b.revealed).length} / {state.bids.length} Revealed
              </span>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              Unrevealed bids are discarded during settlement.
            </p>

            {!userBid?.revealed ? (
              <button
                onClick={handle1ClickReveal}
                disabled={submitting}
                className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs shadow transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="h-4 w-4" />
                {submitting ? "Revealing..." : "Reveal Secret Bid"}
              </button>
            ) : (
              <div className="p-4 bg-emerald-950/20 rounded-xl border border-emerald-500/20 text-xs text-emerald-300 font-medium flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Revealed: {fromBaseUnits(userBid.amount!)} USDC
              </div>
            )}

            <div className="border-t border-white/10 pt-4">
              <button
                onClick={handleSettle}
                disabled={submitting}
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs shadow transition-colors"
              >
                Settle Auction →
              </button>
            </div>
          </div>
        )}

        {state?.phase === "Settled" && state.winner && (
          <div className="rounded-2xl border border-emerald-500/30 p-6 bg-emerald-950/20 space-y-4">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Trophy className="h-5 w-5 text-emerald-400" />
              Auction Settled
            </h3>

            <div className="grid grid-cols-2 gap-4 bg-black/40 rounded-xl p-5 border border-white/5 text-xs">
              <div>
                <span className="text-neutral-500 block">Winner:</span>
                <span className="font-semibold text-emerald-400 text-sm mt-0.5 block">
                  @{state.winner.username}
                </span>
                <span className="font-mono text-[10px] text-neutral-500">
                  {state.winner.wallet.slice(0, 6)}...{state.winner.wallet.slice(-4)}
                </span>
              </div>
              <div>
                <span className="text-neutral-500 block">Winning Payout:</span>
                <span className="font-semibold text-emerald-400 text-sm mt-0.5 block">
                  {fromBaseUnits(state.winner.amount)} USDC
                </span>
                <span className="text-[11px] text-neutral-400">
                  + {fromBaseUnits(state.winner.dividend)} USDC Dividend Carried
                </span>
              </div>
            </div>

            <Link
              href={`/circles/${circleId}/pool`}
              className="inline-block text-xs font-semibold text-emerald-400 hover:text-emerald-300"
            >
              View Next Month Pool →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
