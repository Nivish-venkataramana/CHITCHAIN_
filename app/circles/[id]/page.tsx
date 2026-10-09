"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useDevUser } from "@/components/providers";
import { usePrivy, useWallets } from "@privy-io/react-auth";
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
  Shield,
  ArrowRight,
  Coins,
  Edit3,
  Trash2,
} from "lucide-react";
import { fromBaseUnits } from "@/lib/validation";
import { EditCircleModal, DeleteCircleModal } from "@/components/circle-action-modals";

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
  const router = useRouter();
  const circleId = params.id as string;
  const { user, users } = useDevUser();
  const { user: privyUser } = usePrivy();
  const { wallets } = useWallets();

  // Dynamic user identity extraction
  const embeddedWallet = wallets.find((w) => w.walletClientType === "privy") || wallets[0];
  const activeWalletAddress = (
    embeddedWallet?.address ||
    privyUser?.wallet?.address ||
    user?.walletAddress ||
    ""
  ).toLowerCase();

  const userEmail = privyUser?.email?.address || "";
  const dynamicUsername = userEmail
    ? userEmail.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "").toLowerCase()
    : activeWalletAddress
    ? `user_${activeWalletAddress.slice(2, 6).toLowerCase()}`
    : user?.username || "member";

  const [circle, setCircle] = useState<CircleDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [directoryUsers, setDirectoryUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [invitingUsername, setInvitingUsername] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

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

  useEffect(() => {
    if (!searchQuery.trim()) {
      fetch("/api/users/search?q=")
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) setDirectoryUsers(data);
        })
        .catch(() => {});
      return;
    }

    const timer = setTimeout(() => {
      fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`)
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) setDirectoryUsers(data);
        })
        .catch(() => {});
    }, 150);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const isVolunteer =
    Boolean(circle) &&
    (circle?.volunteerUsername?.toLowerCase() === dynamicUsername.toLowerCase() ||
      circle?.volunteerUsername?.toLowerCase() === user?.username?.toLowerCase() ||
      circle?.volunteerWallet?.toLowerCase() === activeWalletAddress ||
      circle?.volunteerWallet?.toLowerCase() === user?.walletAddress?.toLowerCase());

  const handleInviteUser = async (targetUsername: string) => {
    const cleanTarget = targetUsername.trim().replace(/^@/, "");
    if (!cleanTarget) return;
    setInviteError(null);
    setInviteSuccess(null);
    setInvitingUsername(cleanTarget);

    try {
      const res = await fetch(`/api/circles/${circleId}/invites`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-dev-user": dynamicUsername,
          "x-dev-wallet": activeWalletAddress,
        },
        body: JSON.stringify({ username: cleanTarget }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send invite");
      }

      setInviteSuccess(`Invite sent successfully to @${cleanTarget}`);
      fetchCircle();
      setSearchQuery("");
    } catch (err: any) {
      setInviteError(err.message || "Failed to send invite");
    } finally {
      setInvitingUsername(null);
    }
  };

  const allCandidatePool = directoryUsers.length > 0 ? directoryUsers : users;
  const cleanQuery = searchQuery.trim().replace(/^@/, "").toLowerCase();

  const filteredUsers = allCandidatePool.filter((u) => {
    const isSelf =
      u.username.toLowerCase() === dynamicUsername.toLowerCase() ||
      (user?.username && u.username.toLowerCase() === user.username.toLowerCase()) ||
      (activeWalletAddress && u.walletAddress?.toLowerCase() === activeWalletAddress) ||
      (user?.walletAddress && u.walletAddress?.toLowerCase() === user.walletAddress.toLowerCase());
    if (isSelf) return false;
    if (!cleanQuery) return true;
    return (
      u.username.toLowerCase().includes(cleanQuery) ||
      u.displayName.toLowerCase().includes(cleanQuery) ||
      u.walletAddress?.toLowerCase().includes(cleanQuery)
    );
  });

  if (loading) {
    return (
      <div className="p-16 text-center text-sm text-neutral-500 bg-neutral-950 rounded-3xl border border-neutral-900">
        Loading circle details...
      </div>
    );
  }

  if (!circle) {
    return (
      <div className="p-16 text-center bg-neutral-950 rounded-3xl border border-neutral-900 space-y-4">
        <p className="text-neutral-400 text-sm">Circle not found.</p>
        <Link href="/circles" className="text-xs font-bold text-amber-400">
          Return to circles
        </Link>
      </div>
    );
  }

  const acceptedInvites = circle.invites.filter((i) => i.status === "ACCEPTED");
  const monthlyUSDC = fromBaseUnits(circle.monthlyAmount);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8 text-neutral-100">
      {/* Action Modals */}
      <EditCircleModal
        isOpen={isEditOpen}
        circle={circle}
        onClose={() => setIsEditOpen(false)}
        onSuccess={() => fetchCircle()}
      />

      <DeleteCircleModal
        isOpen={isDeleteOpen}
        circle={circle}
        onClose={() => setIsDeleteOpen(false)}
        onSuccess={() => router.push("/circles")}
      />

      <Link
        href="/circles"
        className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Return to Circles</span>
      </Link>

      {/* Header Banner */}
      <div className="rounded-3xl border border-neutral-900 bg-neutral-950 p-8 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-white tracking-tight">{circle.name}</h1>
            <span
              className={`px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase ${
                circle.status === "FINALIZED"
                  ? "bg-emerald-950/80 text-emerald-300 border border-emerald-800/60"
                  : circle.status === "ISSUE_STAGE"
                  ? "bg-amber-950/80 text-amber-300 border border-amber-800/60"
                  : "bg-blue-950/80 text-blue-300 border border-blue-800/60"
              }`}
            >
              {circle.status}
            </span>
          </div>
          <p className="text-xs text-neutral-400">
            {circle.status !== "FINALIZED" ? (
              isVolunteer ? (
                <>
                  Initiated by: <strong className="text-white">You (Volunteer)</strong> • Identifier:{" "}
                  <span className="font-mono text-neutral-300">{circle.id}</span>
                </>
              ) : (
                <>
                  Volunteer:{" "}
                  <strong className="text-white">
                    {circle.volunteerUsername ? `@${circle.volunteerUsername}` : circle.volunteerWallet}
                  </strong>{" "}
                  • Identifier: <span className="font-mono text-neutral-300">{circle.id}</span>
                </>
              )
            ) : (
              <>
                <span className="text-emerald-400 font-semibold">Decentralized Protocol</span> • Identifier:{" "}
                <span className="font-mono text-neutral-300">{circle.id}</span>
              </>
            )}
          </p>
        </div>

        {/* Hand off action navigation */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Volunteer Edit & Delete Controls */}
          {isVolunteer && circle.status !== "FINALIZED" && (
            <>
              <button
                type="button"
                onClick={() => setIsEditOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold border border-neutral-800 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Edit3 className="h-3.5 w-3.5 text-neutral-300" />
                <span>Edit Circle</span>
              </button>

              <button
                type="button"
                onClick={() => setIsDeleteOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-red-950/60 text-red-400 border border-neutral-800 hover:border-red-900/50 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete</span>
              </button>
            </>
          )}

          <Link
            href={`/circles/${circle.id}/issues`}
            className="px-4 py-2.5 rounded-xl bg-amber-950/50 hover:bg-amber-900/50 text-amber-300 text-xs font-bold border border-amber-800/50 transition-colors flex items-center gap-1.5"
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Issue Stage</span>
          </Link>

          <Link
            href={`/circles/${circle.id}/autopay`}
            className="px-4 py-2.5 rounded-xl bg-emerald-950/50 hover:bg-emerald-900/50 text-emerald-300 text-xs font-bold border border-emerald-800/50 transition-colors flex items-center gap-1.5"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Autopay</span>
          </Link>

          <Link
            href={`/circles/${circle.id}/pool`}
            className="px-4 py-2.5 rounded-xl bg-blue-950/50 hover:bg-blue-900/50 text-blue-300 text-xs font-bold border border-blue-800/50 transition-colors"
          >
            <span>Pool Vault</span>
          </Link>

          <Link
            href={`/circles/${circle.id}/bidding`}
            className="px-4 py-2.5 rounded-xl bg-purple-950/50 hover:bg-purple-900/50 text-purple-300 text-xs font-bold border border-purple-800/50 transition-colors"
          >
            <span>Secret Auction</span>
          </Link>
        </div>
      </div>

      {/* Circle Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-neutral-900 bg-neutral-950 p-5 space-y-1">
          <span className="text-[11px] uppercase tracking-wider text-neutral-400 block font-semibold">Total Capacity</span>
          <p className="text-2xl font-bold text-white font-mono mt-1">{circle.numPeople} Members</p>
        </div>
        <div className="rounded-2xl border border-neutral-900 bg-neutral-950 p-5 space-y-1">
          <span className="text-[11px] uppercase tracking-wider text-neutral-400 block font-semibold">Monthly Amount</span>
          <p className="text-2xl font-bold text-white font-mono mt-1">{monthlyUSDC} <span className="text-xs font-normal text-neutral-400">USDC</span></p>
        </div>
        <div className="rounded-2xl border border-neutral-900 bg-neutral-950 p-5 space-y-1">
          <span className="text-[11px] uppercase tracking-wider text-neutral-400 block font-semibold">Tenure</span>
          <p className="text-2xl font-bold text-white font-mono mt-1">{circle.durationMonths} Months</p>
        </div>
        <div className="rounded-2xl border border-neutral-900 bg-neutral-950 p-5 space-y-1">
          <span className="text-[11px] uppercase tracking-wider text-neutral-400 block font-semibold">Invite Gate 3x</span>
          <p className="text-2xl font-bold text-emerald-400 font-mono mt-1">
            {(Number(monthlyUSDC) * 3).toLocaleString()} <span className="text-xs font-normal text-neutral-400">USDC</span>
          </p>
        </div>
      </div>

      {/* Invite Status Board & Search */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Left 2 Cols: Status Board */}
        <div className="md:col-span-2 rounded-3xl border border-neutral-900 bg-neutral-950 p-8 shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-neutral-900 pb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
              <Users className="h-5 w-5 text-amber-500" />
              <span>Participant Board ({acceptedInvites.length} of {circle.numPeople})</span>
            </h2>
            <span className="text-xs font-mono text-neutral-400">
              {Math.max(0, circle.numPeople - acceptedInvites.length)} seats remaining
            </span>
          </div>

          <div className="divide-y divide-neutral-900 border border-neutral-900 rounded-2xl overflow-hidden">
            {circle.invites.map((inv) => {
              const u = users.find((usr) => usr.username === inv.inviteeUsername);
              const isVol = inv.inviteeWallet.toLowerCase() === circle.volunteerWallet.toLowerCase();
              const isCurrentUser =
                inv.inviteeUsername.toLowerCase() === dynamicUsername.toLowerCase() ||
                (user?.username && inv.inviteeUsername.toLowerCase() === user.username.toLowerCase()) ||
                (activeWalletAddress && inv.inviteeWallet.toLowerCase() === activeWalletAddress) ||
                (user?.walletAddress && inv.inviteeWallet.toLowerCase() === user.walletAddress.toLowerCase());

              return (
                <div
                  key={inv.id}
                  className="p-5 flex items-center justify-between bg-neutral-950 hover:bg-neutral-900/60 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">
                        {isCurrentUser ? (u?.displayName ? `${u.displayName} (You)` : "You") : u?.displayName || inv.inviteeUsername}
                      </span>
                      <span className="text-xs text-neutral-400 font-mono">@{inv.inviteeUsername}</span>
                      {isCurrentUser && (
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-neutral-800 text-neutral-200 border border-neutral-700">
                          You
                        </span>
                      )}
                      {!isCurrentUser && isVol && circle.status !== "FINALIZED" && (
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-800/50">
                          Volunteer
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-mono text-neutral-500">
                      {inv.inviteeWallet.slice(0, 8)}...{inv.inviteeWallet.slice(-6)} • Balance verified:{" "}
                      {fromBaseUnits(inv.balanceAtCheck)} USDC
                    </p>
                  </div>

                  <div>
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        inv.status === "ACCEPTED"
                          ? "bg-emerald-950 text-emerald-300 border border-emerald-800/60"
                          : inv.status === "PENDING"
                          ? "bg-amber-950 text-amber-300 border border-amber-800/60"
                          : "bg-red-950 text-red-300 border border-red-800/60"
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
        <div className="rounded-3xl border border-neutral-900 bg-neutral-950 p-8 shadow-2xl space-y-6">
          <div className="border-b border-neutral-900 pb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-amber-500" />
              <span>Add Members</span>
            </h3>
            <p className="text-xs text-neutral-400 mt-1">Search by unique username or wallet address</p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!isVolunteer) return;
              if (filteredUsers.length > 0) {
                handleInviteUser(filteredUsers[0].username);
              } else if (cleanQuery) {
                setInviteError(`Account @${cleanQuery} does not exist in the database.`);
              }
            }}
            className="space-y-3"
          >
            <div className="relative flex items-center">
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-neutral-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (inviteError) setInviteError(null);
                }}
                placeholder="Type member username..."
                className="w-full pl-10 pr-4 py-3 text-xs rounded-xl border border-neutral-800 bg-neutral-900 text-white focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
          </form>

          {inviteError && (
            <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-800/50 text-red-300 text-xs flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
              <span>{inviteError}</span>
            </div>
          )}

          {inviteSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800/50 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>{inviteSuccess}</span>
            </div>
          )}

          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {filteredUsers.map((u) => {
              const alreadyInvited = circle.invites.some(
                (i) => i.inviteeUsername?.toLowerCase() === u.username?.toLowerCase() && i.status !== "REJECTED"
              );
              const isInvitingThis = invitingUsername === u.username;

              return (
                <div
                  key={u.username}
                  className="p-3 rounded-xl border border-neutral-800 flex items-center justify-between text-xs bg-neutral-900/60"
                >
                  <div>
                    <p className="font-bold text-white">{u.displayName}</p>
                    <p className="text-neutral-400 font-mono text-[11px]">@{u.username}</p>
                  </div>
                  <button
                    type="button"
                    disabled={alreadyInvited || isInvitingThis || !isVolunteer}
                    onClick={() => handleInviteUser(u.username)}
                    className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all ${
                      alreadyInvited
                        ? "bg-neutral-800 text-neutral-500 cursor-not-allowed"
                        : !isVolunteer
                        ? "bg-neutral-800 text-neutral-500 cursor-not-allowed"
                        : "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-semibold cursor-pointer shadow-sm"
                    }`}
                  >
                    {isInvitingThis ? "Verifying..." : alreadyInvited ? "Added" : "Add"}
                  </button>
                </div>
              );
            })}

            {cleanQuery && filteredUsers.length === 0 && (
              <div className="p-5 rounded-2xl border border-neutral-900 bg-neutral-900/40 text-center text-xs space-y-1">
                <p className="text-white font-medium">No registered member found</p>
                <p className="text-[11px] text-neutral-500">
                  No account in the database matches <strong className="text-neutral-300">@{cleanQuery}</strong>.
                </p>
              </div>
            )}

            {!cleanQuery && filteredUsers.length === 0 && (
              <p className="text-neutral-500 text-xs text-center py-4">
                Type a registered username to invite them.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
