"use client";

import React from "react";
import { usePoolData } from "../hooks/usePoolData";
import { CycleCalendar } from "./CycleCalendar";
import { MemberStatusList } from "./MemberStatusList";
import { DemoAdminPanel } from "./DemoAdminPanel";
import { Coins, Layers, ArrowUpRight, TrendingUp, Sparkles, Shield, RefreshCw } from "lucide-react";

interface Props {
  circleId: string;
  vaultAddress?: string;
}

export function PoolDashboard({ circleId, vaultAddress }: Props) {
  const { loading, error, poolState, schedule, schedulerState, refresh, triggerSchedulerContinue } = usePoolData(
    circleId,
    vaultAddress
  );

  if (loading && !poolState) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400 gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
        <span className="text-sm font-medium">Loading ChitChain Pool Data...</span>
      </div>
    );
  }

  if (error || !poolState) {
    return (
      <div className="p-6 rounded-2xl bg-rose-950/30 border border-rose-800 text-rose-300">
        <h3 className="font-semibold text-base mb-1">Failed to load circle pool</h3>
        <p className="text-sm">{error || "Circle not found"}</p>
      </div>
    );
  }

  const formattedPool = (Number(poolState.poolAmount) / 1e6).toLocaleString();
  const formattedCarried = (Number(poolState.carriedDividend) / 1e6).toLocaleString();
  const formattedMonthly = (Number(poolState.monthlyAmount) / 1e6).toLocaleString();

  const phaseColors: Record<string, { bg: string; text: string; border: string }> = {
    NotStarted: { bg: "bg-slate-800", text: "text-slate-300", border: "border-slate-700" },
    Collect: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30" },
    Bidding: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/30" },
    Settle: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30" },
    Completed: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30" }
  };

  const currentPhaseStyle = phaseColors[poolState.phase] || phaseColors.NotStarted;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-blue-900/40 via-indigo-900/20 to-slate-900 border border-blue-500/20 backdrop-blur-xl shadow-2xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30">
              ChitChain Circle Pool
            </span>
            <span className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${currentPhaseStyle.bg} ${currentPhaseStyle.text} border ${currentPhaseStyle.border}`}>
              Phase: {poolState.phase}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {poolState.name}
          </h1>
          <p className="text-xs text-slate-400 font-mono">
            Vault: {poolState.vaultAddress}
          </p>
        </div>

        <button
          onClick={() => refresh()}
          className="self-start md:self-center flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh On-Chain State
        </button>
      </div>

      {/* Demo Admin Panel */}
      {poolState.isDemoMode && (
        <DemoAdminPanel schedulerState={schedulerState} onContinue={triggerSchedulerContinue} />
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Current Pool Amount */}
        <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950/80 border border-slate-800 backdrop-blur-xl shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition">
            <Coins className="w-16 h-16 text-blue-400" />
          </div>
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Current Pool Amount
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white font-mono flex items-baseline gap-1.5">
            {formattedPool}
            <span className="text-sm font-semibold text-blue-400">USDC</span>
          </div>
          <div className="mt-3 text-[11px] text-slate-400 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span>Includes collected + carried dividend</span>
          </div>
        </div>

        {/* Metric 2: Monthly Fixed Contribution */}
        <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950/80 border border-slate-800 backdrop-blur-xl shadow-lg relative overflow-hidden group">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Monthly Per Member
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white font-mono flex items-baseline gap-1.5">
            {formattedMonthly}
            <span className="text-sm font-semibold text-indigo-400">USDC</span>
          </div>
          <div className="mt-3 text-[11px] text-slate-400">
            Due on the 1st of each month via Autopay
          </div>
        </div>

        {/* Metric 3: Carried Dividend */}
        <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950/80 border border-slate-800 backdrop-blur-xl shadow-lg relative overflow-hidden group">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Carried Dividend
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono flex items-baseline gap-1.5">
            {formattedCarried}
            <span className="text-sm font-semibold text-emerald-300">USDC</span>
          </div>
          <div className="mt-3 text-[11px] text-slate-400 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Discount buffer added into this cycle</span>
          </div>
        </div>

        {/* Metric 4: Circle Progress */}
        <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950/80 border border-slate-800 backdrop-blur-xl shadow-lg relative overflow-hidden group">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Cycle Progress
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white font-mono flex items-baseline gap-1.5">
            Month {poolState.currentCycle}
            <span className="text-sm font-semibold text-slate-400">/ {poolState.durationMonths}</span>
          </div>
          <div className="mt-3 text-[11px] text-slate-400">
            Total circle duration: {poolState.durationMonths} months
          </div>
        </div>
      </div>

      {/* Cycle Calendar & Schedule */}
      <CycleCalendar schedule={schedule} currentCycle={poolState.currentCycle} />

      {/* Member Contributions & Status */}
      <MemberStatusList
        members={poolState.members}
        monthlyAmount={poolState.monthlyAmount}
        currentCycle={poolState.currentCycle}
      />
    </div>
  );
}
