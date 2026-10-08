"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Lock, Unlock, Trophy, ShieldAlert, Sparkles } from "lucide-react";

export default function BiddingModulePage() {
  const params = useParams();
  const circleId = params.id as string;

  const [bidAmount, setBidAmount] = useState<string>("3800");
  const [committed, setCommitted] = useState(false);
  const [revealed, setRevealed] = useState(false);

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
                [Pranav Slice: Commit-Reveal Keccak256 Auction &amp; Winner Payout]
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
            Bid Phase: {revealed ? "Settled" : committed ? "Waiting for Reveal" : "Commit Open"}
          </span>
        </div>

        {/* Bidding Rules Info */}
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 border">
            <span className="text-slate-500 block">Floor Bid (50% of Pool):</span>
            <span className="font-bold text-slate-800 text-sm mt-0.5 block">2,000 USDC</span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border">
            <span className="text-slate-500 block">Max Pool Cap:</span>
            <span className="font-bold text-slate-800 text-sm mt-0.5 block">4,000 USDC</span>
          </div>
        </div>

        {/* Commit Form */}
        {!committed ? (
          <div className="rounded-2xl border p-5 bg-purple-50/30 space-y-4">
            <h3 className="text-sm font-bold text-purple-950 flex items-center gap-2">
              <Lock className="h-4 w-4 text-purple-600" />
              Commit Secret Bid
            </h3>
            <p className="text-xs text-slate-600">
              Your bid remains secret until the reveal phase. The lowest valid bid wins the pot.
            </p>
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
              onClick={() => setCommitted(true)}
              className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow transition-colors"
            >
              Hash &amp; Commit Hidden Bid
            </button>
          </div>
        ) : !revealed ? (
          <div className="rounded-2xl border p-5 bg-amber-50/50 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-amber-950 flex items-center gap-2">
                <Unlock className="h-4 w-4 text-amber-600" />
                1-Click Reveal (DEMO_MODE=true)
              </h3>
              <span className="text-xs text-slate-500">4 of 4 Members Committed</span>
            </div>
            <p className="text-xs text-amber-900">
              ⚠️ <strong>Warning</strong>: Unrevealed commits are discarded at settlement.
            </p>
            <button
              onClick={() => setRevealed(true)}
              className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow transition-colors flex items-center justify-center gap-2"
            >
              <Sparkles className="h-4 w-4" />
              1-Click Reveal (Re-derive Salt &amp; Reveal)
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border p-5 bg-emerald-50 space-y-4">
            <h3 className="text-sm font-bold text-emerald-950 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-emerald-600" />
              Auction Settled: Winner &amp; Dividend
            </h3>
            <div className="p-3 bg-white rounded-xl border text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Winner (Lowest valid bid):</span>
                <span className="font-bold text-emerald-700">Vikram Nair (3,800 USDC)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Carried Dividend to Month 2:</span>
                <span className="font-bold text-blue-700">200 USDC</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
