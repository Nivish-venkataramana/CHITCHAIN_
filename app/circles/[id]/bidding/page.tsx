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

      // Save locally for 1-Click Reveal
      localStorage.setItem(`chitchain_bid_${circleId}_${user.username}`, bidAmount);
      setSuccessMsg("Secret bid hashed and committed on-chain!");
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

      setSuccessMsg("Bid revealed and published!");
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

      setSuccessMsg("Auction settled! Winner paid on-chain and dividend carried.");
      loadBiddingState();
    } catch (err: any) {
      setError(err.message || "Failed to settle auction");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-sm text-slate-500 bg-white rounded-2xl border">
        Loading bidding auction...
      </div>
    );
  }

  const poolUSDC = state ? fromBaseUnits(state.totalPool) : "4000";
  const floorUSDC = state ? fromBaseUnits(state.floorBid) : "2000";

  return (
    <div className="max-w-3xl mx-auto py-6 space-y-6">
      <Link
        href={`/circles/${circleId}`}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to circle
      </Link>

      <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
              <Lock className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Secret Bidding Auction</h1>
              <p className="text-xs text-slate-500">
                Commit-Reveal Keccak256 Auction on Base Sepolia
              </p>
            </div>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold ${
              state?.phase === "Settled"
                ? "bg-emerald-100 text-emerald-800"
                : state?.phase === "Reveal"
                ? "bg-amber-100 text-amber-800"
                : "bg-purple-100 text-purple-800"
            }`}
          >
            Phase: {state?.phase}
          </span>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Bidding Rules Info */}
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-50 border">
            <span className="text-slate-500 block">Floor Bid (50% of Pool):</span>
            <span className="font-bold text-slate-800 text-base mt-0.5 block">{floorUSDC} USDC</span>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border">
            <span className="text-slate-500 block">Total Pool in Vault:</span>
            <span className="font-bold text-slate-800 text-base mt-0.5 block">{poolUSDC} USDC</span>
          </div>
        </div>

        {/* Dynamic State Stages */}
        {state?.phase === "Commit" && (
          <div className="rounded-2xl border p-6 bg-purple-50/40 space-y-4">
            <h3 className="text-sm font-bold text-purple-950 flex items-center gap-2">
              <Lock className="h-4 w-4 text-purple-600" />
              Commit Your Secret Bid
            </h3>
            <p className="text-xs text-slate-600">
              Enter the payout amount you would accept. Your bid remains cryptographically hidden until the reveal phase.
            </p>

            {!userBid ? (
              <div className="space-y-3">
                <div className="relative">
                  <input
                    type="number"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    placeholder="3800"
                    className="w-full rounded-xl border pl-4 pr-16 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                  />
                  <span className="absolute right-4 top-2.5 text-xs font-bold text-slate-400">
                    USDC
                  </span>
                </div>
                <button
                  onClick={handleCommit}
                  disabled={submitting}
                  className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow transition-colors cursor-pointer"
                >
                  {submitting ? "Hashing & Committing..." : "Hash & Commit Secret Bid"}
                </button>
              </div>
            ) : (
              <div className="p-4 bg-white rounded-xl border space-y-2 text-xs">
                <div className="flex items-center gap-2 text-emerald-700 font-bold">
                  <CheckCircle2 className="h-4 w-4" />
                  Your bid has been committed for Cycle {state.cycle}!
                </div>
                <p className="text-[11px] font-mono text-slate-400 break-all">
                  Commitment: {userBid.commitment}
                </p>
                <p className="text-xs text-slate-500">
                  {state.bids.length} of 4 members committed. Waiting for all members before reveal opens.
                </p>
              </div>
            )}
          </div>
        )}

        {state?.phase === "Reveal" && (
          <div className="rounded-2xl border p-6 bg-amber-50/50 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-amber-950 flex items-center gap-2">
                <Unlock className="h-4 w-4 text-amber-600" />
                1-Click Reveal (DEMO_MODE=true)
              </h3>
              <span className="text-xs text-slate-500 font-semibold">
                {state.bids.filter((b) => b.revealed).length} of {state.bids.length} Revealed
              </span>
            </div>

            <p className="text-xs text-amber-900 leading-relaxed">
              ⚠️ <strong>Important</strong>: Bids must be revealed to be eligible for payout. Unrevealed bids are discarded during settlement.
            </p>

            {!userBid?.revealed ? (
              <button
                onClick={handle1ClickReveal}
                disabled={submitting}
                className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="h-4 w-4" />
                {submitting ? "Re-deriving Salt..." : "1-Click Reveal (Re-derive Salt & Reveal Bid)"}
              </button>
            ) : (
              <div className="p-3 bg-white rounded-xl border text-xs text-emerald-800 font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Your bid of {fromBaseUnits(userBid.amount!)} USDC has been revealed!
              </div>
            )}

            <div className="border-t pt-3">
              <button
                onClick={handleSettle}
                disabled={submitting}
                className="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow cursor-pointer"
              >
                Settle Auction Pot →
              </button>
            </div>
          </div>
        )}

        {state?.phase === "Settled" && state.winner && (
          <div className="rounded-2xl border p-6 bg-emerald-50 space-y-4">
            <h3 className="text-base font-bold text-emerald-950 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-emerald-600" />
              Auction Settled: Winner Selected &amp; Paid
            </h3>

            <div className="grid grid-cols-2 gap-4 bg-white rounded-xl p-4 border text-xs">
              <div>
                <span className="text-slate-500 block">Winning Member:</span>
                <span className="font-bold text-emerald-700 text-sm mt-0.5 block">
                  @{state.winner.username}
                </span>
                <span className="font-mono text-[10px] text-slate-400">
                  {state.winner.wallet.slice(0, 8)}...{state.winner.wallet.slice(-6)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Winning Bid (Lowest Valid):</span>
                <span className="font-bold text-emerald-700 text-sm mt-0.5 block">
                  {fromBaseUnits(state.winner.amount)} USDC
                </span>
                <span className="text-[10px] text-blue-600 font-medium">
                  + {fromBaseUnits(state.winner.dividend)} USDC Carried to Month 2
                </span>
              </div>
            </div>

            <Link
              href={`/circles/${circleId}/pool`}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 hover:text-emerald-950"
            >
              View Month 2 Pool in Vault →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
