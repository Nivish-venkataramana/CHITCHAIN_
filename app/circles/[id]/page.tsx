"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useDevUser } from "@/components/providers";
import {
  ArrowLeft,
  Users,
  ShieldCheck,
  UserPlus,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Search,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { fromBaseUnits } from "@/lib/validation";
import { UserProfile } from "@/handoffs/user-profile";

interface CircleDetails {
  id: string;
  name: string;
  volunteerWallet: string;
  volunteerUsername?: string;
  numPeople: number;
  monthlyAmount: string;
  durationMonths: number;
  status: "INVITING" | "ISSUE_STAGE" | "FINALIZED";
  invites: Array<{
    id: string;
    inviteeWallet: string;
    inviteeUsername: string;
    status: "PENDING" | "ACCEPTED" | "REJECTED";
    balanceAtCheck: string;
    createdAt: string;
  }>;
}

export default function CircleDetailPage() {
  const params = useParams();
  const circleId = params.id as string;
  const { user, users } = useDevUser();

  const [circle, setCircle] = useState<CircleDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [invitingUsername, setInvitingUsername] = useState<string | null>(null);

  const fetchCircle = () => {
    fetch(`/api/circles/${circleId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && !data.error) {
          setCircle(data);
        }
      })
      .catch((err) => console.error("Error loading circle:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCircle();
  }, [circleId]);

  const isVolunteer =
    user?.username === circle?.volunteerUsername ||
    user?.walletAddress.toLowerCase() === circle?.volunteerWallet.toLowerCase();

  const handleInviteUser = async (targetUsername: string) => {
    if (!user) return;
    setInviteError(null);
    setInviteSuccess(null);
    setInvitingUsername(targetUsername);

    try {
      const res = await fetch(`/api/circles/${circleId}/invites`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-dev-user": user.username,
        },
        body: JSON.stringify({ username: targetUsername }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send invite");
      }

      setInviteSuccess(`Invite sent successfully to @${targetUsername}!`);
      fetchCircle();
      setSearchQuery("");
    } catch (err: any) {
      setInviteError(err.message || "Failed to send invite");
    } finally {
      setInvitingUsername(null);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-12 text-center text-sm text-slate-500 bg-white rounded-2xl border">
        Loading circle details...
      </div>
    );
  }

  if (!circle) {
    return (
      <div className="p-12 text-center bg-white rounded-2xl border space-y-3">
        <p className="text-slate-600 text-sm">Circle not found.</p>
        <Link href="/circles" className="text-xs font-semibold text-blue-600">
          ← Back to circles
        </Link>
      </div>
    );
  }

  const acceptedInvites = circle.invites.filter((i) => i.status === "ACCEPTED");
  const monthlyUSDC = fromBaseUnits(circle.monthlyAmount);

  return (
    <div className="space-y-8 py-4">
      <Link
        href="/circles"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to circles
      </Link>

      {/* Header Banner */}
      <div className="rounded-2xl border bg-white p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{circle.name}</h1>
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                circle.status === "FINALIZED"
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                  : circle.status === "ISSUE_STAGE"
                  ? "bg-amber-100 text-amber-800 border border-amber-200"
                  : "bg-blue-100 text-blue-800 border border-blue-200"
              }`}
            >
              {circle.status}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Volunteer Organizer:{" "}
            <strong>
              {circle.volunteerUsername ? `@${circle.volunteerUsername}` : circle.volunteerWallet}
            </strong>{" "}
            • Circle ID: <span className="font-mono">{circle.id}</span>
          </p>
        </div>

        {/* Hand-off action pills */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/circles/${circle.id}/issues`}
            className="px-4 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold border border-amber-200 transition-colors flex items-center gap-1.5"
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            Issue Stage
          </Link>

          <Link
            href={`/circles/${circle.id}/autopay`}
            className="px-4 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200 transition-colors flex items-center gap-1.5"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Autopay
          </Link>

          <Link
            href={`/circles/${circle.id}/pool`}
            className="px-4 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-bold border border-blue-200 transition-colors"
          >
            Pool Vault
          </Link>

          <Link
            href={`/circles/${circle.id}/bidding`}
            className="px-4 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 text-xs font-bold border border-purple-200 transition-colors"
          >
            Bidding Auction
          </Link>
        </div>
      </div>

      {/* Circle Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border bg-white p-4">
          <span className="text-xs text-slate-500">Total Members (N)</span>
          <p className="text-xl font-bold text-slate-900 mt-1">{circle.numPeople}</p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <span className="text-xs text-slate-500">Monthly Contribution</span>
          <p className="text-xl font-bold text-slate-900 mt-1">{monthlyUSDC} USDC</p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <span className="text-xs text-slate-500">Duration</span>
          <p className="text-xl font-bold text-slate-900 mt-1">{circle.durationMonths} Months</p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <span className="text-xs text-slate-500">Required 3x Balance</span>
          <p className="text-xl font-bold text-emerald-600 mt-1">
            {(Number(monthlyUSDC) * 3).toLocaleString()} USDC
          </p>
        </div>
      </div>

      {/* Invite Status Board & Search */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Left 2 Cols: Status Board */}
        <div className="md:col-span-2 rounded-2xl border bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Member Status Board ({acceptedInvites.length} / {circle.numPeople})
            </h2>
            <span className="text-xs text-slate-500">
              {Math.max(0, circle.numPeople - acceptedInvites.length)} spots remaining
            </span>
          </div>

          <div className="divide-y border rounded-xl overflow-hidden">
            {circle.invites.map((inv) => {
              const u = users.find((usr) => usr.username === inv.inviteeUsername);
              const isVol = inv.inviteeWallet.toLowerCase() === circle.volunteerWallet.toLowerCase();

              return (
                <div
                  key={inv.id}
                  className="p-4 flex items-center justify-between bg-white hover:bg-slate-50 transition-colors"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-slate-900">
                        {u?.displayName || inv.inviteeUsername}
                      </span>
                      <span className="text-xs text-slate-500">@{inv.inviteeUsername}</span>
                      {isVol && (
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                          Volunteer
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-mono text-slate-400">
                      {inv.inviteeWallet.slice(0, 8)}...{inv.inviteeWallet.slice(-6)} • Balance checked:{" "}
                      {fromBaseUnits(inv.balanceAtCheck)} USDC
                    </p>
                  </div>

                  <div>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        inv.status === "ACCEPTED"
                          ? "bg-emerald-100 text-emerald-800"
                          : inv.status === "PENDING"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {inv.status === "ACCEPTED" && <CheckCircle className="h-3.5 w-3.5" />}
                      {inv.status === "PENDING" && <Clock className="h-3.5 w-3.5" />}
                      {inv.status === "REJECTED" && <XCircle className="h-3.5 w-3.5" />}
                      {inv.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Col: Invite Candidate Search */}
        <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-blue-600" />
            Add People by Username
          </h3>

          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search username or name..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {inviteError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-1.5">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{inviteError}</span>
            </div>
          )}

          {inviteSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{inviteSuccess}</span>
            </div>
          )}

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {filteredUsers.map((u) => {
              const alreadyInvited = circle.invites.some(
                (i) => i.inviteeUsername === u.username && i.status !== "REJECTED"
              );
              const isInvitingThis = invitingUsername === u.username;

              return (
                <div
                  key={u.username}
                  className="p-2.5 rounded-xl border flex items-center justify-between text-xs bg-slate-50"
                >
                  <div>
                    <p className="font-semibold text-slate-800">{u.displayName}</p>
                    <p className="text-slate-400 font-mono">@{u.username}</p>
                  </div>
                  <button
                    disabled={alreadyInvited || isInvitingThis || !isVolunteer}
                    onClick={() => handleInviteUser(u.username)}
                    className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                      alreadyInvited
                        ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                        : !isVolunteer
                        ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                    }`}
                  >
                    {isInvitingThis ? "Checking..." : alreadyInvited ? "Added" : "Add"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
