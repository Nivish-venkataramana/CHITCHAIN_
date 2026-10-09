"use client";

import React, { useState } from "react";
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
    sessionData,
    allMemberConsents,
    error,
    lastKeeperResult,
    authorizeSmartSession,
    triggerKeeperExecution,
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

  return (
    <div className="w-full bg-[#0a0e17] border border-cyan-500/20 rounded-2xl p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden backdrop-blur-xl">
      {/* Background ambient glow */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-6 relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
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
            Non-custodial, individual wallet mandates for <span className="text-cyan-300 font-semibold">{circleName}</span> with cryptographic limits & reserve collateral.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isCurrentUserAuthorized ? (
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-4 py-2 rounded-xl text-emerald-400">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Your Wallet Mandate</p>
                <p className="text-xs font-bold">Active & Enforced</p>
              </div>
            </div>
          ) : (
            <button
              onClick={() => authorizeSmartSession()}
              disabled={isAuthorizing}
              className="px-5 py-2.5 rounded-xl font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/25 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isAuthorizing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Signing Your Mandate...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  Grant Your Session Mandate
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
          className={`px-4 py-2 rounded-lg font-medium transition-all cursor-pointer ${
            activeTab === "overview"
              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
              : "text-gray-400 hover:text-white"
          }`}
        >
          Overview & Policies
        </button>
        <button
          onClick={() => setActiveTab("members")}
          className={`px-4 py-2 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === "members"
              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Member Mandate Status ({activeMandateCount}/{totalMembersCount})</span>
        </button>
        <button
          onClick={() => setActiveTab("layers")}
          className={`px-4 py-2 rounded-lg font-medium transition-all cursor-pointer ${
            activeTab === "layers"
              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
              : "text-gray-400 hover:text-white"
          }`}
        >
          3-Layer Architecture
        </button>
        <button
          onClick={() => setActiveTab("bookend")}
          className={`px-4 py-2 rounded-lg font-medium transition-all cursor-pointer ${
            activeTab === "bookend"
              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
              : "text-gray-400 hover:text-white"
          }`}
        >
          Bookend Schedule
        </button>
        <button
          onClick={() => setActiveTab("simulator")}
          className={`px-4 py-2 rounded-lg font-medium transition-all cursor-pointer ${
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
        <div className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5">
              <div className="flex items-center justify-between text-gray-400 mb-2">
                <span className="text-xs uppercase tracking-wider font-semibold">Monthly Limit / Member</span>
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
                <span className="text-xs uppercase tracking-wider font-semibold">Mandate Completion</span>
                <Clock className="w-5 h-5 text-emerald-400" />
              </div>
              <p className="text-2xl font-bold text-white">
                {activeMandateCount} of {totalMembersCount} Signed
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Each member must mandate independently from their wallet
              </p>
            </div>
          </div>

          <div className="bg-cyan-950/20 border border-cyan-500/30 rounded-xl p-4 text-xs text-neutral-300 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-white text-sm mb-0.5">Non-Custodial Multi-Account Mandates</p>
              <p>
                When a member grants a mandate, the cryptographic permission is tied <strong>strictly to their personal wallet address</strong>. Other participants cannot grant mandates on your behalf, and you cannot mandate for others.
              </p>
            </div>
          </div>

          {/* Inline Member Mandate Breakdown in Overview */}
          {members.length > 0 && (
            <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Participant Autopay Status</span>
                </p>
                <span className="text-[11px] font-mono text-cyan-400">
                  {activeMandateCount} of {totalMembersCount} Authorized
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {members.map((m) => {
                  const isCurrent = m.walletAddress.toLowerCase() === smartWalletAddress.toLowerCase();
                  const hasConsent =
                    (isCurrent && isCurrentUserAuthorized) ||
                    allMemberConsents.some(
                      (c) => c.memberAddress.toLowerCase() === m.walletAddress.toLowerCase() && c.status === "GIVEN"
                    );

                  return (
                    <div
                      key={m.walletAddress}
                      className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                        hasConsent
                          ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-300"
                          : "bg-gray-900/60 border-gray-800 text-gray-400"
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-white truncate">
                            {m.displayName || m.username}
                          </span>
                          {isCurrent && (
                            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-500/30">
                              You
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] font-mono text-gray-500 truncate">
                          {m.walletAddress.slice(0, 6)}...{m.walletAddress.slice(-4)}
                        </p>
                      </div>
                      <div>
                        {hasConsent ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 whitespace-nowrap">
                            ✓ Authorized
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30 whitespace-nowrap">
                            Pending
                          </span>
                        )}
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
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" />
              <span>Participant Mandate Matrix</span>
            </h4>
            <span className="text-xs text-gray-400 font-mono">
              {allMandatesComplete ? "🎉 All Mandates Ready" : `${totalMembersCount - activeMandateCount} pending`}
            </span>
          </div>

          <div className="space-y-2.5">
            {members.length === 0 ? (
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 text-center text-xs text-gray-400 font-mono">
                No participants joined yet. Invite members to track their autopay mandates.
              </div>
            ) : (
              members.map((m) => {
                const isCurrent = m.walletAddress.toLowerCase() === smartWalletAddress.toLowerCase();
                const hasConsent =
                  (isCurrent && isCurrentUserAuthorized) ||
                  allMemberConsents.some(
                    (c) => c.memberAddress.toLowerCase() === m.walletAddress.toLowerCase() && c.status === "GIVEN"
                  );

                return (
                  <div
                    key={m.walletAddress}
                    className="p-3.5 rounded-xl border border-gray-800 bg-gray-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">
                          {m.displayName || m.username}
                          {isCurrent && " (Your Account)"}
                        </span>
                        <span className="text-gray-400 font-mono text-[11px]">@{m.username}</span>
                        {m.isVolunteer && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono border border-cyan-500/30 text-cyan-300 bg-cyan-950/40">
                            Volunteer
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] font-mono text-gray-400">
                        Smart Account: {m.walletAddress.slice(0, 8)}...{m.walletAddress.slice(-6)}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
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
                              className="px-3 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
                            >
                              {isAuthorizing ? "Signing..." : "Sign Now"}
                            </button>
                          )}
                        </div>
                      )}
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
        <div className="space-y-4 mt-6">
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
          </div>

          <div className="bg-gray-900/70 border border-cyan-500/30 rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-bold">
                L2
              </div>
              <div>
                <h4 className="font-bold text-base text-white">Layer 2: On-Chain Cryptographic Check (Rhinestone SmartSessions)</h4>
                <p className="text-xs text-gray-400">
                  Each participant's Biconomy Nexus smart account validates the EIP-712 mandate signed from their own wallet.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-900/70 border border-purple-500/30 rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 font-bold">
                L3
              </div>
              <div>
                <h4 className="font-bold text-base text-white">Layer 3: Failsafe Solvency Verification</h4>
                <p className="text-xs text-gray-400">
                  If an individual pull bounces -> Slashes 1-month collateral from that member's locked 3-month reserve buffer.
                </p>
              </div>
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
                Pulls Month 1 contribution from all members on Day 1. <span className="text-emerald-300 font-semibold">No bidding</span> occurs. Full pot + 3-month reserves flow into Aave V3.
              </p>
            </div>

            <div className="bg-gray-900/70 border border-cyan-500/30 rounded-xl p-5">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm mb-2">
                <RefreshCw className="w-4 h-4" />
                Months 2..N-1: The Core Loop
              </div>
              <p className="text-xs text-gray-300">
                Chainlink triggers the auto-pay pull on the <span className="text-cyan-300 font-semibold">1st of every month</span> before Day 2 auction reveal.
              </p>
            </div>

            <div className="bg-gray-900/70 border border-purple-500/30 rounded-xl p-5">
              <div className="flex items-center gap-2 text-purple-400 font-bold text-sm mb-2">
                <Zap className="w-4 h-4" />
                Month N: The Grand Settlement
              </div>
              <p className="text-xs text-gray-300">
                Auto-pay pulls final installment. Bidding disabled. Settles final pot + <span className="text-purple-300 font-semibold">accumulated dividend pool</span> to the final member.
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
                Simulate automated checkUpkeep trigger & Layer 2/3 execution across members.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => triggerKeeperExecution(false)}
                disabled={isTriggeringKeeper}
                className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isTriggeringKeeper ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                Simulate Normal Debit
              </button>

              <button
                onClick={() => triggerKeeperExecution(true)}
                disabled={isTriggeringKeeper}
                className="px-4 py-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-semibold text-xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
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
