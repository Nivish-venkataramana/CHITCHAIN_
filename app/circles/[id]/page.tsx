"use client";

import React, { useState } from "react";
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
  ArrowRight,
  Search,
} from "lucide-react";

export default function CircleDetailPage() {
  const params = useParams();
  const circleId = params.id as string;
  const { user, users } = useDevUser();

  const [searchQuery, setSearchQuery] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Mock circle details based on standard flow
  const circle = {
    id: circleId,
    name: "Alpha Friends Chit",
    volunteer: "0x1111111111111111111111111111111111111111",
    volunteerName: "Asha Rao",
    numPeople: 4,
    monthlyAmount: 1000,
    durationMonths: 3,
    status: "INVITING", // INVITING | ISSUE_STAGE | FINALIZED
  };

  const isVolunteer = user?.username === "asharao01" || user?.walletAddress === circle.volunteer;

  // Invites status board
  const [invites, setInvites] = useState([
    {
      username: "asharao01",
      displayName: "Asha Rao",
      wallet: "0x1111111111111111111111111111111111111111",
      status: "ACCEPTED",
      isVolunteer: true,
      balance: 5000,
    },
    {
      username: "vikramnair02",
      displayName: "Vikram Nair",
      wallet: "0x2222222222222222222222222222222222222222",
      status: "ACCEPTED",
      isVolunteer: false,
      balance: 4500,
    },
    {
      username: "meerajoshi03",
      displayName: "Meera Joshi",
      wallet: "0x3333333333333333333333333333333333333333",
      status: "PENDING",
      isVolunteer: false,
      balance: 3200,
    },
  ]);

  const handleInviteUser = (targetUsername: string) => {
    setInviteError(null);
    const target = users.find((u) => u.username === targetUsername);
    if (!target) return;

    if (invites.some((inv) => inv.username === target.username)) {
      setInviteError(`@${target.username} is already invited or in the circle.`);
      return;
    }

    // Balance check simulation: require >= 3 x monthly (3,000 USDC)
    // Let's simulate a user with insufficient balance for demo checking
    const simulatedBalance = target.username === "arjunpatel06" ? 400 : 4000;
    const requiredBalance = circle.monthlyAmount * 3;

    if (simulatedBalance < requiredBalance) {
      setInviteError(
        `[${target.username}] holds ${simulatedBalance} USDC; needs at least ${requiredBalance} USDC (3 x monthly amount). Invite blocked.`
      );
      return;
    }

    setInvites([
      ...invites,
      {
        username: target.username,
        displayName: target.displayName,
        wallet: target.walletAddress,
        status: "PENDING",
        isVolunteer: false,
        balance: simulatedBalance,
      },
    ]);
    setSearchQuery("");
  };

  const filteredUsers = users.filter(
    (u) =>
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
              {circle.status}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Volunteer Organizer: <strong>{circle.volunteerName}</strong> • Circle ID:{" "}
            <span className="font-mono">{circle.id}</span>
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
          <p className="text-xl font-bold text-slate-900 mt-1">{circle.monthlyAmount} USDC</p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <span className="text-xs text-slate-500">Duration</span>
          <p className="text-xl font-bold text-slate-900 mt-1">{circle.durationMonths} Months</p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <span className="text-xs text-slate-500">Required 3x Balance</span>
          <p className="text-xl font-bold text-emerald-600 mt-1">
            {circle.monthlyAmount * 3} USDC
          </p>
        </div>
      </div>

      {/* Invite Status Board & Search (Volunteer Only) */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Left 2 Cols: Status Board */}
        <div className="md:col-span-2 rounded-2xl border bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Member Status Board ({invites.filter((i) => i.status === "ACCEPTED").length} / {circle.numPeople})
            </h2>
            <span className="text-xs text-slate-500">
              {circle.numPeople - invites.filter((i) => i.status === "ACCEPTED").length} spots remaining
            </span>
          </div>

          <div className="divide-y border rounded-xl overflow-hidden">
            {invites.map((inv) => (
              <div key={inv.username} className="p-4 flex items-center justify-between bg-white hover:bg-slate-50">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-900">{inv.displayName}</span>
                    <span className="text-xs text-slate-500">@{inv.username}</span>
                    {inv.isVolunteer && (
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                        Volunteer
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-mono text-slate-400">
                    {inv.wallet.slice(0, 8)}...{inv.wallet.slice(-6)} • Balance: {inv.balance} USDC
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
            ))}
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
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
              {inviteError}
            </div>
          )}

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {filteredUsers.map((u) => {
              const alreadyInvited = invites.some((i) => i.username === u.username);
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
                    disabled={alreadyInvited}
                    onClick={() => handleInviteUser(u.username)}
                    className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                      alreadyInvited
                        ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                    }`}
                  >
                    {alreadyInvited ? "Added" : "Add"}
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
