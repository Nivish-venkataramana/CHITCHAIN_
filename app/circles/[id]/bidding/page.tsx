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
      const salt = deriveDemoSalt(circleId, 1, user.walletAddress);

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
        <div className="p-8 text-center text-xs font-mono text-neutral-400 bg-transparent animate-pulse">
          Loading sealed auction...
        </div>
      </div>
    );
  }

  const poolFormatted = state ? fromBaseUnits(state.totalPool) : "0";
  const floorFormatted = state ? fromBaseUnits(state.floorBid) : "0";

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 flex flex-col justify-between min-h-[calc(100vh-5.5rem)] text-neutral-100 gap-5 py-2">
      {/* Top Bar */}
      <div className="flex items-center justify-between shrink-0">
        <Link
          href={`/circles/${circleId}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Return to Circle</span>
        </Link>
      </div>

      {/* Header Banner */}
      <div className="p-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Confidential Bidding</h1>
          <span className="px-3 py-1 rounded-full text-xs font-mono uppercase tracking-wider text-neutral-300">
            Phase: {state?.phase}
          </span>
        </div>

        {/* Global Action */}
        <div className="flex items-center gap-2.5">
          {state?.phase === "Reveal" && (
            <button
              onClick={handleSettle}
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-white text-black font-semibold text-xs hover:bg-neutral-200 transition-colors cursor-pointer"
            >
              <span>{submitting ? "Settling..." : "Settle Winner"}</span>
            </button>
          )}

          {state?.phase === "Settled" && (
            <Link
              href={`/circles/${circleId}/pool`}
              className="px-5 py-2.5 rounded-xl bg-white text-black font-semibold text-xs flex items-center gap-2 hover:bg-neutral-200 transition-colors"
            >
              <Coins className="h-4 w-4" />
              <span>View Updated Ledger</span>
            </Link>
          )}
        </div>
      </div>

      {/* Symmetrical Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 shrink-0">
        <div className="p-4 text-center space-y-1">
          <span className="text-xs uppercase tracking-wider text-neutral-400 block font-semibold">Total Pot Pool</span>
          <p className="text-lg sm:text-xl font-bold text-white font-mono">{Number(poolFormatted).toLocaleString()} USDC</p>
        </div>
        <div className="p-4 text-center space-y-1">
          <span className="text-xs uppercase tracking-wider text-neutral-400 block font-semibold">Minimum Floor Bid</span>
          <p className="text-lg sm:text-xl font-bold text-white font-mono">{Number(floorFormatted).toLocaleString()} USDC</p>
        </div>
        <div className="p-4 text-center space-y-1">
          <span className="text-xs uppercase tracking-wider text-neutral-400 block font-semibold">Round Cycle</span>
          <p className="text-lg sm:text-xl font-bold text-white font-mono">Cycle {state?.cycle || 1}</p>
        </div>
        <div className="p-4 text-center space-y-1">
          <span className="text-xs uppercase tracking-wider text-neutral-400 block font-semibold">Status</span>
          <p className="text-lg sm:text-xl font-bold text-white font-mono">{state?.phase}</p>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl text-red-300 text-xs flex items-center gap-2.5 shrink-0">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 rounded-xl text-emerald-300 text-xs flex items-center gap-2.5 shrink-0">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Symmetrical 2-Column Area */}
      <div className="grid md:grid-cols-2 gap-8 flex-1 min-h-0">
        {/* Left Column: Your Secret Bid */}
        <div className="flex flex-col justify-between h-full min-h-[22rem] space-y-4">
          <div className="space-y-4">
            <div className="shrink-0 pb-1">
              <h2 className="text-base font-bold text-white flex items-center gap-2.5">
                <Lock className="h-5 w-5 text-neutral-300" />
                <span>Your Confidential Bid</span>
              </h2>
            </div>

            {state?.phase === "Commit" && (
              <div className="space-y-3">
                <div className="relative h-14 border-b border-white/20 focus-within:border-white transition-colors">
                  <input
                    type="text"
                    id="bid-amount"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder=" "
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value.replace(/\D/g, ""))}
                    className="peer w-full h-full bg-transparent border-none outline-none pt-4 pb-1 text-sm text-white font-mono placeholder-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <label
                    htmlFor="bid-amount"
                    className="absolute left-0 top-4 text-sm text-neutral-400 pointer-events-none transition-all duration-200 origin-[0] peer-focus:top-0 peer-focus:text-xs peer-focus:text-white peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-neutral-400"
                  >
                    Bid Amount (USDC)
                  </label>
                </div>
                <p className="text-xs text-neutral-400 font-mono">
                  Floor rule: Min {Number(floorFormatted).toLocaleString()} USDC (50% max discount).
                </p>
              </div>
            )}

            {state?.phase === "Reveal" && (
              <div className="p-4 space-y-2">
                <p className="text-sm font-semibold text-white">Reveal Phase Active</p>
                <p className="text-xs text-neutral-300 font-mono leading-relaxed">
                  Reveal your secret salt to verify your commitment hash onchain.
                </p>
              </div>
            )}

            {state?.phase === "Settled" && state.winner && (
              <div className="p-4 text-emerald-300 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                  <Trophy className="h-4 w-4" />
                  <span>Winner: @{state.winner.username}</span>
                </div>
                <p className="text-xs text-emerald-200 font-mono">
                  Payout: {fromBaseUnits(state.winner.amount)} USDC • Dividend: {fromBaseUnits(state.winner.dividend)} USDC
                </p>
              </div>
            )}
          </div>

          <div className="pt-2">
            {state?.phase === "Commit" && (
              <button
                onClick={handleCommit}
                disabled={submitting || !bidAmount.trim()}
                className="w-full py-3 rounded-xl bg-white text-black font-semibold text-xs hover:bg-neutral-200 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <span>{submitting ? "Hashing..." : userBid ? "Update Secret Bid" : "Commit Secret Bid"}</span>
              </button>
            )}

            {state?.phase === "Reveal" && (
              <button
                onClick={handleReveal}
                disabled={submitting}
                className="w-full py-3 rounded-xl bg-white text-black font-semibold text-xs hover:bg-neutral-200 transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <Eye className="h-4 w-4" />
                <span>{submitting ? "Verifying..." : "1-Click Reveal Salt"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Participant Commitment Hashes */}
        <div className="flex flex-col h-full min-h-[22rem] space-y-4">
          <div className="shrink-0 pb-1">
            <h3 className="text-base font-bold text-white flex items-center gap-2.5">
              <Coins className="h-5 w-5 text-neutral-300" />
              <span>Participant Sealed Commitments</span>
            </h3>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-2.5 pr-1">
            {state?.bids.map((b) => (
              <div
                key={b.memberWallet}
                className="p-3.5 flex items-center justify-between text-sm transition-colors"
              >
                <div className="space-y-0.5">
                  <span className="font-semibold text-white text-sm block">@{b.memberUsername}</span>
                  <p className="text-xs font-mono text-neutral-400 truncate max-w-[220px]">
                    {b.commitment.slice(0, 16)}...
                  </p>
                </div>

                <div>
                  {b.revealed ? (
                    <span className="px-3 py-1 rounded-full text-xs font-mono text-emerald-400">
                      {fromBaseUnits(b.amount || "0")} USDC
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full text-xs font-mono text-neutral-400">
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
