"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useDevUser } from "@/components/providers";
import {
  ArrowLeft,
  Users,
  Shield,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Search,
  ArrowRight,
} from "lucide-react";
import { fromBaseUnits } from "@/lib/validation";

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
        if (data && !data.error) setCircle(data);
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
      if (!res.ok) throw new Error(data.error || "Failed to send invite");

      setInviteSuccess(`Invite sent to @${targetUsername}`);
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
      <div className="p-16 text-center text-sm text-neutral-500 glass-panel rounded-3xl">
        Loading circle details...
      </div>
    );
  }

  if (!circle) {
    return (
      <div className="p-16 text-center glass-panel rounded-3xl space-y-4">
        <p className="text-neutral-400 text-sm">Circle not found.</p>
        <Link href="/circles" className="text-xs font-medium text-emerald-400">
          ← Back to circles
        </Link>
      </div>
    );
  }

  const acceptedInvites = circle.invites.filter((i) => i.status === "ACCEPTED");
  const monthlyUSDC = fromBaseUnits(circle.monthlyAmount);

  return (
    <div className="space-y-10 py-6">
      <Link
        href="/circles"
        className="inline-flex items-center gap-2 text-xs text-neutral-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to circles
      </Link>

      {/* Header Banner */}
      <div className="rounded-3xl glass-panel p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white tracking-tight">{circle.name}</h1>
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium border ${
                circle.status === "FINALIZED"
                  ? "bg-emerald-950/40 text-emerald-300 border-emerald-500/30"
                  : circle.status === "ISSUE_STAGE"
                  ? "bg-amber-950/40 text-amber-300 border-amber-500/30"
                  : "bg-neutral-800 text-neutral-300 border-white/10"
              }`}
            >
              {circle.status}
            </span>
          </div>
          <p className="text-xs text-neutral-400">
            Organizer:{" "}
            <span className="text-neutral-300">
              {circle.volunteerUsername ? `@${circle.volunteerUsername}` : circle.volunteerWallet.slice(0, 8)}
            </span>
          </p>
        </div>

        {/* Action Pills */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href={`/circles/${circle.id}/issues`}
            className="px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-neutral-300 hover:text-white text-xs font-medium border border-white/10 transition-colors"
          >
            Issues
          </Link>
          <Link
            href={`/circles/${circle.id}/autopay`}
            className="px-4 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-medium border border-emerald-500/20 transition-colors"
          >
            Autopay
          </Link>
          <Link
            href={`/circles/${circle.id}/pool`}
            className="px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-neutral-300 hover:text-white text-xs font-medium border border-white/10 transition-colors"
          >
            Pool
          </Link>
          <Link
            href={`/circles/${circle.id}/bidding`}
            className="px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-neutral-300 hover:text-white text-xs font-medium border border-white/10 transition-colors"
          >
            Auction
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl glass-panel p-5">
          <span className="text-[11px] text-neutral-500 block">Members</span>
          <p className="text-xl font-bold text-white mt-1">{circle.numPeople}</p>
        </div>
        <div className="rounded-2xl glass-panel p-5">
          <span className="text-[11px] text-neutral-500 block">Monthly</span>
          <p className="text-xl font-bold text-white mt-1">{monthlyUSDC} USDC</p>
        </div>
        <div className="rounded-2xl glass-panel p-5">
          <span className="text-[11px] text-neutral-500 block">Duration</span>
          <p className="text-xl font-bold text-white mt-1">{circle.durationMonths} Mos</p>
        </div>
        <div className="rounded-2xl glass-panel p-5">
          <span className="text-[11px] text-neutral-500 block">3x Invite Req</span>
          <p className="text-xl font-bold text-emerald-400 mt-1">
            {(Number(monthlyUSDC) * 3).toLocaleString()} USDC
          </p>
        </div>
      </div>

      {/* Status Board & Invite Search */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Member Status Board */}
        <div className="md:col-span-2 rounded-3xl glass-panel p-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-400" />
              Members ({acceptedInvites.length} / {circle.numPeople})
            </h2>
            <span className="text-xs text-neutral-500">
              {Math.max(0, circle.numPeople - acceptedInvites.length)} slots left
            </span>
          </div>

          <div className="divide-y divide-white/5 border border-white/5 rounded-2xl overflow-hidden">
            {circle.invites.map((inv) => {
              const u = users.find((usr) => usr.username === inv.inviteeUsername);
              const isVol = inv.inviteeWallet.toLowerCase() === circle.volunteerWallet.toLowerCase();

              return (
                <div
                  key={inv.id}
                  className="p-4 flex items-center justify-between bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-white">
                        {u?.displayName || inv.inviteeUsername}
                      </span>
                      <span className="text-xs text-neutral-400 font-mono">@{inv.inviteeUsername}</span>
                      {isVol && (
                        <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Volunteer
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-mono text-neutral-500">
                      {inv.inviteeWallet.slice(0, 6)}...{inv.inviteeWallet.slice(-4)} • Balance check: {fromBaseUnits(inv.balanceAtCheck)} USDC
                    </p>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium border ${
                      inv.status === "ACCEPTED"
                        ? "bg-emerald-950/40 text-emerald-300 border-emerald-500/30"
                        : inv.status === "PENDING"
                        ? "bg-amber-950/40 text-amber-300 border-amber-500/30"
                        : "bg-red-950/40 text-red-300 border-red-500/30"
                    }`}
                  >
                    {inv.status === "ACCEPTED" && <CheckCircle2 className="h-3 w-3" />}
                    {inv.status === "PENDING" && <Clock className="h-3 w-3" />}
                    {inv.status === "REJECTED" && <XCircle className="h-3 w-3" />}
                    {inv.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Add Members by Username */}
        <div className="rounded-3xl glass-panel p-8 space-y-6">
          <h3 className="text-base font-semibold text-white">Add People</h3>

          <div className="relative">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-neutral-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search username..."
              className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl glass-input focus:outline-none"
            />
          </div>

          {inviteError && (
            <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs">
              {inviteError}
            </div>
          )}

          {inviteSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs">
              {inviteSuccess}
            </div>
          )}

          <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
            {filteredUsers.map((u) => {
              const alreadyInvited = circle.invites.some(
                (i) => i.inviteeUsername === u.username && i.status !== "REJECTED"
              );
              const isInvitingThis = invitingUsername === u.username;

              return (
                <div
                  key={u.username}
                  className="p-3 rounded-xl border border-white/5 bg-white/[0.02] flex items-center justify-between text-xs"
                >
                  <div>
                    <p className="font-medium text-white">{u.displayName}</p>
                    <p className="text-neutral-500 font-mono text-[11px]">@{u.username}</p>
                  </div>
                  <button
                    disabled={alreadyInvited || isInvitingThis || !isVolunteer}
                    onClick={() => handleInviteUser(u.username)}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                      alreadyInvited
                        ? "bg-white/5 text-neutral-500 cursor-not-allowed"
                        : !isVolunteer
                        ? "bg-white/5 text-neutral-500 cursor-not-allowed"
                        : "bg-emerald-500 hover:bg-emerald-400 text-black font-semibold cursor-pointer"
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
