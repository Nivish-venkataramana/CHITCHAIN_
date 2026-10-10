"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useDevUser } from "@/components/providers";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import {
  ArrowLeft,
  Users,
  UserPlus,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Search,
  AlertCircle,
  ShieldCheck,
  Layers,
  Coins,
  Edit3,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { fromBaseUnits } from "@/lib/validation";
import { EditCircleModal, DeleteCircleModal } from "@/components/circle-action-modals";
import { AutoPayAuthorization } from "@/components/AutoPayAuthorization";

interface CircleDetails {
  id: string;
  name: string;
  volunteerWallet: string;
  volunteerUsername?: string;
  numPeople: number;
  monthlyAmount: string;
  durationMonths: number;
  status: "INVITING" | "ISSUE_STAGE" | "FINALIZED";
  vaultAddress?: string | null;
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

  const embeddedWallet = wallets.find((w) => w.walletClientType === "privy") || wallets[0];
  const activeWalletAddress = (
    user?.walletAddress ||
    (typeof window !== "undefined" ? localStorage.getItem("chitchain_smart_wallet_address") : "") ||
    (privyUser as any)?.smartWallet?.address ||
    embeddedWallet?.address ||
    privyUser?.wallet?.address ||
    ""
  ).toLowerCase();

  const userEmail = privyUser?.email?.address || "";
  const dynamicUsername = userEmail
    ? userEmail.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "").toLowerCase()
    : user?.username ||
      (activeWalletAddress ? `user_${activeWalletAddress.slice(2, 6).toLowerCase()}` : "member");

  const [circle, setCircle] = useState<CircleDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [directoryUsers, setDirectoryUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [invitingUsername, setInvitingUsername] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isAutoPayExpanded, setIsAutoPayExpanded] = useState(false);

  const fetchCircle = React.useCallback(async () => {
    if (!circleId) return;
    try {
      const res = await fetch(`/api/circles/${circleId}`);
      if (!res.ok) {
        if (res.status === 404) {
          setLoading(false);
          return;
        }
      }
      const data = await res.json();
      if (data && !data.error && data.id) {
        setCircle(data);
      }
    } catch (err) {
      console.error("Error loading circle:", err);
    } finally {
      setLoading(false);
    }
  }, [circleId]);

  useEffect(() => {
    fetchCircle();
  }, [fetchCircle]);

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
      circle?.volunteerWallet?.toLowerCase() === user?.walletAddress?.toLowerCase() ||
      !activeWalletAddress);

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
          "x-dev-wallet": activeWalletAddress || circle?.volunteerWallet || "",
        },
        body: JSON.stringify({ username: cleanTarget }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send invite");
      }

      setInviteSuccess(`Invite sent to @${cleanTarget}`);
      await fetchCircle();
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
      <div className="flex-1 flex items-center justify-center">
        <div className="p-8 text-center text-xs font-mono text-neutral-400 rounded-3xl border border-white/10 bg-transparent">
          Loading circle details...
        </div>
      </div>
    );
  }

  if (!circle) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="p-8 text-center rounded-3xl border border-white/10 bg-transparent space-y-3">
          <p className="text-neutral-300 text-sm">Circle not found.</p>
          <Link href="/dashboard" className="text-xs font-semibold text-white hover:underline">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const acceptedInvites = circle.invites.filter((i) => i.status === "ACCEPTED");
  const monthlyUSDC = fromBaseUnits(circle.monthlyAmount);

  return (
    <div className="w-full max-w-5xl mx-auto px-2 sm:px-4 flex flex-col text-neutral-100 gap-4 py-4 pb-32">
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
        onSuccess={() => router.push("/dashboard")}
      />

      {/* Top Bar: Return Link */}
      <div className="flex items-center justify-between shrink-0">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Return to Dashboard</span>
        </Link>
      </div>

      {/* Header Banner - Transparent with light white tint */}
      <div className="rounded-2xl border border-white/10 bg-transparent p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0 shadow-lg">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">{circle.name}</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider border border-white/20 text-neutral-200">
              {circle.status}
            </span>
          </div>
          <p className="text-[11px] text-neutral-400">
            {circle.status !== "FINALIZED" ? (
              isVolunteer ? (
                <>
                  Initiated by: <span className="text-white font-medium">You (Volunteer)</span> • ID:{" "}
                  <span className="font-mono text-neutral-300">{circle.id}</span>
                </>
              ) : (
                <>
                  Volunteer:{" "}
                  <span className="text-white font-medium">
                    @{circle.volunteerUsername || "volunteer"}
                  </span>{" "}
                  • ID: <span className="font-mono text-neutral-300">{circle.id}</span>
                </>
              )
            ) : (
              <>
                <span className="text-emerald-400 font-medium">Decentralized Protocol</span> • ID:{" "}
                <span className="font-mono text-neutral-300">{circle.id}</span>
              </>
            )}
          </p>
        </div>

        {/* Action Controls with Sleek Stroke Icons */}
        <div className="flex flex-wrap items-center gap-2">
          {isVolunteer && circle.status !== "FINALIZED" && (
            <>
              <button
                type="button"
                onClick={() => setIsEditOpen(true)}
                className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Edit Circle"
              >
                <Edit3 className="h-3.5 w-3.5 text-neutral-300" />
                <span>Edit</span>
              </button>

              <button
                type="button"
                onClick={() => setIsDeleteOpen(true)}
                className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-red-950/40 text-neutral-300 hover:text-red-400 hover:border-red-900/50 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Delete Circle"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete</span>
              </button>
            </>
          )}

          {/* Dedicated Web3 Auto-Pay Link */}
          <Link
            href={`/circles/${circle.id}/autopay`}
            className="px-3 py-1.5 rounded-xl border border-cyan-500/30 bg-cyan-950/40 hover:bg-cyan-900/50 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
            <span>Auto-Pay Engine</span>
          </Link>

          {(circle.status === "ISSUE_STAGE" || circle.status === "FINALIZED" || acceptedInvites.length >= circle.numPeople) ? (
            <Link
              href={`/circles/${circle.id}/issues`}
              className="px-3 py-1.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <AlertTriangle className="h-3.5 w-3.5 text-amber-300" />
              <span>Raise Issues</span>
            </Link>
          ) : (
            <div className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/[0.02] text-neutral-400 text-xs font-mono flex items-center gap-1.5 cursor-not-allowed">
              <Clock className="h-3.5 w-3.5 text-neutral-500" />
              <span>Waiting for Members ({acceptedInvites.length}/{circle.numPeople})</span>
            </div>
          )}

          {circle.status === "FINALIZED" && (
            <>
              <Link
                href={`/circles/${circle.id}/pool`}
                className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] text-neutral-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Layers className="h-3.5 w-3.5 text-neutral-300" />
                <span>Pool Vault</span>
              </Link>

              <Link
                href={`/circles/${circle.id}/bidding`}
                className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] text-neutral-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Coins className="h-3.5 w-3.5 text-neutral-300" />
                <span>Secret Auction</span>
              </Link>

              <Link
                href={`/circles/${circle.id}/yield`}
                className="px-3 py-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-[0_0_12px_rgba(6,182,212,0.15)]"
              >
                <TrendingUp className="h-3.5 w-3.5 text-cyan-400" />
                <span>Aave Yield</span>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Symmetrical 4-Column Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
        <div className="rounded-2xl border border-white/10 bg-transparent p-2.5 sm:p-3 text-center space-y-0.5 shadow-sm">
          <span className="text-[10px] uppercase tracking-wider text-neutral-400 block font-semibold">Capacity</span>
          <p className="text-base sm:text-lg font-bold text-white font-mono">{circle.numPeople} Members</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-transparent p-2.5 sm:p-3 text-center space-y-0.5 shadow-sm">
          <span className="text-[10px] uppercase tracking-wider text-neutral-400 block font-semibold">Monthly Amount</span>
          <p className="text-base sm:text-lg font-bold text-white font-mono">{monthlyUSDC} <span className="text-xs font-normal text-neutral-400">USDC</span></p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-transparent p-2.5 sm:p-3 text-center space-y-0.5 shadow-sm">
          <span className="text-[10px] uppercase tracking-wider text-neutral-400 block font-semibold">Tenure</span>
          <p className="text-base sm:text-lg font-bold text-white font-mono">{circle.durationMonths} Months</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-transparent p-2.5 sm:p-3 text-center space-y-0.5 shadow-sm">
          <span className="text-[10px] uppercase tracking-wider text-neutral-400 block font-semibold">3x Verification</span>
          <p className="text-base sm:text-lg font-bold text-white font-mono">
            {(Number(monthlyUSDC) * 3).toLocaleString()} <span className="text-xs font-normal text-neutral-400">USDC</span>
          </p>
        </div>
      </div>

      {/* Symmetrical 2-Column Section: Participant Board & Add Members */}
      <div className="grid md:grid-cols-2 gap-3.5 shrink-0">
        {/* Left Column: Participant Board */}
        <div className="rounded-2xl border border-white/10 bg-transparent p-4 flex flex-col min-h-[300px] max-h-[380px] shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5 shrink-0">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="h-4 w-4 text-neutral-300" />
              <span>Participant Board ({acceptedInvites.length} of {circle.numPeople})</span>
            </h2>
            <span className="text-[11px] font-mono text-neutral-400">
              {Math.max(0, circle.numPeople - acceptedInvites.length)} seats remaining
            </span>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-2 pr-1">
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
                  className="p-2.5 rounded-xl border border-white/10 bg-white/[0.02] flex items-center justify-between hover:border-white/20 transition-colors"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-white">
                        {isCurrentUser ? (u?.displayName ? `${u.displayName} (You)` : "You") : u?.displayName || inv.inviteeUsername}
                      </span>
                      <span className="text-[11px] text-neutral-400 font-mono">@{inv.inviteeUsername}</span>
                      {isCurrentUser && (
                        <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded border border-white/20 text-neutral-300">
                          You
                        </span>
                      )}
                      {!isCurrentUser && isVol && circle.status !== "FINALIZED" && (
                        <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded border border-white/20 text-neutral-300">
                          Volunteer
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] font-mono text-neutral-400">
                      {inv.inviteeWallet.slice(0, 6)}...{inv.inviteeWallet.slice(-4)} • Verified:{" "}
                      {fromBaseUnits(inv.balanceAtCheck)} USDC
                    </p>
                  </div>

                  <div>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider border ${
                        inv.status === "ACCEPTED"
                          ? "border-emerald-500/40 text-emerald-400 bg-emerald-950/20"
                          : inv.status === "PENDING"
                          ? "border-amber-500/40 text-amber-400 bg-amber-950/20"
                          : "border-red-500/40 text-red-400 bg-red-950/20"
                      }`}
                    >
                      {inv.status === "ACCEPTED" && <CheckCircle2 className="h-3 w-3" />}
                      {inv.status === "PENDING" && <Clock className="h-3 w-3" />}
                      {inv.status === "REJECTED" && <XCircle className="h-3 w-3" />}
                      {inv.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Add Members */}
        <div className="rounded-2xl border border-white/10 bg-transparent p-4 flex flex-col min-h-[300px] max-h-[380px] shadow-xl space-y-3">
          <div className="border-b border-white/10 pb-2.5 shrink-0">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-neutral-300" />
              <span>Add Members</span>
            </h3>
            <p className="text-[11px] text-neutral-400 mt-0.5">Search by username or wallet address</p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!isVolunteer) return;
              if (filteredUsers.length > 0) {
                handleInviteUser(filteredUsers[0].username);
              } else if (cleanQuery) {
                setInviteError(`Account @${cleanQuery} not found.`);
              }
            }}
            className="shrink-0"
          >
            <div className="relative flex items-center">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (inviteError) setInviteError(null);
                }}
                placeholder="Type member username..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-white/10 bg-white/[0.03] text-white focus:outline-none focus:border-white/30 font-mono transition-colors"
              />
            </div>
          </form>

          {inviteError && (
            <div className="p-2 rounded-xl border border-red-900/60 bg-red-950/40 text-red-300 text-xs flex items-center gap-2 shrink-0">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-400" />
              <span>{inviteError}</span>
            </div>
          )}

          {inviteSuccess && (
            <div className="p-2 rounded-xl border border-emerald-900/60 bg-emerald-950/40 text-emerald-300 text-xs flex items-center gap-2 shrink-0">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
              <span>{inviteSuccess}</span>
            </div>
          )}

          <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-2 pr-1">
            {filteredUsers.map((u) => {
              const alreadyInvited = circle.invites.some(
                (i) => i.inviteeUsername?.toLowerCase() === u.username?.toLowerCase() && i.status !== "REJECTED"
              );
              const isInvitingThis = invitingUsername === u.username;

              return (
                <div
                  key={u.username}
                  className="p-2.5 rounded-xl border border-white/10 bg-white/[0.02] flex items-center justify-between text-xs hover:border-white/20 transition-colors"
                >
                  <div>
                    <p className="font-semibold text-white text-xs">{u.displayName}</p>
                    <p className="text-neutral-400 font-mono text-[10px]">@{u.username}</p>
                  </div>
                  <button
                    type="button"
                    disabled={alreadyInvited || isInvitingThis || !isVolunteer}
                    onClick={() => handleInviteUser(u.username)}
                    className={`px-3 py-1 rounded-lg font-semibold text-xs transition-colors cursor-pointer ${
                      alreadyInvited
                        ? "border border-white/10 bg-white/[0.03] text-neutral-400 cursor-not-allowed"
                        : !isVolunteer
                        ? "border border-white/10 bg-white/[0.03] text-neutral-400 cursor-not-allowed"
                        : "bg-white text-black hover:bg-neutral-200 shadow-sm"
                    }`}
                  >
                    {isInvitingThis ? "Verifying..." : alreadyInvited ? "Added" : "Add"}
                  </button>
                </div>
              );
            })}

            {cleanQuery && filteredUsers.length === 0 && (
              <div className="p-4 rounded-xl border border-white/10 bg-transparent text-center text-xs space-y-0.5">
                <p className="text-neutral-300 font-medium">No registered member found</p>
                <p className="text-[10px] text-neutral-500">@{cleanQuery} does not exist.</p>
              </div>
            )}

            {!cleanQuery && filteredUsers.length === 0 && (
              <p className="text-neutral-500 text-xs text-center py-3 font-mono">
                No other members found.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Web3 Auto-Pay Engine Accordion Section */}
      <div className="pt-2 border-t border-white/10">
        <div className="flex items-center justify-between bg-white/[0.02] border border-white/10 rounded-2xl p-4 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Decentralized Web3 Auto-Pay Engine
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  ERC-7579 + Chainlink
                </span>
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Rhinestone SmartSessions mandate & automated keeper trigger
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/circles/${circleId}/autopay`}
              className="px-3 py-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-semibold transition-colors hidden sm:inline-flex items-center gap-1.5"
            >
              <span>Full Screen View</span>
            </Link>
            <button
              onClick={() => setIsAutoPayExpanded(!isAutoPayExpanded)}
              className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/[0.05] hover:bg-white/[0.1] text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              {isAutoPayExpanded ? "Hide Controls" : "Show Controls"}
            </button>
          </div>
        </div>

        {isAutoPayExpanded && (
          <div className="animate-in fade-in duration-200">
            <AutoPayAuthorization
              circleId={circleId}
              circleName={circle.name}
              monthlyAmountUSDC={Number(fromBaseUnits(circle.monthlyAmount)) || 1000}
              durationMonths={circle.durationMonths}
              vaultAddress={circle.vaultAddress || undefined}
              members={[
                {
                  walletAddress: circle.volunteerWallet,
                  username: circle.volunteerUsername || "volunteer",
                  displayName: circle.volunteerUsername ? `@${circle.volunteerUsername}` : "Volunteer Leader",
                  isVolunteer: true,
                },
                ...circle.invites.map((inv) => ({
                  walletAddress: inv.inviteeWallet,
                  username: inv.inviteeUsername,
                  displayName: `@${inv.inviteeUsername}`,
                  isVolunteer: false,
                })),
              ]}
            />
          </div>
        )}
      </div>
    </div>
  );
}
