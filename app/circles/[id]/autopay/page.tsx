"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useDevUser } from "@/components/providers";
import {
  Shield,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Key,
  Play,
  RotateCcw,
  AlertCircle,
  Clock,
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
        if (data && !data.error) setState(data);
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

      setSuccessMsg("Circle vault deployed on Base Sepolia.");
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

      setSuccessMsg("Autopay mandate granted.");
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

      setSuccessMsg("Autopay mandate revoked.");
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

      setSuccessMsg("Circle vault started. Redirecting to pool...");
      setTimeout(() => {
        router.push(`/circles/${circleId}/pool`);
      }, 1000);
    } catch (err: any) {
      setError(err.message || "Failed to start circle");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-sm text-neutral-500 glass-panel rounded-3xl">
        Loading autopay status...
      </div>
    );
  }

  const allGiven = state?.members.length ? state.members.every((m) => m.status === "GIVEN") : false;

  return (
    <div className="max-w-2xl mx-auto py-8 space-y-8">
      <Link
        href={`/circles/${circleId}`}
        className="inline-flex items-center gap-2 text-xs text-neutral-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to circle
      </Link>

      <div className="rounded-3xl glass-panel-glow p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-2xl">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Autopay Permissions</h1>
              <p className="text-xs text-neutral-400">
                EIP-712 SmartSession Mandates
              </p>
            </div>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium border ${
              state?.isStarted
                ? "bg-emerald-950/40 text-emerald-300 border-emerald-500/30"
                : allGiven
                ? "bg-blue-950/40 text-blue-300 border-blue-500/30"
                : "bg-neutral-800 text-neutral-400 border-white/10"
            }`}
          >
            {state?.isStarted
              ? "Running"
              : allGiven
              ? "Ready to Start"
              : "Awaiting Signatures"}
          </span>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Vault Status */}
        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 text-xs text-neutral-300 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-neutral-400">Vault Contract:</span>
            {state?.vaultAddress ? (
              <span className="font-mono text-emerald-400">{state.vaultAddress}</span>
            ) : isVolunteer ? (
              <button
                onClick={handleCreateVault}
                disabled={actionLoading}
                className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black rounded-lg font-semibold text-xs transition-colors"
              >
                Deploy Vault Clone
              </button>
            ) : (
              <span className="text-neutral-500 italic">Pending deployment...</span>
            )}
          </div>
        </div>

        {/* Member Permissions List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Member Consents</h3>
            <span className="text-xs text-neutral-500">
              {state?.members.filter((m) => m.status === "GIVEN").length} / {state?.members.length} Granted
            </span>
          </div>

          <div className="divide-y divide-white/5 border border-white/5 rounded-2xl overflow-hidden">
            {state?.members.map((m) => (
              <div key={m.walletAddress} className="p-4 flex items-center justify-between text-xs bg-white/[0.01]">
                <div>
                  <span className="font-medium text-white">{m.displayName}</span>
                  <span className="text-neutral-500 ml-1.5 font-mono">@{m.username}</span>
                  <p className="text-[10px] text-neutral-500 font-mono mt-0.5">
                    {m.walletAddress.slice(0, 6)}...{m.walletAddress.slice(-4)}
                  </p>
                </div>
                <div>
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium border ${
                      m.status === "GIVEN"
                        ? "bg-emerald-950/40 text-emerald-300 border-emerald-500/30"
                        : m.status === "REVOKED"
                        ? "bg-red-950/40 text-red-300 border-red-500/30"
                        : "bg-neutral-800 text-neutral-400 border-white/10"
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

        {/* Actions */}
        <div className="space-y-4 pt-2">
          {currentMemberStatus?.status !== "GIVEN" ? (
            <button
              onClick={handleGrantAutopay}
              disabled={actionLoading}
              className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Key className="h-4 w-4" />
              Sign Autopay Mandate
            </button>
          ) : (
            <div className="flex gap-3">
              <div className="flex-1 p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Autopay Active
              </div>
              <button
                onClick={handleRevokeAutopay}
                disabled={actionLoading}
                className="px-4 py-3.5 rounded-xl border border-red-500/30 bg-red-950/20 text-red-400 hover:bg-red-950/40 text-xs font-medium transition-colors flex items-center gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Revoke
              </button>
            </div>
          )}

          {/* Volunteer Start Circle Button */}
          {isVolunteer && (
            <div className="border-t border-white/10 pt-5 space-y-2">
              <button
                onClick={handleStartCircle}
                disabled={!state?.canStart || actionLoading}
                className={`w-full py-3.5 rounded-xl font-semibold text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 ${
                  state?.canStart
                    ? "bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_20px_rgba(16,185,129,0.3)] cursor-pointer"
                    : "bg-white/5 text-neutral-500 cursor-not-allowed border border-white/5"
                }`}
              >
                <Play className="h-4 w-4" />
                Start Circle Vault
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
