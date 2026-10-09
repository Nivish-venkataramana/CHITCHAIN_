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

      // Save locally for 1 Click Reveal
      localStorage.setItem(`chitchain_bid_${circleId}_${user.username}`, bidAmount);
      setSuccessMsg("Secret bid hashed and committed to Base Sepolia vault");
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

      setSuccessMsg("Bid revealed and verified onchain");
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

      setSuccessMsg("Auction settled! Winner paid onchain and dividend carried.");
      loadBiddingState();
    } catch (err: any) {
      setError(err.message || "Failed to settle auction");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-sm text-neutral-500 bg-neutral-950 rounded-3xl border border-neutral-900">
        Loading confidential bidding auction...
      </div>
    );
  }

  const poolUSDC = state ? fromBaseUnits(state.totalPool) : "4000";
  const floorUSDC = state ? fromBaseUnits(state.floorBid) : "2000";

  return (
    <div className="max-w-4xl mx-auto py-8 px-6 space-y-8 text-neutral-100">
      <Link
        href={`/circles/${circleId}`}
        className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Return to Circle</span>
      </Link>

      <div className="rounded-3xl border border-neutral-900 bg-neutral-950 p-8 shadow-2xl space-y-8 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-900 pb-6">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-red-600/10 border border-red-600/20 text-red-400 rounded-2xl">
              <Lock className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Confidential Sealed Auction</h1>
              <p className="text-xs text-neutral-400 mt-0.5">
                Commit and Reveal Scheme on Base Sepolia
              </p>
            </div>
          </div>
          <span
            className={`px-4 py-1.5 rounded-full text-xs font-bold font-mono uppercase tracking-wider ${
              state?.phase === "Settled"
                ? "bg-emerald-950 text-emerald-300 border border-emerald-800/60"
                : state?.phase === "Reveal"
                ? "bg-amber-950 text-amber-300 border border-amber-800/60"
                : "bg-red-950 text-red-300 border border-red-800/60"
            }`}
          >
            Phase: {state?.phase}
          </span>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-red-950/60 border border-red-800/50 text-red-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-800/50 text-emerald-300 text-xs flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Bidding Rules Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-6 rounded-2xl bg-neutral-900/80 border border-neutral-800 space-y-1">
            <span className="text-[11px] uppercase tracking-wider text-neutral-400 block font-semibold">Minimum Floor Bid (50%)</span>
            <span className="font-bold text-white text-2xl font-mono block mt-1">{floorUSDC} <span className="text-xs text-neutral-400 font-normal">USDC</span></span>
          </div>
          <div className="p-6 rounded-2xl bg-neutral-900/80 border border-neutral-800 space-y-1">
            <span className="text-[11px] uppercase tracking-wider text-neutral-400 block font-semibold">Total Round Pot in Vault</span>
            <span className="font-bold text-white text-2xl font-mono block mt-1">{poolUSDC} <span className="text-xs text-neutral-400 font-normal">USDC</span></span>
          </div>
        </div>

        {/* Dynamic State Stages */}
        {state?.phase === "Commit" && (
          <div className="rounded-3xl border border-neutral-900 bg-neutral-900/40 p-8 space-y-6">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Lock className="h-5 w-5 text-red-500" />
                <span>Submit Your Confidential Bid</span>
              </h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Specify the payout pot amount you would accept. Your bid remains cryptographically sealed until the reveal window opens.
              </p>
            </div>

            {!userBid ? (
              <div className="space-y-4">
                <div className="relative">
                  <input
                    type="number"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    placeholder="3800"
                    className="w-full rounded-2xl border border-neutral-800 bg-neutral-900 pl-4 pr-16 py-4 text-base text-white focus:outline-none focus:border-red-500 font-mono"
                  />
                  <span className="absolute right-4 top-4 text-xs font-bold text-neutral-500">
                    USDC
                  </span>
                </div>
                <button
                  onClick={handleCommit}
                  disabled={submitting}
                  className="w-full py-4 rounded-2xl bg-white hover:bg-neutral-200 text-black font-bold text-xs uppercase tracking-wider shadow-xl shadow-white/5 transition-all cursor-pointer"
                >
                  {submitting ? "Hashing and Committing..." : "Hash and Commit Secret Bid"}
                </button>
              </div>
            ) : (
              <div className="p-6 bg-neutral-950 rounded-2xl border border-neutral-800 space-y-3 text-xs">
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Bid successfully committed for Cycle {state.cycle}</span>
                </div>
                <p className="text-[11px] font-mono text-neutral-500 break-all">
                  Commitment Hash: {userBid.commitment}
                </p>
                <p className="text-xs text-neutral-400">
                  {state.bids.length} of 4 members committed. Waiting for all members before reveal opens.
                </p>
              </div>
            )}
          </div>
        )}

        {state?.phase === "Reveal" && (
          <div className="rounded-3xl border border-neutral-900 bg-neutral-900/40 p-8 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Unlock className="h-5 w-5 text-amber-400" />
                <span>1 Click Reveal Active</span>
              </h3>
              <span className="text-xs text-neutral-400 font-mono">
                {state.bids.filter((b) => b.revealed).length} of {state.bids.length} Revealed
              </span>
            </div>

            <p className="text-xs text-amber-300/80 leading-relaxed bg-amber-950/30 p-4 rounded-2xl border border-amber-800/40">
              Important: Bids must be revealed to be eligible for payout. Unrevealed bids are permanently discarded during settlement.
            </p>

            {!userBid?.revealed ? (
              <button
                onClick={handle1ClickReveal}
                disabled={submitting}
                className="w-full py-4 rounded-2xl bg-white hover:bg-neutral-200 text-black font-bold text-xs uppercase tracking-wider shadow-xl shadow-white/5 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="h-4 w-4 text-red-600" />
                <span>{submitting ? "Re deriving Salt..." : "1 Click Reveal (Deterministic Salt Recovery)"}</span>
              </button>
            ) : (
              <div className="p-4 bg-emerald-950/40 border border-emerald-800/40 rounded-2xl text-xs text-emerald-300 font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>Your bid of {fromBaseUnits(userBid.amount!)} USDC has been verified onchain</span>
              </div>
            )}

            <div className="border-t border-neutral-900 pt-4">
              <button
                onClick={handleSettle}
                disabled={submitting}
                className="w-full py-3.5 rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs uppercase tracking-wider border border-neutral-800 transition-all cursor-pointer"
              >
                Settle Auction Pot and Pick Winner
              </button>
            </div>
          </div>
        )}

        {state?.phase === "Settled" && state.winner && (
          <div className="rounded-3xl border border-neutral-900 bg-neutral-900/40 p-8 space-y-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-2.5">
              <Trophy className="h-6 w-6 text-emerald-400" />
              <span>Auction Settled: Winner Selected</span>
            </h3>

            <div className="grid sm:grid-cols-2 gap-4 bg-neutral-950 rounded-2xl p-6 border border-neutral-800 text-xs">
              <div className="space-y-1">
                <span className="text-neutral-400 block uppercase tracking-wider text-[10px]">Winning Member</span>
                <span className="font-bold text-emerald-400 text-lg block font-mono">
                  @{state.winner.username}
                </span>
                <span className="font-mono text-[10px] text-neutral-500">
                  {state.winner.wallet.slice(0, 8)}...{state.winner.wallet.slice(-6)}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-neutral-400 block uppercase tracking-wider text-[10px]">Winning Payout Pot</span>
                <span className="font-bold text-white text-lg block font-mono">
                  {fromBaseUnits(state.winner.amount)} USDC
                </span>
                <span className="text-[11px] text-red-400 font-medium font-mono">
                  +{fromBaseUnits(state.winner.dividend)} USDC Carried to Month 2
                </span>
              </div>
            </div>

            <Link
              href={`/circles/${circleId}/pool`}
              className="inline-flex items-center gap-2 text-xs font-bold text-white hover:text-red-400 uppercase tracking-wider"
            >
              <span>View Month 2 Pool in Vault</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
