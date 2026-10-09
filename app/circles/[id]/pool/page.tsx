"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Coins,
  Calendar,
  CheckCircle2,
  Clock,
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

  const poolUSDC = state ? fromBaseUnits(state.poolAmount) : "0";
  const carriedUSDC = state ? fromBaseUnits(state.carriedDividend) : "0";

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
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Pool Vault & Ledger</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider border border-white/20 text-neutral-200">
              Cycle {state?.cycle || 1} • Phase: {state?.phase || "Collect"}
            </span>
          </div>
          <p className="text-[11px] text-neutral-400">
            Onchain Decentralized Accounting on Base Sepolia
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={`/circles/${circleId}/yield`}
            className="px-4 py-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 font-semibold text-xs flex items-center gap-1.5 hover:bg-emerald-500/20 transition-colors shadow-sm shrink-0"
          >
            <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
            <span>Aave Yield & Simulation</span>
          </Link>
          <Link
            href={`/circles/${circleId}/bidding`}
            className="px-4 py-2 rounded-xl bg-white text-black font-semibold text-xs flex items-center gap-1.5 hover:bg-neutral-200 transition-colors shadow-md shrink-0"
          >
            <span>Go to Secret Auction</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Symmetrical Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0">
        <div className="p-3.5 rounded-2xl border border-white/10 bg-transparent text-center space-y-0.5 shadow-sm">
          <span className="text-[10px] uppercase tracking-wider text-neutral-400 block font-semibold">Total Vault Pot</span>
          <span className="text-xl font-bold text-white font-mono block">
            {Number(poolUSDC).toLocaleString()} <span className="text-xs text-neutral-400 font-normal">USDC</span>
          </span>
        </div>

        <div className="p-3.5 rounded-2xl border border-white/10 bg-transparent text-center space-y-0.5 shadow-sm">
          <span className="text-[10px] uppercase tracking-wider text-neutral-400 block font-semibold">Carried Dividend</span>
          <span className="text-xl font-bold text-white font-mono block">
            {Number(carriedUSDC).toLocaleString()} <span className="text-xs text-neutral-400 font-normal">USDC</span>
          </span>
        </div>

        <div className="p-3.5 rounded-2xl border border-white/10 bg-transparent text-center space-y-0.5 shadow-sm">
          <span className="text-[10px] uppercase tracking-wider text-neutral-400 block font-semibold">Scheduled State</span>
          <span className="text-xl font-bold text-white font-mono block">
            {state?.isHolding ? "Active Hold" : "Progressing"}
          </span>
        </div>
      </div>

      {/* Main Ledger Status & Cycle Progression */}
      <div className="rounded-2xl border border-white/10 bg-transparent p-4 flex flex-col justify-between flex-1 min-h-0 shadow-xl space-y-3">
        <div className="space-y-3">
          <div className="border-b border-white/10 pb-2.5">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Calendar className="h-4 w-4 text-neutral-300" />
              <span>Auction Stage & Settlement Roadmap</span>
            </h2>
            <p className="text-[11px] text-neutral-400 mt-0.5">Automated 30-day recurring smart contract schedule</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div className={`p-3 rounded-xl border ${state?.phase === "Collect" ? "border-white/30 bg-white/[0.04]" : "border-white/10 bg-white/[0.01]"} space-y-1`}>
              <div className="flex items-center justify-between text-xs font-semibold text-white">
                <span>Phase 1: Contribution</span>
                <Clock className="h-3.5 w-3.5 text-neutral-400" />
              </div>
              <p className="text-[10px] text-neutral-400 font-mono">Deductions executed via EIP-712 session key mandates.</p>
            </div>

            <div className={`p-3 rounded-xl border ${state?.phase === "Auction" ? "border-white/30 bg-white/[0.04]" : "border-white/10 bg-white/[0.01]"} space-y-1`}>
              <div className="flex items-center justify-between text-xs font-semibold text-white">
                <span>Phase 2: Sealed Auction</span>
                <Coins className="h-3.5 w-3.5 text-neutral-400" />
              </div>
              <p className="text-[10px] text-neutral-400 font-mono">2-stage commit-reveal bidding for lowest discount winner.</p>
            </div>

            <div className={`p-3 rounded-xl border ${state?.phase === "Settled" ? "border-white/30 bg-white/[0.04]" : "border-white/10 bg-white/[0.01]"} space-y-1`}>
              <div className="flex items-center justify-between text-xs font-semibold text-white">
                <span>Phase 3: Settlement</span>
                <CheckCircle2 className="h-3.5 w-3.5 text-neutral-400" />
              </div>
              <p className="text-[10px] text-neutral-400 font-mono">Payout transferred and dividend carried to next round.</p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="pt-2 border-t border-white/10 flex items-center justify-between">
          <span className="text-xs text-neutral-400 font-mono">
            Status: <strong className="text-white">{state?.waitingFor || "Ready"}</strong>
          </span>

          <button
            onClick={handleContinue}
            disabled={advancing}
            className="px-4 py-2 rounded-xl bg-white text-black font-semibold text-xs hover:bg-neutral-200 transition-colors shadow-sm cursor-pointer"
          >
            <span>{advancing ? "Advancing..." : "Advance Cycle State"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
