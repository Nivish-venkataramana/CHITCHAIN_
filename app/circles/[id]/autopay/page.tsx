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
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 flex flex-col justify-between min-h-[calc(100vh-5.5rem)] text-neutral-100 gap-5 py-2">
      {/* Top Bar */}
      <div className="flex items-center justify-between shrink-0">
        <Link
          href={`/circles/${circleId}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Return to Circle</span>
        </Link>
      </div>

      {/* Header Banner */}
      <div className="p-2 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Autopay Consent</h1>
          <span className="px-3 py-1 rounded-full text-xs font-mono uppercase tracking-wider text-neutral-300">
            {state?.isStarted ? "Vault Active" : `${grantedCount} of ${totalCount} Mandates`}
          </span>
        </div>

        {/* Global Vault Deployment / Start Controls */}
        <div className="flex items-center gap-2.5">
          {state?.vaultAddress && !state?.isStarted && (
            <button
              onClick={handleStartVault}
              disabled={actionLoading || !allGranted}
              className={`px-5 py-2.5 rounded-xl font-semibold text-xs flex items-center gap-2 transition-colors cursor-pointer ${
                allGranted
                  ? "bg-white text-black hover:bg-neutral-200"
                  : "text-neutral-500 cursor-not-allowed"
              }`}
              title={!allGranted ? "Waiting for all members to grant autopay consent" : "Start Circle Vault"}
            >
              <Play className="h-4 w-4" />
              <span>{actionLoading ? "Starting..." : "Start Circle Vault"}</span>
            </button>
          )}

          {state?.isStarted && (
            <Link
              href={`/circles/${circleId}/pool`}
              className="px-5 py-2.5 rounded-xl bg-white text-black font-semibold text-xs flex items-center gap-2 hover:bg-neutral-200 transition-colors"
            >
              <Coins className="h-4 w-4" />
              <span>Go to Ledger & Pool</span>
            </Link>
          )}
        </div>
      </div>

      {allGranted && (
        <div className="p-4 text-emerald-300 text-xs flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <Calendar className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>
              All member mandates authorized! The monthly chit fund deductions will commence on <strong>{getNextMonthFirst()}</strong> (1st of next month).
            </span>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-mono uppercase tracking-wider text-emerald-200 shrink-0">
            Scheduled
          </span>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl text-red-300 text-xs flex items-center gap-2.5 shrink-0">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 rounded-xl text-emerald-300 text-xs flex items-center gap-2.5 shrink-0">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Symmetrical 2-Column Area: Your Consent & Member Mandate Table */}
      <div className="grid md:grid-cols-2 gap-8 flex-1 min-h-0">
        {/* Left Column: Your Consent Card */}
        <div className="flex flex-col justify-between h-full min-h-[22rem] space-y-4">
          <div className="space-y-4">
            <div className="shrink-0 pb-1">
              <h2 className="text-base font-bold text-white flex items-center gap-2.5">
                <Key className="h-5 w-5 text-neutral-300" />
                <span>Your Autopay Authorization</span>
              </h2>
            </div>

            <div className="p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-400">Current Status:</span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-mono uppercase tracking-wider ${
                    currentMemberStatus?.status === "GIVEN"
                      ? "text-emerald-400"
                      : "text-neutral-400"
                  }`}
                >
                  {currentMemberStatus?.status === "GIVEN" ? "Active Mandate" : "Not Authorized"}
                </span>
              </div>
              <p className="text-xs text-neutral-300 leading-relaxed font-mono">
                Authorizes the vault contract to deduct the agreed monthly contribution on the 1st of each month during active auction rounds.
              </p>
            </div>
          </div>

          <div className="pt-2 flex gap-2">
            {currentMemberStatus?.status !== "GIVEN" ? (
              <button
                onClick={handleGrantAutopay}
                disabled={actionLoading}
                className="w-full py-3 rounded-xl bg-white text-black font-semibold text-xs hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShieldCheck className="h-4 w-4" />
                <span>{actionLoading ? "Signing Mandate..." : "Grant Autopay Consent"}</span>
              </button>
            ) : (
              <button
                onClick={handleRevokeAutopay}
                disabled={actionLoading}
                className="w-full py-3 rounded-xl hover:text-red-400 text-neutral-300 font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="h-4 w-4" />
                <span>{actionLoading ? "Revoking..." : "Revoke Mandate"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Member Mandate Table */}
        <div className="flex flex-col h-full min-h-[22rem] space-y-4">
          <div className="shrink-0 pb-1">
            <h3 className="text-base font-bold text-white flex items-center gap-2.5">
              <ShieldCheck className="h-5 w-5 text-neutral-300" />
              <span>Participant Mandate Roster</span>
            </h3>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-2.5 pr-1">
            {state?.members.map((m) => (
              <div
                key={m.walletAddress}
                className="p-3.5 flex items-center justify-between text-sm transition-colors"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-white text-sm">{m.displayName}</p>
                    <p className="text-neutral-400 font-mono text-xs">@{m.username}</p>
                  </div>
                  <p className="text-xs font-mono text-neutral-500">
                    {m.walletAddress.slice(0, 6)}...{m.walletAddress.slice(-4)}
                  </p>
                </div>

                <div>
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono uppercase tracking-wider ${
                      m.status === "GIVEN"
                        ? "text-emerald-400"
                        : "text-neutral-400"
                    }`}
                  >
                    {m.status === "GIVEN" ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Granted</span>
                      </>
                    ) : (
                      <>
                        <Clock className="h-3.5 w-3.5" />
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
