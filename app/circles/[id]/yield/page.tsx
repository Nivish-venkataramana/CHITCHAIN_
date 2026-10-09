"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  TrendingUp,
  Shield,
  Coins,
  ArrowRight,
  Activity,
  Play,
  Pause,
  RotateCcw,
  FastForward,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Lock,
  Layers,
  Sparkles,
  Zap,
} from "lucide-react";
import { LiveYieldState, SimulationResult, SimulationScenarioConfig } from "@/lib/yield/types";
import { runDeterministicSimulation } from "@/lib/yield/calculator";
import { useDevUser } from "@/components/providers";

export default function CircleYieldPage() {
  const params = useParams();
  const circleId = params.id as string;
  const { user } = useDevUser();

  const [mode, setMode] = useState<"LIVE" | "SIMULATION">("LIVE");

  // Live Mode State
  const [liveState, setLiveState] = useState<LiveYieldState | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [circleName, setCircleName] = useState<string>("Wealth Circle");
  const [loadingLive, setLoadingLive] = useState(true);

  // Supply / Withdraw Form State
  const [supplyAmount, setSupplyAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Simulation Mode State
  const [simConfig, setSimConfig] = useState<SimulationScenarioConfig>({
    monthlyContribution: 10000,
    durationMonths: 24,
    hypotheticalAPR: 0.0808,
    compoundingFrequency: "DAILY",
    depositTiming: "END_OF_MONTH",
  });
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);
  const [virtualMonthIndex, setVirtualMonthIndex] = useState<number>(24);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Fetch Live State
  const fetchLiveYield = useCallback(async () => {
    try {
      const res = await fetch(`/api/circles/${circleId}/yield`, {
        headers: { "x-dev-wallet": user?.walletAddress || "" },
      });
      const data = await res.json();
      if (data.state) setLiveState(data.state);
      if (data.transactions) setTransactions(data.transactions);
      if (data.circleName) setCircleName(data.circleName);
    } catch (err) {
      console.error("Error fetching live yield:", err);
    } finally {
      setLoadingLive(false);
    }
  }, [circleId, user?.walletAddress]);

  useEffect(() => {
    fetchLiveYield();
  }, [fetchLiveYield]);

  // Run Simulation Calculation
  const runSim = useCallback((config: SimulationScenarioConfig) => {
    const res = runDeterministicSimulation(config);
    setSimResult(res);
  }, []);

  useEffect(() => {
    runSim(simConfig);
  }, [simConfig, runSim]);

  // Virtual Clock Ticker
  useEffect(() => {
    let timer: any = null;
    if (isPlaying && simResult) {
      timer = setInterval(() => {
        setVirtualMonthIndex((prev) => {
          if (prev >= simConfig.durationMonths) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 750);
    }
    return () => clearInterval(timer);
  }, [isPlaying, simConfig.durationMonths, simResult]);

  const handleSupply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplyAmount || Number(supplyAmount) <= 0) return;

    setActionLoading(true);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/circles/${circleId}/yield`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "SUPPLY", amount: supplyAmount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Supply failed");
      setActionMessage({ text: data.message, type: "success" });
      setSupplyAmount("");
      fetchLiveYield();
    } catch (err: any) {
      setActionMessage({ text: err.message || "Failed to supply", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!withdrawAmount || Number(withdrawAmount) <= 0) return;

    setActionLoading(true);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/circles/${circleId}/yield`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "WITHDRAW", amount: withdrawAmount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Withdraw failed");
      setActionMessage({ text: data.message, type: "success" });
      setWithdrawAmount("");
      fetchLiveYield();
    } catch (err: any) {
      setActionMessage({ text: err.message || "Failed to withdraw", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const visibleSimRecords = simResult
    ? simResult.monthlyLedger.slice(0, virtualMonthIndex)
    : [];
  const currentMonthRecord = visibleSimRecords[visibleSimRecords.length - 1];

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8 space-y-8 text-neutral-100">
      {/* Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href={`/circles/${circleId}`}
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Return to {circleName}</span>
        </Link>

        {/* Operating Mode Selector */}
        <div className="flex items-center p-1 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-lg">
          <button
            type="button"
            onClick={() => setMode("LIVE")}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold tracking-wider uppercase transition-all cursor-pointer flex items-center gap-2 ${
              mode === "LIVE"
                ? "bg-emerald-500 text-black shadow-md shadow-emerald-500/20"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <Activity className="h-3.5 w-3.5" />
            <span>Mode A — Live On-Chain</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("SIMULATION")}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold tracking-wider uppercase transition-all cursor-pointer flex items-center gap-2 ${
              mode === "SIMULATION"
                ? "bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-md shadow-amber-500/20"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Mode B — 24M Simulation</span>
          </button>
        </div>
      </div>

      {/* Mode Banner */}
      {mode === "LIVE" ? (
        <div className="p-5 rounded-3xl border border-emerald-500/30 bg-emerald-950/20 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h2 className="text-sm uppercase tracking-widest font-mono font-bold text-emerald-300">
                LIVE ON-CHAIN MODE — BASE SEPOLIA (CHAIN ID 84532)
              </h2>
            </div>
            <p className="text-xs text-neutral-300">
              Reads real-time vault balances, deployed Aave V3 market reserves, and reconciled net strategy performance.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0 text-xs font-mono">
            <span className="px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300">
              Aave V3 Base Sepolia
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold">
              Lending APY: ~5.24% Variable
            </span>
          </div>
        </div>
      ) : (
        <div className="p-5 rounded-3xl border border-amber-500/30 bg-amber-950/20 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              <h2 className="text-sm uppercase tracking-widest font-mono font-bold text-amber-300">
                SIMULATION MODE — ACCELERATED 24-MONTH SCENARIO ENGINE
              </h2>
            </div>
            <p className="text-xs text-neutral-300">
              Pure deterministic daily-compounding calculation. Advances virtual time without modifying on-chain state.
            </p>
          </div>
          <div className="px-3.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] font-mono font-bold text-amber-300 shrink-0">
            SIMULATION ONLY — 8.08% APR HYPOTHETICAL
          </div>
        </div>
      )}

      {/* Action Notification Message */}
      {actionMessage && (
        <div
          className={`p-4 rounded-2xl text-xs flex items-center gap-2.5 ${
            actionMessage.type === "success"
              ? "bg-emerald-950/60 border border-emerald-500/50 text-emerald-300"
              : "bg-red-950/60 border border-red-500/50 text-red-300"
          }`}
        >
          {actionMessage.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          )}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE A: LIVE MODE VIEW */}
      {/* ========================================================================= */}
      {mode === "LIVE" && (
        <div className="space-y-8">
          {/* Top Asset Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-3xl border border-neutral-800 bg-neutral-950/80 space-y-1.5 shadow-xl">
              <div className="flex items-center justify-between text-neutral-400 text-xs uppercase tracking-wider font-bold">
                <span>Vault Idle Cash</span>
                <Coins className="h-4 w-4 text-emerald-400" />
              </div>
              <p className="text-2xl font-bold font-mono text-white">
                {liveState ? liveState.idleVaultBalanceFormatted.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "0.00"}{" "}
                <span className="text-xs text-neutral-500">USDC</span>
              </p>
              <p className="text-[11px] text-neutral-500">Held in circle smart contract vault</p>
            </div>

            <div className="p-5 rounded-3xl border border-neutral-800 bg-neutral-950/80 space-y-1.5 shadow-xl">
              <div className="flex items-center justify-between text-neutral-400 text-xs uppercase tracking-wider font-bold">
                <span>Aave Position</span>
                <TrendingUp className="h-4 w-4 text-cyan-400" />
              </div>
              <p className="text-2xl font-bold font-mono text-cyan-300">
                {liveState ? liveState.aavePositionValueFormatted.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "0.00"}{" "}
                <span className="text-xs text-cyan-500">aUSDC</span>
              </p>
              <p className="text-[11px] text-neutral-500">Supplied to Aave V3 Base Sepolia</p>
            </div>

            <div className="p-5 rounded-3xl border border-neutral-800 bg-neutral-950/80 space-y-1.5 shadow-xl">
              <div className="flex items-center justify-between text-neutral-400 text-xs uppercase tracking-wider font-bold">
                <span>Investable Surplus</span>
                <Zap className="h-4 w-4 text-amber-400" />
              </div>
              <p className="text-2xl font-bold font-mono text-amber-300">
                {liveState ? liveState.investableSurplusFormatted.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "0.00"}{" "}
                <span className="text-xs text-amber-500">USDC</span>
              </p>
              <p className="text-[11px] text-neutral-500">Eligible after protected obligations</p>
            </div>

            <div className="p-5 rounded-3xl border border-neutral-800 bg-neutral-950/80 space-y-1.5 shadow-xl">
              <div className="flex items-center justify-between text-neutral-400 text-xs uppercase tracking-wider font-bold">
                <span>Reconciled Net Yield</span>
                <Sparkles className="h-4 w-4 text-emerald-400" />
              </div>
              <p className="text-2xl font-bold font-mono text-emerald-400">
                +{liveState ? liveState.netStrategyGainFormatted.toFixed(2) : "0.00"}{" "}
                <span className="text-xs text-emerald-500">USDC</span>
              </p>
              <p className="text-[11px] text-neutral-500">Formula: Value + Withdrawn - Supplied</p>
            </div>
          </div>

          {/* Action Panels: Supply & Withdraw */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Supply Form */}
            <div className="p-6 sm:p-8 rounded-3xl border border-neutral-900 bg-neutral-950 shadow-2xl space-y-5">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 font-mono">
                  Supply Action
                </span>
                <h3 className="text-xl font-bold text-white">Supply Surplus to Aave</h3>
                <p className="text-xs text-neutral-400">
                  Routes eligible idle cash into Aave V3 lending reserve on Base Sepolia.
                </p>
              </div>

              <form onSubmit={handleSupply} className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <label className="text-neutral-300 font-bold uppercase tracking-wider">Amount (USDC)</label>
                    <button
                      type="button"
                      onClick={() => setSupplyAmount(String(liveState?.investableSurplusFormatted || 0))}
                      className="text-emerald-400 hover:underline cursor-pointer font-mono"
                    >
                      Max: {liveState?.investableSurplusFormatted.toLocaleString()} USDC
                    </button>
                  </div>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    placeholder="e.g. 5000"
                    value={supplyAmount}
                    onChange={(e) => setSupplyAmount(e.target.value)}
                    required
                    className="w-full rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3.5 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={actionLoading || !supplyAmount || Number(supplyAmount) <= 0}
                  className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
                >
                  {actionLoading ? "Supplying to Aave..." : "Confirm & Supply to Aave"}
                </button>
              </form>
            </div>

            {/* Withdraw Form */}
            <div className="p-6 sm:p-8 rounded-3xl border border-neutral-900 bg-neutral-950 shadow-2xl space-y-5">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-400 font-mono">
                  Withdraw Action
                </span>
                <h3 className="text-xl font-bold text-white">Withdraw to Circle Vault</h3>
                <p className="text-xs text-neutral-400">
                  Redeems aUSDC shares from Aave V3 directly back to the circle vault.
                </p>
              </div>

              <form onSubmit={handleWithdraw} className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <label className="text-neutral-300 font-bold uppercase tracking-wider">Amount (USDC)</label>
                    <button
                      type="button"
                      onClick={() => setWithdrawAmount(String(liveState?.aavePositionValueFormatted || 0))}
                      className="text-cyan-400 hover:underline cursor-pointer font-mono"
                    >
                      Max: {liveState?.aavePositionValueFormatted.toLocaleString()} aUSDC
                    </button>
                  </div>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    placeholder="e.g. 2000"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    required
                    className="w-full rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3.5 text-sm text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={actionLoading || !withdrawAmount || Number(withdrawAmount) <= 0}
                  className="w-full py-3.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-cyan-500/20 cursor-pointer"
                >
                  {actionLoading ? "Withdrawing to Vault..." : "Confirm & Withdraw to Vault"}
                </button>
              </form>
            </div>
          </div>

          {/* On-Chain Transaction & Reconciliation Log */}
          <div className="p-6 sm:p-8 rounded-3xl border border-neutral-900 bg-neutral-950 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Live On-Chain Transaction History</h3>
                <p className="text-xs text-neutral-400">
                  Confirmed blockchain supply and withdrawal events on Base Sepolia.
                </p>
              </div>
              <span className="text-xs font-mono text-neutral-500">
                {transactions.length} Transactions Recorded
              </span>
            </div>

            {transactions.length === 0 ? (
              <div className="p-8 text-center text-neutral-500 text-xs border border-dashed border-neutral-800 rounded-2xl">
                No Aave supply or withdrawal transactions recorded for this circle yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-neutral-800 text-neutral-400 uppercase font-mono text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Operation</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Tx Hash</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-900 font-mono">
                    {transactions.map((t) => (
                      <tr key={t.id} className="hover:bg-neutral-900/50">
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              t.operationType === "SUPPLY"
                                ? "bg-emerald-500/20 text-emerald-400"
                                : "bg-cyan-500/20 text-cyan-400"
                            }`}
                          >
                            {t.operationType}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-white">
                          {(Number(t.amountBaseUnits) / 1e6).toLocaleString()} USDC
                        </td>
                        <td className="py-3 px-4">
                          <a
                            href={`https://sepolia.basescan.org/tx/${t.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-amber-400 hover:underline flex items-center gap-1"
                          >
                            <span>{t.txHash.slice(0, 10)}...{t.txHash.slice(-8)}</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </td>
                        <td className="py-3 px-4 text-emerald-400">
                          {t.status}
                        </td>
                        <td className="py-3 px-4 text-neutral-500">
                          {new Date(t.timestamp).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE B: 24-MONTH SIMULATION ENGINE */}
      {/* ========================================================================= */}
      {mode === "SIMULATION" && (
        <div className="space-y-8">
          {/* Simulation Header & Benchmark KPI */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-3xl border border-neutral-800 bg-neutral-950/80 space-y-1.5 shadow-xl">
              <span className="text-neutral-400 text-xs uppercase tracking-wider font-bold">Total Deposited</span>
              <p className="text-2xl font-bold font-mono text-white">
                {currentMonthRecord ? currentMonthRecord.cumulativeContributions.toLocaleString() : "240,000"}{" "}
                <span className="text-xs text-neutral-500">USDC</span>
              </p>
              <p className="text-[11px] text-neutral-500">
                {simConfig.monthlyContribution.toLocaleString()} USDC × {virtualMonthIndex} Months
              </p>
            </div>

            <div className="p-5 rounded-3xl border border-neutral-800 bg-neutral-950/80 space-y-1.5 shadow-xl">
              <span className="text-neutral-400 text-xs uppercase tracking-wider font-bold">Projected Interest</span>
              <p className="text-2xl font-bold font-mono text-amber-400">
                +{currentMonthRecord ? currentMonthRecord.cumulativeInterest.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "19,601.93"}{" "}
                <span className="text-xs text-amber-500">USDC</span>
              </p>
              <p className="text-[11px] text-neutral-500">Daily-compounding yield accrual</p>
            </div>

            <div className="p-5 rounded-3xl border border-neutral-800 bg-neutral-950/80 space-y-1.5 shadow-xl">
              <span className="text-neutral-400 text-xs uppercase tracking-wider font-bold">Final Simulated Value</span>
              <p className="text-2xl font-bold font-mono text-emerald-400">
                {currentMonthRecord ? currentMonthRecord.closingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "259,601.93"}{" "}
                <span className="text-xs text-emerald-500">USDC</span>
              </p>
              <p className="text-[11px] text-neutral-500">Benchmark @ 8.08% APR</p>
            </div>

            <div className="p-5 rounded-3xl border border-neutral-800 bg-neutral-950/80 space-y-1.5 shadow-xl">
              <span className="text-neutral-400 text-xs uppercase tracking-wider font-bold">Virtual Clock Status</span>
              <p className="text-2xl font-bold font-mono text-white">
                Month {virtualMonthIndex} of {simConfig.durationMonths}
              </p>
              <p className="text-[11px] text-neutral-500">
                Effective APY: {simResult?.effectiveAnnualYield}%
              </p>
            </div>
          </div>

          {/* Virtual Clock Controller & Timeline Presets */}
          <div className="p-6 rounded-3xl border border-neutral-900 bg-neutral-950 shadow-2xl space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white">Accelerated Virtual Clock & Controls</h3>
                <p className="text-xs text-neutral-400">
                  Step through timeline instantly or play continuous accelerated simulation.
                </p>
              </div>

              {/* Playback Button Group */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/20"
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  <span>{isPlaying ? "Pause Clock" : "Play Accelerated"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setVirtualMonthIndex((p) => Math.min(simConfig.durationMonths, p + 1))}
                  className="px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-mono font-bold text-neutral-300 hover:text-white cursor-pointer"
                >
                  +1 Mo
                </button>

                <button
                  type="button"
                  onClick={() => setVirtualMonthIndex((p) => Math.min(simConfig.durationMonths, p + 6))}
                  className="px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-mono font-bold text-neutral-300 hover:text-white cursor-pointer"
                >
                  +6 Mo
                </button>

                <button
                  type="button"
                  onClick={() => setVirtualMonthIndex(simConfig.durationMonths)}
                  className="px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-mono font-bold text-neutral-300 hover:text-white cursor-pointer flex items-center gap-1"
                >
                  <FastForward className="h-3.5 w-3.5" />
                  <span>Max (24M)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsPlaying(false);
                    setVirtualMonthIndex(1);
                  }}
                  className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white cursor-pointer"
                  title="Reset to Month 1"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Slider Timeline */}
            <div className="space-y-2">
              <input
                type="range"
                min="1"
                max={simConfig.durationMonths}
                value={virtualMonthIndex}
                onChange={(e) => setVirtualMonthIndex(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <div className="flex justify-between text-[11px] font-mono text-neutral-500">
                <span>Month 1</span>
                <span>Month 6</span>
                <span>Month 12</span>
                <span>Month 18</span>
                <span>Month 24 (Maturity)</span>
              </div>
            </div>

            {/* Scenario Configuration Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-neutral-900">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                  Monthly Contribution (USDC)
                </label>
                <input
                  type="number"
                  value={simConfig.monthlyContribution}
                  onChange={(e) =>
                    setSimConfig((p) => ({ ...p, monthlyContribution: Number(e.target.value) || 0 }))
                  }
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3.5 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                  Hypothetical APR (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={(simConfig.hypotheticalAPR * 100).toFixed(2)}
                  onChange={(e) =>
                    setSimConfig((p) => ({ ...p, hypotheticalAPR: (Number(e.target.value) || 0) / 100 }))
                  }
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3.5 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                  Deposit Timing Convention
                </label>
                <select
                  value={simConfig.depositTiming}
                  onChange={(e) =>
                    setSimConfig((p) => ({ ...p, depositTiming: e.target.value as any }))
                  }
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3.5 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="END_OF_MONTH">End of Month (Benchmark)</option>
                  <option value="BEGINNING_OF_MONTH">Beginning of Month</option>
                </select>
              </div>
            </div>
          </div>

          {/* Monthly Simulation Ledger Table */}
          <div className="p-6 sm:p-8 rounded-3xl border border-neutral-900 bg-neutral-950 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Deterministic Monthly Ledger</h3>
                <p className="text-xs text-neutral-400">
                  Exact reconciliation of opening balances, contributions, interest accrual, and closing balances.
                </p>
              </div>
              <span className="text-xs font-mono text-amber-400">
                Showing {visibleSimRecords.length} of {simConfig.durationMonths} Months
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-neutral-800 text-neutral-400 uppercase font-mono text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Month</th>
                    <th className="py-3 px-4">Virtual Period</th>
                    <th className="py-3 px-4">Opening Balance</th>
                    <th className="py-3 px-4">New Deposit</th>
                    <th className="py-3 px-4">Simulated Yield</th>
                    <th className="py-3 px-4">Closing Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-900 font-mono">
                  {visibleSimRecords.map((rec) => (
                    <tr key={rec.month} className="hover:bg-neutral-900/50">
                      <td className="py-3 px-4 font-bold text-neutral-300">
                        Month {rec.month}
                      </td>
                      <td className="py-3 px-4 text-neutral-400">
                        {rec.virtualDate}
                      </td>
                      <td className="py-3 px-4 text-neutral-300">
                        {rec.openingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })} USDC
                      </td>
                      <td className="py-3 px-4 text-white font-bold">
                        +{rec.newContribution.toLocaleString(undefined, { minimumFractionDigits: 2 })} USDC
                      </td>
                      <td className="py-3 px-4 text-amber-400 font-bold">
                        +{rec.simulatedInterest.toLocaleString(undefined, { minimumFractionDigits: 2 })} USDC
                      </td>
                      <td className="py-3 px-4 text-emerald-400 font-bold">
                        {rec.closingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })} USDC
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
