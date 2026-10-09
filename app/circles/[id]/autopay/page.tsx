"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useDevUser } from "@/components/providers";
import {
  ShieldCheck,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Key,
  Play,
  RotateCcw,
  AlertCircle,
  Clock,
  Coins,
  Shield,
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

  const isVolunteer = user?.username === "asharao01";

  const handleCreateVault = async () => {
    if (!user) return;
    setActionLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/circles/${circleId}/vault/create`, {
        method: "POST",
        headers: { "x-dev-user": user.username },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create vault");

      setSuccessMsg("Circle vault clone successfully deployed on Base Sepolia");
      loadAutopayState();
    } catch (err: any) {
      setError(err.message || "Failed to deploy vault");
    } finally {
      setActionLoading(false);
    }
  };

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
      if (!res.ok) throw new Error(data.error || "Failed to sign mandate");

      setSuccessMsg("Autopay SmartSession mandate signed and installed");
      loadAutopayState();
    } catch (err: any) {
      setError(err.message || "Failed to grant autopay mandate");
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
      if (!res.ok) throw new Error(data.error || "Failed to revoke mandate");

      setSuccessMsg("Autopay mandate revoked");
      loadAutopayState();
    } catch (err: any) {
      setError(err.message || "Failed to revoke mandate");
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartCircle = async () => {
    if (!user) return;
    setActionLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/circles/${circleId}/start`, {
        method: "POST",
        headers: { "x-dev-user": user.username },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start circle");

      setSuccessMsg("Circle started! Proceeding to Monthly Pool Vault...");
      setTimeout(() => {
        router.push(`/circles/${circleId}/pool`);
      }, 1200);
    } catch (err: any) {
      setError(err.message || "Failed to start circle");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-sm text-neutral-500 bg-neutral-950 rounded-3xl border border-neutral-900">
        Loading autopay status...
      </div>
    );
  }

  const allGiven = state?.members.length ? state.members.every((m) => m.status === "GIVEN") : false;

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
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Autopay Mandate Signatures</h1>
              <p className="text-xs text-neutral-400 mt-0.5">
                Rhinestone SmartSession Permissions for Automatic Pooling
              </p>
            </div>
          </div>
          <span
            className={`px-4 py-1.5 rounded-full text-xs font-bold font-mono uppercase tracking-wider ${
              state?.isStarted
                ? "bg-emerald-950 text-emerald-300 border border-emerald-800/60"
                : allGiven
                ? "bg-blue-950 text-blue-300 border border-blue-800/60"
                : "bg-amber-950 text-amber-300 border border-amber-800/60"
            }`}
          >
            {state?.isStarted
              ? "Running (Started)"
              : allGiven
              ? "Ready to Start"
              : "Awaiting Signatures"}
          </span>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-red-950/60 border border-red-800/50 text-red-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-800/50 text-emerald-300 text-xs flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Vault Status Card */}
        <div className="p-6 rounded-2xl bg-neutral-900/80 border border-neutral-800 text-xs text-neutral-300 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="font-bold text-white uppercase tracking-wider text-[11px]">Circle Vault Address:</span>
            {state?.vaultAddress ? (
              <span className="font-mono text-white font-bold bg-neutral-950 px-3 py-1 rounded-xl border border-neutral-800 break-all">
                {state.vaultAddress}
              </span>
            ) : isVolunteer ? (
              <button
                onClick={handleCreateVault}
                disabled={actionLoading}
                className="px-4 py-2 bg-white hover:bg-neutral-200 text-black rounded-xl font-bold text-xs uppercase tracking-wider shadow"
              >
                Deploy Circle Vault Clone
              </button>
            ) : (
              <span className="text-neutral-500 italic">Waiting for volunteer to deploy vault...</span>
            )}
          </div>
          <div className="text-[11px] text-neutral-400 pt-2 border-t border-neutral-800/80 leading-relaxed">
            <strong className="text-neutral-300">Strict Mandate Scope:</strong> Only MockUSDC transfer to this vault (capped at monthly amount), once per cycle, valid until circle duration end.
          </div>
        </div>

        {/* Member Permissions List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Member Authorization Matrix</h3>
            <span className="text-xs font-mono text-neutral-400">
              {state?.members.filter((m) => m.status === "GIVEN").length} of {state?.members.length} Granted
            </span>
          </div>

          <div className="divide-y divide-neutral-900 border border-neutral-900 rounded-2xl overflow-hidden">
            {state?.members.map((m) => (
              <div key={m.walletAddress} className="p-4 flex items-center justify-between text-xs bg-neutral-950">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{m.displayName}</span>
                    <span className="text-neutral-500 font-mono text-[11px]">@{m.username}</span>
                  </div>
                  <p className="text-[10px] text-neutral-500 font-mono">
                    {m.walletAddress.slice(0, 8)}...{m.walletAddress.slice(-6)}
                  </p>
                </div>
                <div>
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      m.status === "GIVEN"
                        ? "bg-emerald-950 text-emerald-300 border border-emerald-800/60"
                        : m.status === "REVOKED"
                        ? "bg-red-950 text-red-300 border border-red-800/60"
                        : "bg-neutral-900 text-neutral-500 border border-neutral-800"
                    }`}
                  >
                    {m.status === "GIVEN" && <CheckCircle2 className="h-3 w-3" />}
                    {m.status === "REVOKED" && <XCircle className="h-3 w-3" />}
                    {m.status === "NOT_GIVEN" && <Clock className="h-3 w-3" />}
                    {m.status.replace("_", " ")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Controls */}
        <div className="space-y-4 pt-2">
          {currentMemberStatus?.status !== "GIVEN" ? (
            <button
              onClick={handleGrantAutopay}
              disabled={actionLoading}
              className="w-full py-4 rounded-2xl bg-white hover:bg-neutral-200 text-black font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-xl shadow-white/5 cursor-pointer"
            >
              <Key className="h-4 w-4" />
              <span>Authorize SmartSession Mandate</span>
            </button>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 p-4 rounded-2xl bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>Autopay Permission Active on Base Sepolia</span>
              </div>
              <button
                onClick={handleRevokeAutopay}
                disabled={actionLoading}
                className="px-6 py-4 rounded-2xl border border-red-900/60 bg-red-950/30 text-red-300 hover:bg-red-900/40 text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Revoke</span>
              </button>
            </div>
          )}

          {/* Volunteer Start Circle Button */}
          {isVolunteer && (
            <div className="border-t border-neutral-900 pt-6 space-y-3">
              <button
                onClick={handleStartCircle}
                disabled={!state?.canStart || actionLoading}
                className={`w-full py-4 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-xl ${
                  state?.canStart
                    ? "bg-red-600 hover:bg-red-500 text-white cursor-pointer shadow-red-900/30"
                    : "bg-neutral-900 text-neutral-600 border border-neutral-800 cursor-not-allowed"
                }`}
              >
                <Play className="h-4 w-4 fill-current" />
                <span>Initialize Pool Clock (Calls vault start)</span>
              </button>
              {!state?.canStart && !state?.isStarted && (
                <p className="text-center text-[11px] text-neutral-500">
                  Activation unlocks automatically when all participants authorize mandates.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
