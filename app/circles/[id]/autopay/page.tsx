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

      setSuccessMsg("Circle vault clone successfully deployed on Base Sepolia!");
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

      setSuccessMsg("EIP-712 Autopay SmartSession mandate signed & installed!");
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
      <div className="p-12 text-center text-sm text-slate-500 bg-white rounded-2xl border">
        Loading autopay status...
      </div>
    );
  }

  const allGiven = state?.members.length ? state.members.every((m) => m.status === "GIVEN") : false;

  return (
    <div className="max-w-2xl mx-auto py-6 space-y-6">
      <Link
        href={`/circles/${circleId}`}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to circle
      </Link>

      <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Autopay SmartSession Permissions</h1>
              <p className="text-xs text-slate-500">
                EIP-712 Rhinestone SmartSession Mandates for Vault Autopay
              </p>
            </div>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold ${
              state?.isStarted
                ? "bg-emerald-100 text-emerald-800"
                : allGiven
                ? "bg-blue-100 text-blue-800"
                : "bg-amber-100 text-amber-800"
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
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Vault Status Card */}
        <div className="p-4 rounded-xl bg-slate-50 border text-xs text-slate-700 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold">Circle Vault Address:</span>
            {state?.vaultAddress ? (
              <span className="font-mono text-slate-900 font-bold">{state.vaultAddress}</span>
            ) : isVolunteer ? (
              <button
                onClick={handleCreateVault}
                disabled={actionLoading}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold"
              >
                Deploy Circle Vault Clone
              </button>
            ) : (
              <span className="text-slate-400 italic">Waiting for volunteer to deploy vault...</span>
            )}
          </div>
          <div className="text-[11px] text-slate-500 pt-1 border-t space-y-1">
            <p><strong>Strict Mandate Scope:</strong> Only MockUSDC transfer to this vault (capped at monthly amount), once per cycle, valid until circle duration end.</p>
          </div>
        </div>

        {/* Member Permissions List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Member Permissions Board</h3>
            <span className="text-xs text-slate-500">
              {state?.members.filter((m) => m.status === "GIVEN").length} / {state?.members.length} Granted
            </span>
          </div>

          <div className="divide-y border rounded-xl overflow-hidden">
            {state?.members.map((m) => (
              <div key={m.walletAddress} className="p-3.5 flex items-center justify-between text-xs bg-white">
                <div>
                  <span className="font-semibold text-slate-800">{m.displayName}</span>
                  <span className="text-slate-400 ml-1.5 font-mono">@{m.username}</span>
                  <p className="text-[10px] text-slate-400 font-mono">
                    {m.walletAddress.slice(0, 8)}...{m.walletAddress.slice(-6)}
                  </p>
                </div>
                <div>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                      m.status === "GIVEN"
                        ? "bg-emerald-100 text-emerald-800"
                        : m.status === "REVOKED"
                        ? "bg-red-100 text-red-800"
                        : "bg-slate-100 text-slate-600"
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
        <div className="space-y-3 pt-2">
          {currentMemberStatus?.status !== "GIVEN" ? (
            <button
              onClick={handleGrantAutopay}
              disabled={actionLoading}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Key className="h-4 w-4" />
              Sign EIP-712 Autopay Mandate (Rhinestone SmartSession)
            </button>
          ) : (
            <div className="flex gap-3">
              <div className="flex-1 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Autopay Permission Active
              </div>
              <button
                onClick={handleRevokeAutopay}
                disabled={actionLoading}
                className="px-4 py-3 rounded-xl border border-red-300 text-red-700 hover:bg-red-50 text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Revoke Mandate
              </button>
            </div>
          )}

          {/* Volunteer Start Circle Button */}
          {isVolunteer && (
            <div className="border-t pt-4 space-y-2">
              <button
                onClick={handleStartCircle}
                disabled={!state?.canStart || actionLoading}
                className={`w-full py-3 rounded-xl font-bold text-xs shadow transition-all flex items-center justify-center gap-2 ${
                  state?.canStart
                    ? "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                }`}
              >
                <Play className="h-4 w-4" />
                Start Circle &amp; Pool Vault (Calls vault.start())
              </button>
              {!state?.canStart && !state?.isStarted && (
                <p className="text-center text-[11px] text-slate-400">
                  `start()` activates automatically when all members grant autopay permissions.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
