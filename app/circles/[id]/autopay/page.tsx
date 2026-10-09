"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useDevUser } from "@/components/providers";
import {
  ShieldCheck,
  ArrowLeft,
  CheckCircle2,
  Key,
  Play,
  RotateCcw,
  AlertCircle,
  Clock,
  Coins,
  Calendar,
} from "lucide-react";

interface AutopayState {
  vaultAddress: string | null;
  isStarted: boolean;
  canStart: boolean;
  members: Array<{
    walletAddress: string;
    username: string;
    displayName: string;
    status: "NOT_GIVEN" | "GIVEN" | "REVOKED";
    grantedAt: string | null;
  }>;
}

export default function AutopayPermissionsPage() {
  const params = useParams();
  const circleId = params.id as string;
  const router = useRouter();
  const { user } = useDevUser();

  const [state, setState] = useState<AutopayState | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const getNextMonthFirst = () => {
    const d = new Date();
    const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    return nextMonth.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  };

  const loadAutopayState = () => {
    fetch(`/api/circles/${circleId}/autopay`)
      .then((r) => r.json())
      .then((data) => {
        if (data && !data.error) {
          setState(data);
        }
      })
      .catch((err) => console.error("Error fetching autopay status:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAutopayState();
  }, [circleId]);

  const currentMemberStatus = state?.members.find(
    (m) => user && m.walletAddress.toLowerCase() === user.walletAddress.toLowerCase()
  );

  const handleGrantAutopay = async () => {
    if (!user) return;
    setActionLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/circles/${circleId}/autopay/grant`, {
        method: "POST",
        headers: { "x-dev-user": user.username },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to grant autopay");

      setSuccessMsg("Signed EIP-712 mandate & granted automated deduction consent");
      loadAutopayState();
    } catch (err: any) {
      setError(err.message || "Failed to grant autopay consent");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevokeAutopay = async () => {
    if (!user) return;
    setActionLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/circles/${circleId}/autopay/revoke`, {
        method: "POST",
        headers: { "x-dev-user": user.username },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to revoke autopay");

      setSuccessMsg("Autopay session key revoked");
      loadAutopayState();
    } catch (err: any) {
      setError(err.message || "Failed to revoke autopay");
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartVault = async () => {
    if (!user) return;
    setActionLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/circles/${circleId}/vault/start`, {
        method: "POST",
        headers: { "x-dev-user": user.username },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start circle vault");

      setSuccessMsg(`Vault lifecycle initiated! Chit fund cycle starts on ${getNextMonthFirst()}.`);
      setTimeout(() => {
        router.push(`/circles/${circleId}/pool`);
      }, 1200);
    } catch (err: any) {
      setError(err.message || "Failed to start vault");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="p-8 text-center text-xs font-mono text-neutral-400 rounded-3xl border border-white/10 bg-transparent">
          Loading autopay mandates...
        </div>
      </div>
    );
  }

  const grantedCount = state?.members.filter((m) => m.status === "GIVEN").length || 0;
  const totalCount = state?.members.length || 0;
  const allGranted = totalCount > 0 && grantedCount >= totalCount;

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
      <div className="rounded-2xl border border-white/10 bg-transparent p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0 shadow-lg">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Autopay Consent</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider border border-white/20 text-neutral-200">
              {state?.isStarted ? "Vault Active" : `${grantedCount} of ${totalCount} Mandates`}
            </span>
          </div>
          <p className="text-[11px] text-neutral-400">
            {allGranted ? (
              <span className="text-emerald-400 font-medium">
                All members granted permission • Chit fund starts on 1st of next month ({getNextMonthFirst()})
              </span>
            ) : (
              "ERC-4337 Session Mandates for Monthly Contribution Deductions starting 1st of next month"
            )}
          </p>
        </div>

        {/* Global Vault Deployment / Start Controls */}
        <div className="flex items-center gap-2">
          {state?.vaultAddress && !state?.isStarted && (
            <button
              onClick={handleStartVault}
              disabled={actionLoading || !allGranted}
              className={`px-4 py-2 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                allGranted
                  ? "bg-white text-black hover:bg-neutral-200 shadow-md"
                  : "border border-white/10 bg-white/[0.03] text-neutral-500 cursor-not-allowed"
              }`}
              title={!allGranted ? "Waiting for all members to grant autopay consent" : "Start Circle Vault"}
            >
              <Play className="h-3.5 w-3.5" />
              <span>{actionLoading ? "Starting..." : "Start Circle Vault"}</span>
            </button>
          )}

          {state?.isStarted && (
            <Link
              href={`/circles/${circleId}/pool`}
              className="px-4 py-2 rounded-xl bg-white text-black font-semibold text-xs flex items-center gap-1.5 hover:bg-neutral-200 transition-colors shadow-md"
            >
              <Coins className="h-3.5 w-3.5" />
              <span>Go to Ledger & Pool</span>
            </Link>
          )}
        </div>
      </div>

      {allGranted && (
        <div className="p-3 rounded-2xl border border-emerald-500/40 bg-emerald-950/20 text-emerald-300 text-xs flex items-center justify-between gap-3 shrink-0 shadow-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>
              All member mandates authorized! The monthly chit fund deductions will commence on <strong>{getNextMonthFirst()}</strong> (1st of next month).
            </span>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-emerald-900/40 text-emerald-200 border border-emerald-500/30 shrink-0">
            Scheduled
          </span>
        </div>
      )}

      {error && (
        <div className="p-2.5 rounded-xl border border-red-900/60 bg-red-950/40 text-red-300 text-xs flex items-center gap-2 shrink-0">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-2.5 rounded-xl border border-emerald-900/60 bg-emerald-950/40 text-emerald-300 text-xs flex items-center gap-2 shrink-0">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Symmetrical 2-Column Area: Your Consent & Member Mandate Table */}
      <div className="grid md:grid-cols-2 gap-3.5 flex-1 min-h-0">
        {/* Left Column: Your Consent Card */}
        <div className="rounded-2xl border border-white/10 bg-transparent p-4 flex flex-col justify-between h-full min-h-0 shadow-xl space-y-3">
          <div className="space-y-3">
            <div className="border-b border-white/10 pb-2.5">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Key className="h-4 w-4 text-neutral-300" />
                <span>Your Autopay Authorization</span>
              </h2>
              <p className="text-[11px] text-neutral-400 mt-0.5">Automates monthly contribution without manual wallet popups</p>
            </div>

            <div className="p-3 rounded-xl border border-white/10 bg-white/[0.02] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-400">Current Status:</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider border ${
                    currentMemberStatus?.status === "GIVEN"
                      ? "border-emerald-500/40 text-emerald-400 bg-emerald-950/20"
                      : "border-neutral-700 text-neutral-400 bg-neutral-900/20"
                  }`}
                >
                  {currentMemberStatus?.status === "GIVEN" ? "Active Mandate" : "Not Authorized"}
                </span>
              </div>
              <p className="text-[11px] text-neutral-300 leading-relaxed font-mono">
                Authorizes the vault contract to deduct the agreed monthly contribution on the 1st of each month during active auction rounds.
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-white/10 flex gap-2">
            {currentMemberStatus?.status !== "GIVEN" ? (
              <button
                onClick={handleGrantAutopay}
                disabled={actionLoading}
                className="w-full py-2.5 rounded-xl bg-white text-black font-semibold text-xs hover:bg-neutral-200 transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>{actionLoading ? "Signing Mandate..." : "Grant Autopay Consent"}</span>
              </button>
            ) : (
              <button
                onClick={handleRevokeAutopay}
                disabled={actionLoading}
                className="w-full py-2.5 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-red-950/40 text-neutral-300 hover:text-red-400 hover:border-red-900/50 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>{actionLoading ? "Revoking..." : "Revoke Mandate"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Member Mandate Table */}
        <div className="rounded-2xl border border-white/10 bg-transparent p-4 flex flex-col h-full min-h-0 shadow-xl space-y-3">
          <div className="border-b border-white/10 pb-2.5 shrink-0">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-neutral-300" />
              <span>Participant Mandate Roster</span>
            </h3>
            <p className="text-[11px] text-neutral-400 mt-0.5">All members must sign mandate before vault starts</p>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-2 pr-1">
            {state?.members.map((m) => (
              <div
                key={m.walletAddress}
                className="p-2.5 rounded-xl border border-white/10 bg-white/[0.02] flex items-center justify-between text-xs hover:border-white/20 transition-colors"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-white text-xs">{m.displayName}</p>
                    <p className="text-neutral-400 font-mono text-[10px]">@{m.username}</p>
                  </div>
                  <p className="text-[10px] font-mono text-neutral-500">
                    {m.walletAddress.slice(0, 6)}...{m.walletAddress.slice(-4)}
                  </p>
                </div>

                <div>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider border ${
                      m.status === "GIVEN"
                        ? "border-emerald-500/40 text-emerald-400 bg-emerald-950/20"
                        : "border-neutral-700 text-neutral-400 bg-neutral-900/20"
                    }`}
                  >
                    {m.status === "GIVEN" ? (
                      <>
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Granted</span>
                      </>
                    ) : (
                      <>
                        <Clock className="h-3 w-3" />
                        <span>Pending</span>
                      </>
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
