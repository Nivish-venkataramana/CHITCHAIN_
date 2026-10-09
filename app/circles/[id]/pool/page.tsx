"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Play,
  Coins,
  Calendar,
  Sparkles,
} from "lucide-react";
import { fromBaseUnits } from "@/lib/validation";

interface SchedulerInfo {
  cycle: number;
  phase: string;
  isHolding: boolean;
  waitingFor: string;
  poolAmount: string;
  carriedDividend: string;
}

export default function PoolVaultPage() {
  const params = useParams();
  const circleId = params.id as string;

  const [state, setState] = useState<SchedulerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState(false);

  const fetchSchedulerState = () => {
    fetch("/api/scheduler")
      .then((r) => r.json())
      .then((data) => setState(data))
      .catch((err) => console.error("Error loading scheduler:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSchedulerState();
  }, []);

  const handleContinue = async () => {
    setAdvancing(true);
    try {
      const res = await fetch("/api/scheduler", { method: "POST" });
      const data = await res.json();
      setState(data);
    } catch (err) {
      console.error("Error advancing scheduler:", err);
    } finally {
      setAdvancing(false);
    }
  };

  const poolUSDC = state ? fromBaseUnits(state.poolAmount) : "4000";
  const carriedUSDC = state ? fromBaseUnits(state.carriedDividend) : "0";

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
              <Coins className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Pool Vault</h1>
              <p className="text-xs text-neutral-400">
                Base Sepolia On-Chain Accounting
              </p>
            </div>
          </div>
          <span className="px-3.5 py-1 rounded-full text-xs font-medium bg-emerald-950/40 text-emerald-300 border border-emerald-500/30">
            Cycle {state?.cycle || 1} • Phase: {state?.phase || "Collect"}
          </span>
        </div>

        {/* Pool Stats */}
        <div className="grid grid-cols-3 gap-4 bg-white/[0.02] rounded-2xl p-6 border border-white/5 text-center">
          <div>
            <span className="text-[11px] text-neutral-500 block">Total Pool</span>
            <span className="text-2xl font-bold text-white mt-1 block">
              {Number(poolUSDC).toLocaleString()} USDC
            </span>
          </div>
          <div>
            <span className="text-[11px] text-neutral-500 block">Carried Dividend</span>
            <span className="text-2xl font-bold text-emerald-400 mt-1 block">
              {Number(carriedUSDC).toLocaleString()} USDC
            </span>
          </div>
          <div>
            <span className="text-[11px] text-neutral-500 block">Next Auction</span>
            <span className="text-2xl font-bold text-neutral-200 mt-1 block">
              {state?.cycle === 1 ? "Jan 31" : state?.cycle === 2 ? "Feb 28" : "Mar 31"}
            </span>
          </div>
        </div>

        {/* Calendar Timeline */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-emerald-400" />
            Cycle Schedule
          </h3>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 space-y-1">
              <span className="font-semibold text-white block">Month 1 (Jan)</span>
              <p className="text-neutral-400 text-[11px]">Pool: Jan 1 • Bid: Jan 31</p>
              <span className="inline-block px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-medium mt-1">
                Active
              </span>
            </div>
            <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02] space-y-1">
              <span className="font-semibold text-white block">Month 2 (Feb)</span>
              <p className="text-neutral-500 text-[11px]">Pool: Feb 1 • Bid: Feb 28</p>
              <span className="inline-block px-2 py-0.5 rounded bg-white/5 text-neutral-400 text-[10px] font-medium mt-1">
                Upcoming
              </span>
            </div>
            <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02] space-y-1">
              <span className="font-semibold text-white block">Month 3 (Mar)</span>
              <p className="text-neutral-500 text-[11px]">Pool: Mar 1 • Bid: Mar 31</p>
              <span className="inline-block px-2 py-0.5 rounded bg-white/5 text-neutral-400 text-[10px] font-medium mt-1">
                Final Cycle
              </span>
            </div>
          </div>
        </div>

        {/* Scheduler Control Panel */}
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/10 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
              <Play className="h-3.5 w-3.5" />
              Scheduler Control
            </h3>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-950/40 text-amber-300 text-[10px] font-medium border border-amber-500/30">
              Awaiting Continue
            </span>
          </div>

          <p className="text-xs text-neutral-300 leading-relaxed">
            {state?.waitingFor || "Ready"}
          </p>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleContinue}
              disabled={advancing}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs shadow-[0_0_15px_rgba(16,185,129,0.25)] transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {advancing ? "Advancing..." : "Continue Phase →"}
            </button>

            {state?.phase === "Commit" || state?.phase === "Reveal" || state?.phase === "Settle" ? (
              <Link
                href={`/circles/${circleId}/bidding`}
                className="px-4 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/10 text-white font-medium text-xs border border-white/10 transition-colors"
              >
                Go to Auction →
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
