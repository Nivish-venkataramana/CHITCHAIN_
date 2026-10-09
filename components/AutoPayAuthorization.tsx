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
    isBatchDebiting,
    isClaimingFaucet,
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
    claimFaucetUSDC,
    refreshSession,
  } = useAutoPaySession(circleId, monthlyAmountUSDC, vaultAddress);

  const [activeTab, setActiveTab] = useState<"overview" | "members" | "layers" | "bookend" | "simulator">("overview");

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
      if (data.circleVaultTotalUSDC !== undefined) {
        setCircleVaultUSDC(data.circleVaultTotalUSDC);
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
      if (data?.circleVaultTotalUSDC !== undefined) {
        setCircleVaultUSDC(data.circleVaultTotalUSDC);
      }
      setMemberDebitSuccess(`✓ All ${data.totalParticipants} member pots pooled successfully ($${data.totalPooledUSDC.toLocaleString()} USDC total) into Circle Vault!`);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("chitchain_balance_updated"));
      }
    } catch (e) {
      console.error("Batch pool error:", e);
    }
  };

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

        <div className="flex flex-wrap items-center gap-3">
          {/* Faucet Claim Button */}
          <button
            onClick={() => claimFaucetUSDC(25000)}
            disabled={isClaimingFaucet}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Claim 25,000 MockUSDC to test account"
          >
            {isClaimingFaucet ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
            ) : (
              <Coins className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span>+25k USDC Faucet</span>
          </button>

          {/* User Account Balance Tag */}
          <div className="px-3.5 py-2 rounded-xl bg-gray-900/80 border border-gray-700 text-xs flex items-center gap-2">
            <span className="text-gray-400">Balance:</span>
            <span className="font-mono font-bold text-white">${walletBalanceUSDC.toLocaleString()} USDC</span>
          </div>

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

      {memberDebitSuccess && (
        <div className="mt-4 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{memberDebitSuccess}</span>
          </div>
          <button
            onClick={() => setMemberDebitSuccess(null)}
            className="text-gray-400 hover:text-white text-xs cursor-pointer ml-2"
          >
            ✕
          </button>
        </div>
      )}

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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 sm:p-5">
              <div className="flex items-center justify-between text-gray-400 mb-2">
                <span className="text-xs uppercase tracking-wider font-semibold">Monthly Limit</span>
                <Coins className="w-5 h-5 text-cyan-400" />
              </div>
              <p className="text-xl sm:text-2xl font-bold text-white">${monthlyAmountUSDC.toLocaleString()} USDC</p>
              <p className="text-[11px] text-gray-400 mt-2">
                Enforced via <span className="text-cyan-300">ERC20SpendingLimit</span>
              </p>
            </div>

            <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 sm:p-5">
              <div className="flex items-center justify-between text-gray-400 mb-2">
                <span className="text-xs uppercase tracking-wider font-semibold">Locked Reserve</span>
                <Lock className="w-5 h-5 text-purple-400" />
              </div>
              <p className="text-xl sm:text-2xl font-bold text-white">${totalReserveBuffer.toLocaleString()} USDC</p>
              <p className="text-[11px] text-gray-400 mt-2">
                Layer 3 Solvency Collateral.
              </p>
            </div>

            <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 sm:p-5">
              <div className="flex items-center justify-between text-gray-400 mb-2">
                <span className="text-xs uppercase tracking-wider font-semibold">Mandates</span>
                <Clock className="w-5 h-5 text-emerald-400" />
              </div>
              <p className="text-xl sm:text-2xl font-bold text-white">
                {activeMandateCount} of {totalMembersCount} Signed
              </p>
              <p className="text-[11px] text-gray-400 mt-2">
                Individual wallet signatures.
              </p>
            </div>

            <div className="bg-gray-900/60 border border-cyan-500/30 rounded-xl p-4 sm:p-5 bg-gradient-to-br from-cyan-950/30 to-blue-950/20">
              <div className="flex items-center justify-between text-cyan-400 mb-2">
                <span className="text-xs uppercase tracking-wider font-semibold">Circle Vault Pool</span>
                <Zap className="w-5 h-5 text-cyan-300" />
              </div>
              <p className="text-xl sm:text-2xl font-bold text-cyan-300">${circleVaultUSDC.toLocaleString()} USDC</p>
              <p className="text-[11px] text-cyan-400/80 mt-2">
                Pooled & ready for Month 1 Aave V3.
              </p>
            </div>
          </div>

          {/* Batch Debit & Pool Action Banner */}
          <div className="bg-gradient-to-r from-blue-950/40 via-cyan-950/30 to-purple-950/40 border border-cyan-500/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="font-bold text-white text-sm flex items-center gap-2">
                <Zap className="w-4 h-4 text-cyan-400" />
                <span>Automated Keeper Pooling Pipeline</span>
              </p>
              <p className="text-xs text-neutral-300 mt-0.5">
                Pulls authorized monthly USDC contributions from each member account directly into the communal circle vault.
              </p>
            </div>
            <button
              onClick={handleBatchPoolClick}
              disabled={isBatchDebiting}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold text-xs transition-all shadow-lg shadow-cyan-500/20 flex items-center gap-2 shrink-0 cursor-pointer disabled:opacity-50"
            >
              {isBatchDebiting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Executing Batch Debit...</span>
                </>
              ) : (
                <>
                  <Coins className="w-3.5 h-3.5 text-black" />
                  <span>Pool Monthly Pot Now</span>
                </>
              )}
            </button>
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
                  const isPoolingThis = poolingMemberWallet === m.walletAddress.toLowerCase();

                  return (
                    <div
                      key={m.walletAddress}
                      className={`p-3 rounded-lg border text-xs flex items-center justify-between gap-2 ${
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

                      <div className="flex items-center gap-1.5 shrink-0">
                        {hasConsent ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 whitespace-nowrap">
                            ✓ Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30 whitespace-nowrap">
                            Pending
                          </span>
                        )}

                        {/* One-Click Pool Button for Every Account */}
                        <button
                          onClick={() => poolIndividualAccount(m.walletAddress, m.username)}
                          disabled={isPoolingThis}
                          className="px-2.5 py-1 rounded-md bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-[10px] transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1 shadow-sm"
                          title={`Pool $${monthlyAmountUSDC} from @${m.username}`}
                        >
                          {isPoolingThis ? (
                            <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                          ) : (
                            <Zap className="w-2.5 h-2.5" />
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
                const isPoolingThis = poolingMemberWallet === m.walletAddress.toLowerCase();

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
                              className="px-3 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
                            >
                              {isAuthorizing ? "Signing..." : "Sign Now"}
                            </button>
                          )}
                        </div>
                      )}

                      {/* One-Click Pool Button on Member Row */}
                      <button
                        onClick={() => poolIndividualAccount(m.walletAddress, m.username)}
                        disabled={isPoolingThis}
                        className="px-3 py-1 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-black font-bold text-xs transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                      >
                        {isPoolingThis ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <Coins className="w-3 h-3 text-black" />
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

          {/* Batch Debit Section in Simulator */}
          <div className="mt-6 pt-6 border-t border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h5 className="font-bold text-sm text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" />
                <span>Full Circle Batch Debit & Communal Pooling</span>
              </h5>
              <p className="text-xs text-gray-400">
                Executes automated smart session debits across all authorized circle participants simultaneously.
              </p>
            </div>

            <button
              onClick={() => triggerBatchKeeperDebit()}
              disabled={isBatchDebiting}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black font-bold text-xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {isBatchDebiting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Coins className="w-3.5 h-3.5" />}
              Pool All Member Funds ($25k each)
            </button>
          </div>

          {lastBatchResult && (
            <div className="mt-4 bg-black/60 border border-emerald-500/30 rounded-lg p-4 font-mono text-xs text-gray-300 space-y-2">
              <div className="flex items-center justify-between text-emerald-400 font-bold border-b border-gray-800 pb-1">
                <span>Batch Pooling Result</span>
                <span>{lastBatchResult.timestamp}</span>
              </div>
              <p>
                <strong className="text-cyan-400">Total Participants Debited:</strong> {lastBatchResult.totalParticipants} members
              </p>
              <p>
                <strong className="text-emerald-400">Total USDC Pooled This Batch:</strong> ${lastBatchResult.totalPooledUSDC.toLocaleString()} USDC
              </p>
              <p>
                <strong className="text-purple-400">Circle Vault Pooled Total:</strong> ${lastBatchResult.circleVaultTotalUSDC.toLocaleString()} USDC
              </p>
              <p>
                <strong className="text-blue-400">Batch TxHash:</strong> {lastBatchResult.batchTxHash}
              </p>
              <div className="mt-2 pt-2 border-t border-gray-800">
                <span className="text-gray-400 font-bold text-[11px] block mb-1">Debited Member Wallets:</span>
                <div className="space-y-1">
                  {lastBatchResult.debitedMembers?.map((dm: any) => (
                    <div key={dm.walletAddress} className="flex items-center justify-between text-[11px] text-gray-400">
                      <span>{dm.walletAddress.slice(0, 10)}...{dm.walletAddress.slice(-6)}</span>
                      <span className="text-emerald-400">-${dm.debitedAmountUSDC.toLocaleString()} USDC (New Bal: ${dm.newBalanceUSDC.toLocaleString()} USDC)</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {lastKeeperResult && (
            <div className="mt-4 bg-black/60 border border-gray-800 rounded-lg p-4 font-mono text-xs text-gray-300 space-y-2">
              <div className="flex items-center justify-between text-cyan-400 font-bold border-b border-gray-800 pb-1">
                <span>Single Execution Result</span>
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
