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
  Shield,
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
              <Coins className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Pool Vault and Ledger</h1>
              <p className="text-xs text-neutral-400 mt-0.5">
                Onchain Vault Accounting on Base Sepolia
              </p>
            </div>
          </div>
          <span className="px-4 py-1.5 rounded-full text-xs font-bold bg-neutral-900 text-neutral-200 border border-neutral-800 font-mono">
            Cycle {state?.cycle || 1} of 3 • Phase: {state?.phase || "Collect"}
          </span>
        </div>

        {/* Pool Stats in Xapo Bank Style */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-6 rounded-2xl bg-neutral-900/80 border border-neutral-800 space-y-1">
            <span className="text-[11px] uppercase tracking-wider text-neutral-400 block font-semibold">Total Vault Pot</span>
            <span className="text-3xl font-extrabold text-white font-mono block mt-1">
              {Number(poolUSDC).toLocaleString()} <span className="text-xs text-neutral-400 font-normal">USDC</span>
            </span>
          </div>

          <div className="p-6 rounded-2xl bg-neutral-900/80 border border-neutral-800 space-y-1">
            <span className="text-[11px] uppercase tracking-wider text-neutral-400 block font-semibold">Carried Dividend</span>
            <span className="text-3xl font-extrabold text-red-400 font-mono block mt-1">
              +{Number(carriedUSDC).toLocaleString()} <span className="text-xs text-neutral-400 font-normal">USDC</span>
            </span>
          </div>

          <div className="p-6 rounded-2xl bg-neutral-900/80 border border-neutral-800 space-y-1">
            <span className="text-[11px] uppercase tracking-wider text-neutral-400 block font-semibold">Collection Mandate</span>
            <span className="text-3xl font-extrabold text-emerald-400 font-mono block mt-1">
              Active <span className="text-xs text-neutral-400 font-normal">Auto</span>
            </span>
          </div>
        </div>

        {/* Monthly Calendar Overview */}
        <div className="rounded-2xl bg-neutral-900/40 border border-neutral-800/80 p-6 space-y-4">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Calendar className="h-4 w-4 text-red-500" />
            <span>Monthly Cycle Cadence</span>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
              <span className="text-neutral-500 font-mono text-[10px] uppercase">Phase 1</span>
              <p className="font-bold text-white">Month Start (1st)</p>
              <p className="text-neutral-400 text-[11px]">Autopay collects fixed contribution to vault.</p>
            </div>
            <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
              <span className="text-neutral-500 font-mono text-[10px] uppercase">Phase 2</span>
              <p className="font-bold text-white">Month Duration</p>
              <p className="text-neutral-400 text-[11px]">Members commit sealed confidential bids.</p>
            </div>
            <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
              <span className="text-neutral-500 font-mono text-[10px] uppercase">Phase 3</span>
              <p className="font-bold text-white">Month End (Last Day)</p>
              <p className="text-neutral-400 text-[11px]">1 Click Reveal and winner payout settlement.</p>
            </div>
          </div>
        </div>

        {/* Demo Scheduler Advance Controller */}
        <div className="p-6 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white text-sm">Automated Scheduler Engine</h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Current status: {state?.isHolding ? "HOLDING for demonstration confirmation" : "Active cycle progression"}
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-red-950 text-red-300 text-[10px] font-bold tracking-wider uppercase border border-red-800/60">
              Demo Mode
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
            <button
              onClick={handleContinue}
              disabled={advancing}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white hover:bg-neutral-200 text-black font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-white/5 cursor-pointer"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>{advancing ? "Advancing State..." : "Continue Next Phase Step"}</span>
            </button>

            <Link
              href={`/circles/${circleId}/bidding`}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs uppercase tracking-wider border border-neutral-800 transition-all flex items-center justify-center gap-2"
            >
              <span>Go to Secret Auction</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
