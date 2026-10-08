"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Play,
  Coins,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  TrendingUp,
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
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
              <Coins className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Pool Vault &amp; Cycle Clock</h1>
              <p className="text-xs text-slate-500">
                On-Chain Vault Accounting on Base Sepolia
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
            Cycle {state?.cycle || 1} / 3 • Phase: {state?.phase || "Collect"}
          </span>
        </div>

        {/* Pool Stats */}
        <div className="grid grid-cols-3 gap-4 bg-slate-50 rounded-2xl p-5 border text-center">
          <div>
            <span className="text-xs text-slate-500 block">Total Pool in Vault</span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">
              {Number(poolUSDC).toLocaleString()} USDC
            </span>
          </div>
          <div>
            <span className="text-xs text-slate-500 block">Carried Dividend</span>
            <span className="text-2xl font-black text-emerald-600 mt-1 block">
              {Number(carriedUSDC).toLocaleString()} USDC
            </span>
          </div>
          <div>
            <span className="text-xs text-slate-500 block">Next Auction Date</span>
            <span className="text-2xl font-black text-purple-600 mt-1 block">
              {state?.cycle === 1 ? "Jan 31" : state?.cycle === 2 ? "Feb 28" : "Mar 31"}
            </span>
          </div>
        </div>

        {/* Calendar Timeline */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-600" />
            Monthly Cycle Calendar
          </h3>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="p-3.5 rounded-xl border bg-white space-y-1">
              <span className="font-bold text-slate-800 block">Month 1 (Jan)</span>
              <p className="text-slate-500 text-[11px]">Pool: Jan 1 • Bid: Jan 31</p>
              <span className="inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                Active
              </span>
            </div>
            <div className="p-3.5 rounded-xl border bg-slate-50/50 space-y-1">
              <span className="font-bold text-slate-800 block">Month 2 (Feb)</span>
              <p className="text-slate-500 text-[11px]">Pool: Feb 1 • Bid: Feb 28</p>
              <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-bold">
                Upcoming
              </span>
            </div>
            <div className="p-3.5 rounded-xl border bg-slate-50/50 space-y-1">
              <span className="font-bold text-slate-800 block">Month 3 (Mar)</span>
              <p className="text-slate-500 text-[11px]">Pool: Mar 1 • Bid: Mar 31</p>
              <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-bold">
                Final Cycle
              </span>
            </div>
          </div>
        </div>

        {/* Demo Mode Admin Scheduler Panel (README §9.4, §9.6) */}
        <div className="rounded-2xl border-2 border-blue-200 bg-blue-50/60 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
              <Play className="h-3.5 w-3.5 text-blue-600" />
              Demo Mode Scheduler Control (DEMO_MODE=true)
            </h3>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-300">
              HOLD: Awaiting Step-by-Step Continue
            </span>
          </div>

          <p className="text-xs text-blue-900 font-medium">
            <strong>Next Action:</strong> {state?.waitingFor || "Loading..."}
          </p>

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleContinue}
              disabled={advancing}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="h-4 w-4" />
              {advancing ? "Advancing State..." : "Continue to Next Phase →"}
            </button>

            {state?.phase === "Commit" || state?.phase === "Reveal" || state?.phase === "Settle" ? (
              <Link
                href={`/circles/${circleId}/bidding`}
                className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow transition-colors flex items-center gap-1.5"
              >
                Go to Secret Bidding Auction →
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
