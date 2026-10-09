"use client";

import React, { useState, useEffect } from "react";
import { useAutoPaySession } from "@/hooks/useAutoPaySession";
import { useDevUser } from "@/components/providers";
import {
  ShieldCheck,
  Clock,
  Coins,
  AlertTriangle,
  CheckCircle2,
  Zap,
  TrendingUp,
  Cpu,
  RefreshCw,
  Lock,
  Users,
  UserCheck,
  UserX,
} from "lucide-react";

interface MemberItem {
  walletAddress: string;
  username: string;
  displayName?: string;
  isVolunteer?: boolean;
}

interface AutoPayAuthorizationProps {
  circleId: string;
  circleName: string;
  monthlyAmountUSDC: number;
  durationMonths: number;
  vaultAddress?: string;
  members?: MemberItem[];
}

export function AutoPayAuthorization({
  circleId,
  circleName,
  monthlyAmountUSDC,
  durationMonths,
  vaultAddress = "0x9855Eb173A0B31A8FaF7A9B3f1cb6754E9B3a3B1",
  members = [],
}: AutoPayAuthorizationProps) {
  const { user } = useDevUser();
  const {
    smartWalletAddress,
    isAuthorizing,
    isTriggeringKeeper,
    isBatchDebiting,
    walletBalanceUSDC,
    circleVaultUSDC,
    sessionData,
    allMemberConsents,
    error,
    lastKeeperResult,
    lastBatchResult,
    authorizeSmartSession,
    triggerKeeperExecution,
    triggerBatchKeeperDebit,
    refreshSession,
  } = useAutoPaySession(circleId, monthlyAmountUSDC, vaultAddress);

  const [activeTab, setActiveTab] = useState<"overview" | "members" | "layers" | "bookend" | "simulator">("overview");

  const totalReserveBuffer = monthlyAmountUSDC * 3;
  const isCurrentUserAuthorized = !!sessionData && sessionData.status === "ACTIVE";

  // Check which members have granted their own mandates
  const activeMandateCount = members.reduce((acc, m) => {
    const isOwner = m.walletAddress.toLowerCase() === smartWalletAddress.toLowerCase() && isCurrentUserAuthorized;
    const isConsentGiven = allMemberConsents.some(
      (c) => c.memberAddress.toLowerCase() === m.walletAddress.toLowerCase() && c.status === "GIVEN"
    );
    return acc + (isOwner || isConsentGiven ? 1 : 0);
  }, 0);

  const totalMembersCount = members.length > 0 ? members.length : 1;
  const allMandatesComplete = members.length > 0 && activeMandateCount >= members.length;

  const [poolingMemberWallet, setPoolingMemberWallet] = useState<string | null>(null);
  const [memberDebitSuccess, setMemberDebitSuccess] = useState<string | null>(null);

  const poolIndividualAccount = async (targetWallet: string, targetUsername: string) => {
    setPoolingMemberWallet(targetWallet);
    setMemberDebitSuccess(null);
    try {
      const res = await fetch("/api/keeper/trigger-debit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          circleId,
          memberAddress: targetWallet.toLowerCase(),
          monthlyAmount: monthlyAmountUSDC,
          simulateBounce: false,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to pool funds");
      }
      setMemberDebitSuccess(`✓ Debited $${monthlyAmountUSDC.toLocaleString()} USDC from @${targetUsername} -> Pooled into Smart Contract Vault!`);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("chitchain_balance_updated"));
      }
      await refreshSession();
    } catch (e: any) {
      console.error("Individual pool error:", e);
    } finally {
      setPoolingMemberWallet(null);
    }
  };

  const handleBatchPoolClick = async () => {
    setMemberDebitSuccess(null);
    try {
      const data = await triggerBatchKeeperDebit();
      setMemberDebitSuccess(`✓ All ${data.totalParticipants} member contributions pooled successfully ($${Number(data.totalPooledUSDC).toLocaleString()} USDC total) into Circle Vault!`);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("chitchain_balance_updated"));
      }
    } catch (e) {
      console.error("Batch pool error:", e);
    }
  };

  const [isFastClockRunning, setIsFastClockRunning] = useState(false);
  const [simulatedDay, setSimulatedDay] = useState(1);
  const [clockEvents, setClockEvents] = useState<string[]>([
    "System Ready. Fast-Forward Auto-Pay Clock simulates 1 Month in 30 seconds (1 sec = 1 day).",
  ]);

  // Automatic pooling trigger when all circle members have granted their mandate
  useEffect(() => {
    if (allMandatesComplete && circleVaultUSDC === 0 && !isBatchDebiting) {
      triggerBatchKeeperDebit()
        .then((res) => {
          setMemberDebitSuccess(
            `✓ All mandates complete! Automatically pooled $${Number(res.totalPooledUSDC).toLocaleString()} USDC from all ${res.totalParticipants} participants into Circle Vault.`
          );
          setClockEvents((prev) => [
            `⚡ [All Mandates Complete] Automated Keeper triggered -> $${Number(res.totalPooledUSDC).toLocaleString()} USDC pooled into Smart Contract Vault!`,
            ...prev.slice(0, 10),
          ]);
          if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("chitchain_balance_updated"));
          }
        })
        .catch(() => {});
    }
  }, [allMandatesComplete, circleVaultUSDC, isBatchDebiting, triggerBatchKeeperDebit]);

  // Fast-Forward Clock Effect: 1 Month Simulation (Day 1 to 30 = 30 seconds)
  useEffect(() => {
    if (!isFastClockRunning) return;

    const timer = setInterval(() => {
      setSimulatedDay((prevDay) => {
        if (prevDay >= 30) {
          setIsFastClockRunning(false);
          setClockEvents((prev) => [
            `🎉 [Day 30 Reached] Month 1 Cycle Complete! All contributions pooled & secured in smart contract vault with 3-month reserve buffer.`,
            ...prev.slice(0, 10),
          ]);
          return 30;
        }
        return prevDay + 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isFastClockRunning]);

  const toggleFastClock = () => {
    if (!isFastClockRunning) {
      if (simulatedDay === 1 && circleVaultUSDC === 0) {
        triggerBatchKeeperDebit()
          .then((res) => {
            setClockEvents((prev) => [
              `🚀 [Day 1 - Start of Month] Automated Auto-Pay debited $${Number(res.totalPooledUSDC).toLocaleString()} USDC from member accounts into Circle Vault.`,
              ...prev.slice(0, 10),
            ]);
            if (typeof window !== "undefined") {
              window.dispatchEvent(new Event("chitchain_balance_updated"));
            }
          })
          .catch(() => {});
      }
    }
    setIsFastClockRunning(!isFastClockRunning);
  };

  const resetFastClock = () => {
    setIsFastClockRunning(false);
    setSimulatedDay(1);
    setClockEvents((prev) => [
      `🔄 Clock reset to Month 1, Day 1.`,
      ...prev.slice(0, 10),
    ]);
  };

  return (
    <div className="w-full bg-[#07090e] border border-white/10 rounded-2xl p-6 sm:p-7 text-white shadow-xl relative overflow-hidden font-sans">
      {/* Header section matching website UI */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6 relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-white/[0.04] text-neutral-300 border border-white/10">
              ERC-7579 SmartSessions
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
              Chainlink Automation
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-white/[0.04] text-neutral-300 border border-white/10">
              Base Sepolia
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Decentralized Auto-Pay Engine
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Non-custodial wallet mandates for <span className="text-white font-medium">{circleName}</span> with automated keeper debit & collateral solvency.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* User Account Balance Tag */}
          <div className="px-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-xs flex items-center gap-2">
            <span className="text-neutral-400 font-medium">Your Balance:</span>
            <span className="font-mono font-bold text-white">${walletBalanceUSDC.toLocaleString()} USDC</span>
          </div>

          {isCurrentUserAuthorized ? (
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-2 rounded-xl text-emerald-400">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <div>
                <p className="text-[9px] text-neutral-400 uppercase tracking-wider font-semibold">Your Mandate</p>
                <p className="text-xs font-bold">Active & Signed</p>
              </div>
            </div>
          ) : (
            <button
              onClick={() => authorizeSmartSession()}
              disabled={isAuthorizing}
              className="px-4 py-2 rounded-xl font-semibold bg-white text-black hover:bg-neutral-200 transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer text-xs shadow-sm"
            >
              {isAuthorizing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Signing Mandate...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Grant Your Mandate</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Fast-Forward 1-Month Auto-Pay Clock Widget (ChitChain UI style) */}
      <div className="mt-5 p-4 rounded-2xl bg-white/[0.02] border border-white/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                {isFastClockRunning && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                )}
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isFastClockRunning ? "bg-cyan-400" : "bg-neutral-600"}`}></span>
              </span>
              <span className="text-xs font-semibold text-white tracking-tight">
                1-Month Auto-Pay Simulation (1 sec = 1 day)
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/[0.04] text-neutral-300 border border-white/10">
                30s = 1 Month
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-neutral-400">
              <span className="font-mono text-white text-xs font-semibold">
                Day <span className="text-cyan-400">{simulatedDay}</span> of 30
              </span>
              <span>•</span>
              <span>
                {simulatedDay >= 30 ? (
                  <strong className="text-emerald-400 font-mono">Month 1 Complete 🎉</strong>
                ) : (
                  <>
                    Month 1 Auto-Pay Active: <strong className="text-cyan-300 font-mono">{30 - simulatedDay}s remaining</strong>
                  </>
                )}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleFastClock}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                isFastClockRunning
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30"
                  : "bg-white text-black hover:bg-neutral-200 shadow-sm"
              }`}
            >
              {isFastClockRunning ? (
                <>
                  <Clock className="w-3.5 h-3.5 animate-spin" />
                  <span>Pause Simulation</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5" />
                  <span>{simulatedDay >= 30 ? "Re-Run 1-Month Simulation" : "Start 1-Month Simulation"}</span>
                </>
              )}
            </button>

            <button
              onClick={resetFastClock}
              className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.06] text-neutral-300 text-xs font-medium transition-colors cursor-pointer"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-3.5 w-full bg-white/[0.05] rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-gradient-to-r from-cyan-400 via-blue-500 to-emerald-400 h-1.5 rounded-full transition-all duration-1000"
            style={{ width: `${(simulatedDay / 30) * 100}%` }}
          />
        </div>

        {/* Event Logs */}
        {clockEvents.length > 0 && (
          <div className="mt-3 p-2.5 rounded-xl bg-black/40 border border-white/5 text-[11px] font-mono text-neutral-300 max-h-20 overflow-y-auto space-y-1">
            {clockEvents.slice(0, 3).map((evt, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span className="text-cyan-400 shrink-0">▸</span>
                <span>{evt}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {memberDebitSuccess && (
        <div className="mt-4 p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{memberDebitSuccess}</span>
          </div>
          <button
            onClick={() => setMemberDebitSuccess(null)}
            className="text-neutral-400 hover:text-white text-xs cursor-pointer ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Navigation tabs matching website style */}
      <div className="flex items-center gap-2 mt-6 border-b border-white/10 pb-3 overflow-x-auto text-xs">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-3.5 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer ${
            activeTab === "overview"
              ? "bg-white text-black"
              : "border border-white/10 text-neutral-400 hover:text-white hover:bg-white/[0.04]"
          }`}
        >
          Overview & Policies
        </button>
        <button
          onClick={() => setActiveTab("members")}
          className={`px-3.5 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === "members"
              ? "bg-white text-black"
              : "border border-white/10 text-neutral-400 hover:text-white hover:bg-white/[0.04]"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Member Mandate Status ({activeMandateCount}/{totalMembersCount})</span>
        </button>
        <button
          onClick={() => setActiveTab("layers")}
          className={`px-3.5 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer ${
            activeTab === "layers"
              ? "bg-white text-black"
              : "border border-white/10 text-neutral-400 hover:text-white hover:bg-white/[0.04]"
          }`}
        >
          3-Layer Architecture
        </button>
        <button
          onClick={() => setActiveTab("bookend")}
          className={`px-3.5 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer ${
            activeTab === "bookend"
              ? "bg-white text-black"
              : "border border-white/10 text-neutral-400 hover:text-white hover:bg-white/[0.04]"
          }`}
        >
          Bookend Schedule
        </button>
        <button
          onClick={() => setActiveTab("simulator")}
          className={`px-3.5 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer ${
            activeTab === "simulator"
              ? "bg-white text-black"
              : "border border-white/10 text-neutral-400 hover:text-white hover:bg-white/[0.04]"
          }`}
        >
          Keeper Simulator
        </button>
      </div>

      {/* Tab: Overview */}
      {activeTab === "overview" && (
        <div className="space-y-4 mt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-4">
              <div className="flex items-center justify-between text-neutral-400 mb-1.5">
                <span className="text-[11px] uppercase tracking-wider font-semibold">Monthly Limit</span>
                <Coins className="w-4 h-4 text-neutral-400" />
              </div>
              <p className="text-xl font-bold text-white font-mono">${monthlyAmountUSDC.toLocaleString()} USDC</p>
              <p className="text-[10px] text-neutral-400 mt-1">
                ERC20SpendingLimit
              </p>
            </div>

            <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-4">
              <div className="flex items-center justify-between text-neutral-400 mb-1.5">
                <span className="text-[11px] uppercase tracking-wider font-semibold">Locked Reserve</span>
                <Lock className="w-4 h-4 text-purple-400" />
              </div>
              <p className="text-xl font-bold text-white font-mono">${totalReserveBuffer.toLocaleString()} USDC</p>
              <p className="text-[10px] text-neutral-400 mt-1">
                3-Month Solvency Buffer
              </p>
            </div>

            <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-4">
              <div className="flex items-center justify-between text-neutral-400 mb-1.5">
                <span className="text-[11px] uppercase tracking-wider font-semibold">Mandates</span>
                <Clock className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-xl font-bold text-white font-mono">
                {activeMandateCount} of {totalMembersCount} Signed
              </p>
              <p className="text-[10px] text-neutral-400 mt-1">
                Non-custodial signatures
              </p>
            </div>

            <div className="bg-cyan-950/20 border border-cyan-500/30 rounded-2xl p-4">
              <div className="flex items-center justify-between text-cyan-400 mb-1.5">
                <span className="text-[11px] uppercase tracking-wider font-semibold">Circle Vault Pool</span>
                <Zap className="w-4 h-4 text-cyan-300" />
              </div>
              <p className="text-xl font-bold text-cyan-300 font-mono">${circleVaultUSDC.toLocaleString()} USDC</p>
              <p className="text-[10px] text-cyan-400/80 mt-1">
                Pooled in smart contract
              </p>
            </div>
          </div>

          {/* Action Banner */}
          <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="font-bold text-white text-xs flex items-center gap-2">
                <Zap className="w-4 h-4 text-cyan-400" />
                <span>Automated Keeper Pooling Pipeline</span>
              </p>
              <p className="text-xs text-neutral-400 mt-0.5">
                Automatically pools monthly contributions from all authorized smart accounts at the start of the month.
              </p>
            </div>
            <button
              onClick={handleBatchPoolClick}
              disabled={isBatchDebiting}
              className="px-4 py-2 rounded-xl bg-white text-black hover:bg-neutral-200 font-semibold text-xs transition-colors flex items-center gap-2 shrink-0 cursor-pointer disabled:opacity-50 shadow-sm"
            >
              {isBatchDebiting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Pooling Funds...</span>
                </>
              ) : (
                <>
                  <Coins className="w-3.5 h-3.5 text-black" />
                  <span>Pool Monthly Pot Now</span>
                </>
              )}
            </button>
          </div>

          <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-4 text-xs text-neutral-300 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-white text-xs mb-0.5">Non-Custodial Multi-Account Mandates</p>
              <p className="text-neutral-400 text-xs">
                When a member grants a mandate, the cryptographic permission is tied strictly to their personal wallet address. Other participants cannot mandate on your behalf.
              </p>
            </div>
          </div>

          {/* Member List in Overview */}
          {members.length > 0 && (
            <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Participant Autopay Status</span>
                </p>
                <span className="text-[11px] font-mono text-neutral-400">
                  {activeMandateCount} of {totalMembersCount} Authorized
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {members.map((m) => {
                  const isCurrent = m.walletAddress.toLowerCase() === smartWalletAddress.toLowerCase();
                  const hasConsent =
                    (isCurrent && isCurrentUserAuthorized) ||
                    allMemberConsents.some(
                      (c) => c.memberAddress.toLowerCase() === m.walletAddress.toLowerCase() && c.status === "GIVEN"
                    );
                  const isPoolingThis = poolingMemberWallet === m.walletAddress.toLowerCase();

                  return (
                    <div
                      key={m.walletAddress}
                      className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-2 transition-colors ${
                        hasConsent
                          ? "bg-emerald-950/10 border-emerald-500/20"
                          : "bg-white/[0.01] border-white/5"
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-white truncate text-xs">
                            {m.displayName || m.username}
                          </span>
                          {isCurrent && (
                            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-white/[0.06] text-neutral-300 border border-white/10">
                              You
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] font-mono text-neutral-500 truncate">
                          {m.walletAddress.slice(0, 6)}...{m.walletAddress.slice(-4)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {hasConsent ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 whitespace-nowrap">
                            ✓ Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30 whitespace-nowrap">
                            Pending
                          </span>
                        )}

                        <button
                          onClick={() => poolIndividualAccount(m.walletAddress, m.username)}
                          disabled={isPoolingThis}
                          className="px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-white font-medium text-[10px] transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1"
                          title={`Pool $${monthlyAmountUSDC} from @${m.username}`}
                        >
                          {isPoolingThis ? (
                            <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                          ) : (
                            <Zap className="w-2.5 h-2.5 text-cyan-400" />
                          )}
                          <span>Pool ${monthlyAmountUSDC}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Member Mandate Status Matrix */}
      {activeTab === "members" && (
        <div className="space-y-4 mt-6">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-neutral-400" />
              <span>Participant Mandate Matrix</span>
            </h4>
            <span className="text-xs text-neutral-400 font-mono">
              {allMandatesComplete ? "🎉 All Mandates Ready" : `${totalMembersCount - activeMandateCount} pending`}
            </span>
          </div>

          <div className="space-y-2">
            {members.length === 0 ? (
              <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-4 text-center text-xs text-neutral-500 font-mono">
                No participants joined yet.
              </div>
            ) : (
              members.map((m) => {
                const isCurrent = m.walletAddress.toLowerCase() === smartWalletAddress.toLowerCase();
                const hasConsent =
                  (isCurrent && isCurrentUserAuthorized) ||
                  allMemberConsents.some(
                    (c) => c.memberAddress.toLowerCase() === m.walletAddress.toLowerCase() && c.status === "GIVEN"
                  );
                const isPoolingThis = poolingMemberWallet === m.walletAddress.toLowerCase();

                return (
                  <div
                    key={m.walletAddress}
                    className="p-3.5 rounded-2xl border border-white/10 bg-white/[0.02] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white text-xs">
                          {m.displayName || m.username}
                          {isCurrent && " (Your Account)"}
                        </span>
                        <span className="text-neutral-400 font-mono text-[11px]">@{m.username}</span>
                        {m.isVolunteer && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono border border-white/10 text-neutral-300 bg-white/[0.04]">
                            Volunteer
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] font-mono text-neutral-500">
                        Smart Account: {m.walletAddress.slice(0, 8)}...{m.walletAddress.slice(-6)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {hasConsent ? (
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Mandate Active</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-400">
                            <UserX className="w-3.5 h-3.5" />
                            <span>Pending Signature</span>
                          </div>
                          {isCurrent && (
                            <button
                              onClick={() => authorizeSmartSession()}
                              disabled={isAuthorizing}
                              className="px-3 py-1 rounded-xl bg-white text-black font-semibold text-xs hover:bg-neutral-200 transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
                            >
                              {isAuthorizing ? "Signing..." : "Sign Now"}
                            </button>
                          )}
                        </div>
                      )}

                      <button
                        onClick={() => poolIndividualAccount(m.walletAddress, m.username)}
                        disabled={isPoolingThis}
                        className="px-3 py-1 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-white font-medium text-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {isPoolingThis ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <Coins className="w-3 h-3 text-cyan-400" />
                        )}
                        <span>Pool ${monthlyAmountUSDC}</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Tab: 3-Layer Architecture */}
      {activeTab === "layers" && (
        <div className="space-y-3 mt-6">
          <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-cyan-400 font-bold text-xs font-mono">
                L1
              </div>
              <div>
                <h4 className="font-semibold text-sm text-white">Layer 1: Off-Chain Timing Trigger (Chainlink Automation)</h4>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Decentralized alarm clock monitoring <code className="text-cyan-300 font-mono text-[11px]">checkUpkeep()</code> off-chain every block for free.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-blue-400 font-bold text-xs font-mono">
                L2
              </div>
              <div>
                <h4 className="font-semibold text-sm text-white">Layer 2: On-Chain Cryptographic Check (Rhinestone SmartSessions)</h4>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Each participant's Biconomy Nexus smart account validates the EIP-712 mandate signed from their own wallet.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-purple-400 font-bold text-xs font-mono">
                L3
              </div>
              <div>
                <h4 className="font-semibold text-sm text-white">Layer 3: Failsafe Solvency Verification</h4>
                <p className="text-xs text-neutral-400 mt-0.5">
                  If an individual pull bounces &rarr; Slashes 1-month collateral from that member&apos;s locked 3-month reserve buffer.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Bookend Schedule */}
      {activeTab === "bookend" && (
        <div className="space-y-3 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-4">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs mb-1.5">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Month 1: The Yield Primer</span>
              </div>
              <p className="text-xs text-neutral-400">
                Pulls Month 1 contribution from all members on Day 1. No bidding occurs. Full pot + 3-month reserves flow into Aave V3.
              </p>
            </div>

            <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-4">
              <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs mb-1.5">
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Months 2..N-1: The Core Loop</span>
              </div>
              <p className="text-xs text-neutral-400">
                Chainlink triggers the auto-pay pull on the 1st of every month before Day 2 auction reveal.
              </p>
            </div>

            <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-4">
              <div className="flex items-center gap-2 text-purple-400 font-semibold text-xs mb-1.5">
                <Zap className="w-3.5 h-3.5" />
                <span>Month N: Grand Settlement</span>
              </div>
              <p className="text-xs text-neutral-400">
                Auto-pay pulls final installment. Settles final pot + accumulated dividend pool to the final member.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Keeper Simulator */}
      {activeTab === "simulator" && (
        <div className="mt-6 bg-white/[0.02] border border-white/10 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <h4 className="font-bold text-sm text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                <span>Chainlink Automation Fast-Forward Trigger</span>
              </h4>
              <p className="text-xs text-neutral-400 mt-0.5">
                Simulate automated checkUpkeep trigger & Layer 2/3 execution across members.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => triggerKeeperExecution(false)}
                disabled={isTriggeringKeeper}
                className="px-3.5 py-1.5 rounded-xl bg-white text-black hover:bg-neutral-200 font-semibold text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {isTriggeringKeeper ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 text-cyan-500" />}
                <span>Simulate Normal Debit</span>
              </button>

              <button
                onClick={() => triggerKeeperExecution(true)}
                disabled={isTriggeringKeeper}
                className="px-3.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 font-semibold text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span>Test Solvency Slashing Fallback</span>
              </button>
            </div>
          </div>

          {lastKeeperResult && (
            <div className="bg-black/40 border border-white/10 rounded-xl p-4 font-mono text-xs text-neutral-300 space-y-1.5">
              <div className="flex items-center justify-between text-cyan-400 font-bold border-b border-white/10 pb-1">
                <span>Execution Receipt</span>
                <span>{lastKeeperResult.timestamp}</span>
              </div>
              <p>
                <strong className="text-neutral-400">Layer 1 (Chainlink):</strong> {lastKeeperResult.layer1.reason}
              </p>
              <p>
                <strong className="text-cyan-400">Layer 2 (SmartSession):</strong> {lastKeeperResult.layer2.status} ({lastKeeperResult.layer2.spendingLimitPolicy})
              </p>
              <p>
                <strong className="text-purple-400">Layer 3 (Failsafe):</strong> {lastKeeperResult.layer3.fallbackAction}
              </p>
              <p>
                <strong className="text-emerald-400">Bookend Phase:</strong> {lastKeeperResult.lifecycle.phase} - {lastKeeperResult.lifecycle.note}
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
