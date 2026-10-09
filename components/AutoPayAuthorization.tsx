"use client";

import React, { useState } from "react";
import { useAutoPaySession } from "@/hooks/useAutoPaySession";
import {
  ShieldCheck,
  Clock,
  Coins,
  AlertTriangle,
  CheckCircle2,
  Zap,
  TrendingUp,
  Cpu,
  Layers,
  ArrowRight,
  RefreshCw,
  Lock,
} from "lucide-react";

interface AutoPayAuthorizationProps {
  circleId: string;
  circleName: string;
  monthlyAmountUSDC: number;
  durationMonths: number;
  vaultAddress?: string;
}

export function AutoPayAuthorization({
  circleId,
  circleName,
  monthlyAmountUSDC,
  durationMonths,
  vaultAddress = "0x9855Eb173A0B31A8FaF7A9B3f1cb6754E9B3a3B1",
}: AutoPayAuthorizationProps) {
  const {
    smartWalletAddress,
    isAuthorizing,
    isTriggeringKeeper,
    sessionData,
    error,
    lastKeeperResult,
    authorizeSmartSession,
    triggerKeeperExecution,
  } = useAutoPaySession(circleId, monthlyAmountUSDC, vaultAddress);

  const [activeTab, setActiveTab] = useState<"overview" | "layers" | "bookend" | "simulator">("overview");

  const totalReserveBuffer = monthlyAmountUSDC * 3;
  const isAuthorized = !!sessionData && sessionData.status === "ACTIVE";

  return (
    <div className="w-full bg-[#0a0e17] border border-cyan-500/20 rounded-2xl p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden backdrop-blur-xl">
      {/* Background ambient glow */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-6 relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              ERC-7579 SmartSessions
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30">
              Chainlink Automation
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Base Sepolia (84532)
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-white via-cyan-200 to-cyan-400 bg-clip-text text-transparent">
            Decentralized Web3 Auto-Pay Engine
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Non-custodial, recurring pull engine for <span className="text-cyan-300 font-semibold">{circleName}</span> with cryptographic limits & failsafe collateral.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isAuthorized ? (
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-4 py-2 rounded-xl text-emerald-400">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Session Mandate</p>
                <p className="text-sm font-bold">Active & Enforced</p>
              </div>
            </div>
          ) : (
            <button
              onClick={() => authorizeSmartSession()}
              disabled={isAuthorizing}
              className="px-5 py-2.5 rounded-xl font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/25 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isAuthorizing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Signing EIP-712 Mandate...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  Grant SmartSession Mandate
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="flex items-center gap-2 mt-6 border-b border-gray-800 pb-2 overflow-x-auto text-sm">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            activeTab === "overview"
              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
              : "text-gray-400 hover:text-white"
          }`}
        >
          Overview & Status
        </button>
        <button
          onClick={() => setActiveTab("layers")}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            activeTab === "layers"
              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
              : "text-gray-400 hover:text-white"
          }`}
        >
          3-Layer Architecture
        </button>
        <button
          onClick={() => setActiveTab("bookend")}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            activeTab === "bookend"
              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
              : "text-gray-400 hover:text-white"
          }`}
        >
          Bookend Schedule
        </button>
        <button
          onClick={() => setActiveTab("simulator")}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            activeTab === "simulator"
              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
              : "text-gray-400 hover:text-white"
          }`}
        >
          ⚡ Keeper Simulator
        </button>
      </div>

      {/* Tab: Overview */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5">
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs uppercase tracking-wider font-semibold">Monthly Amount</span>
              <Coins className="w-5 h-5 text-cyan-400" />
            </div>
            <p className="text-2xl font-bold text-white">${monthlyAmountUSDC.toLocaleString()} USDC</p>
            <p className="text-xs text-gray-400 mt-2">
              Strictly enforced on-chain via <span className="text-cyan-300">ERC20SpendingLimitPolicy</span>
            </p>
          </div>

          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5">
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs uppercase tracking-wider font-semibold">Locked 3-Mo Reserve</span>
              <Lock className="w-5 h-5 text-purple-400" />
            </div>
            <p className="text-2xl font-bold text-white">${totalReserveBuffer.toLocaleString()} USDC</p>
            <p className="text-xs text-gray-400 mt-2">
              Layer 3 Solvency Collateral. Slashed 1-month if pull bounces.
            </p>
          </div>

          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5">
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs uppercase tracking-wider font-semibold">Auto-Pay Trigger</span>
              <Clock className="w-5 h-5 text-emerald-400" />
            </div>
            <p className="text-2xl font-bold text-white">1st of Month</p>
            <p className="text-xs text-gray-400 mt-2">
              Chainlink <span className="text-emerald-300">checkUpkeep</span> custom logic alarm clock
            </p>
          </div>
        </div>
      )}

      {/* Tab: 3-Layer Architecture */}
      {activeTab === "layers" && (
        <div className="space-y-4 mt-6">
          {/* Layer 1 */}
          <div className="bg-gray-900/70 border border-blue-500/30 rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 font-bold">
                L1
              </div>
              <div>
                <h4 className="font-bold text-base text-white">Layer 1: Off-Chain Timing Trigger (Chainlink Automation)</h4>
                <p className="text-xs text-gray-400">
                  Decentralized alarm clock monitoring <code className="text-blue-300">checkUpkeep()</code> off-chain every block for free.
                </p>
              </div>
            </div>
            <div className="mt-3 bg-black/40 rounded-lg p-3 text-xs text-gray-300 font-mono">
              checkUpkeep() -> Checks if 1st of month reached && funds uncollected -> upkeepNeeded: true -> performUpkeep()
            </div>
          </div>

          {/* Layer 2 */}
          <div className="bg-gray-900/70 border border-cyan-500/30 rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-bold">
                L2
              </div>
              <div>
                <h4 className="font-bold text-base text-white">Layer 2: On-Chain Cryptographic Check (Rhinestone SmartSessions)</h4>
                <p className="text-xs text-gray-400">
                  Biconomy Nexus smart account validates the EIP-712 session mandate signed on Day 1.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
              <div className="bg-black/40 rounded-lg p-3 text-xs">
                <span className="font-semibold text-cyan-300 block mb-1">TimeFramePolicy</span>
                <p className="text-gray-400">Enforces at least 30 days between deductions.</p>
              </div>
              <div className="bg-black/40 rounded-lg p-3 text-xs">
                <span className="font-semibold text-cyan-300 block mb-1">ERC20SpendingLimitPolicy</span>
                <p className="text-gray-400">Restricts pull to strictly ${monthlyAmountUSDC} USDC.</p>
              </div>
            </div>
          </div>

          {/* Layer 3 */}
          <div className="bg-gray-900/70 border border-purple-500/30 rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 font-bold">
                L3
              </div>
              <div>
                <h4 className="font-bold text-base text-white">Layer 3: Failsafe Solvency Verification</h4>
                <p className="text-xs text-gray-400">
                  Guarantees the communal pot survives even if a member has insufficient funds.
                </p>
              </div>
            </div>
            <div className="mt-3 bg-black/40 rounded-lg p-3 text-xs text-gray-300">
              If SmartSession pull bounces -> ChitGroup smart contract automatically slashes 1-month collateral (${monthlyAmountUSDC} USDC) from the member's locked 3-month reserve buffer to keep the pool 100% whole.
            </div>
          </div>
        </div>
      )}

      {/* Tab: Bookend Schedule */}
      {activeTab === "bookend" && (
        <div className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-900/70 border border-emerald-500/30 rounded-xl p-5">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm mb-2">
                <TrendingUp className="w-4 h-4" />
                Month 1: The Yield Primer
              </div>
              <p className="text-xs text-gray-300">
                Pulls Month 1 contribution from all members on Day 1. <span className="text-emerald-300 font-semibold">No bidding</span> occurs. Full pot + 3-month reserves immediately flow into Aave V3 to generate baseline DeFi yield for 30 full days.
              </p>
            </div>

            <div className="bg-gray-900/70 border border-cyan-500/30 rounded-xl p-5">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm mb-2">
                <RefreshCw className="w-4 h-4" />
                Months 2..N-1: The Core Loop
              </div>
              <p className="text-xs text-gray-300">
                Chainlink triggers the auto-pay pull on the <span className="text-cyan-300 font-semibold">1st of every month</span>. Funds the communal pot before the Day 2 auction reveal, ensuring the winner can claim immediately.
              </p>
            </div>

            <div className="bg-gray-900/70 border border-purple-500/30 rounded-xl p-5">
              <div className="flex items-center gap-2 text-purple-400 font-bold text-sm mb-2">
                <Zap className="w-4 h-4" />
                Month N: The Grand Settlement
              </div>
              <p className="text-xs text-gray-300">
                Auto-pay pulls final installment. Bidding is disabled. Contract settles final pot plus the <span className="text-purple-300 font-semibold">entire compounded dividend pool</span> to the final member.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Keeper Simulator */}
      {activeTab === "simulator" && (
        <div className="mt-6 bg-gray-900/80 border border-cyan-500/30 rounded-xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-4">
            <div>
              <h4 className="font-bold text-base text-white flex items-center gap-2">
                <Cpu className="w-5 h-5 text-cyan-400" />
                Chainlink Automation Fast-Forward Trigger
              </h4>
              <p className="text-xs text-gray-400">
                Simulate off-chain Chainlink keeper checkUpkeep trigger & on-chain SmartSession execution.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => triggerKeeperExecution(false)}
                disabled={isTriggeringKeeper}
                className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {isTriggeringKeeper ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                Simulate Normal Debit
              </button>

              <button
                onClick={() => triggerKeeperExecution(true)}
                disabled={isTriggeringKeeper}
                className="px-4 py-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-semibold text-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                Test Solvency Slashing Fallback
              </button>
            </div>
          </div>

          {lastKeeperResult && (
            <div className="mt-4 bg-black/60 border border-gray-800 rounded-lg p-4 font-mono text-xs text-gray-300 space-y-2">
              <div className="flex items-center justify-between text-cyan-400 font-bold border-b border-gray-800 pb-1">
                <span>Execution Result</span>
                <span>{lastKeeperResult.timestamp}</span>
              </div>
              <p>
                <strong className="text-blue-400">Layer 1 (Chainlink):</strong> {lastKeeperResult.layer1.reason}
              </p>
              <p>
                <strong className="text-cyan-400">Layer 2 (SmartSession):</strong> {lastKeeperResult.layer2.status} (
                {lastKeeperResult.layer2.spendingLimitPolicy})
              </p>
              <p>
                <strong className="text-purple-400">Layer 3 (Failsafe):</strong> {lastKeeperResult.layer3.fallbackAction}
              </p>
              <p>
                <strong className="text-emerald-400">Bookend Phase:</strong> {lastKeeperResult.lifecycle.phase} -{" "}
                {lastKeeperResult.lifecycle.note}
              </p>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mt-4 bg-rose-500/10 border border-rose-500/30 text-rose-400 px-4 py-3 rounded-xl text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
