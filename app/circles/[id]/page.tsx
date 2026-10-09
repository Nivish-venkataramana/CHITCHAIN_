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
  MessageSquare,
  Search,
  AlertCircle,
  ShieldCheck,
  Layers,
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

      setInviteSuccess(`Invite sent to @${cleanTarget}`);
      fetchCircle();
      setSearchQuery("");
    } catch (err: any) {
      setInviteError(err.message || "Failed to send invite");
    } finally {
      setInvitingUsername(null);
    }
  };

  const [removingInviteId, setRemovingInviteId] = useState<string | null>(null);

  const handleRemoveMember = async (inviteId: string, username: string) => {
    if (!confirm(`Are you sure you want to remove @${username} from this circle?`)) {
      return;
    }
    setRemovingInviteId(inviteId);
    setInviteError(null);
    setInviteSuccess(null);

    try {
      const res = await fetch(`/api/circles/${circleId}/invites?inviteId=${encodeURIComponent(inviteId)}`, {
        method: "DELETE",
        headers: {
          "x-dev-user": dynamicUsername,
          "x-dev-wallet": activeWalletAddress,
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to remove member");
      }

      setInviteSuccess(`Removed @${username} from circle`);
      fetchCircle();
    } catch (err: any) {
      setInviteError(err.message || "Failed to remove member");
    } finally {
      setRemovingInviteId(null);
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
        <div className="p-8 text-center text-xs font-mono text-neutral-400 bg-transparent animate-pulse">
          Loading circle details...
        </div>
      </div>
    );
  }

  if (!circle) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="p-8 text-center bg-transparent space-y-3">
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
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 flex flex-col text-neutral-100 gap-6 py-4 overflow-y-auto min-h-0 flex-1">
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

      {/* Main Circle Container with Curved Outer Border and Inner Divider Lines */}
      <div className="w-full rounded-2xl border border-white/20 p-6 sm:p-8 flex flex-col gap-6 bg-transparent">
        {/* Header Banner - Top Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/15 shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{circle.name}</h1>
            <span className="px-3 py-1 rounded-full text-xs font-mono uppercase tracking-wider text-neutral-300">
              {circle.status}
            </span>
          </div>

          {/* Action Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {isVolunteer && circle.status !== "FINALIZED" && (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditOpen(true)}
                  className="px-4 py-2 rounded-xl hover:text-white text-neutral-300 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                  title="Edit Circle"
                >
                  <Edit3 className="h-4 w-4 text-neutral-300" />
                  <span>Edit</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsDeleteOpen(true)}
                  className="px-4 py-2 rounded-xl hover:text-red-400 text-neutral-300 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                  title="Delete Circle"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Delete</span>
                </button>
              </>
            )}

            {(circle.status === "ISSUE_STAGE" || circle.status === "FINALIZED" || acceptedInvites.length >= circle.numPeople) ? (
              <Link
                href={`/circles/${circle.id}/issues`}
                className="px-4 py-2 rounded-xl bg-white text-black hover:bg-neutral-200 text-xs font-semibold flex items-center gap-2 transition-colors shadow-md"
              >
                {isVolunteer ? (
                  <>
                    <MessageSquare className="h-4 w-4 text-black" />
                    <span>Review Issues</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <span>Raise Issues</span>
                  </>
                )}
              </Link>
            ) : (
              <div className="px-4 py-2 rounded-xl text-neutral-400 text-xs font-mono flex items-center gap-2 cursor-not-allowed">
                <Clock className="h-4 w-4 text-neutral-500" />
                <span>Waiting for Members ({acceptedInvites.length}/{circle.numPeople})</span>
              </div>
            )}

            {circle.status === "FINALIZED" && (
              <>
                <Link
                  href={`/circles/${circle.id}/autopay`}
                  className="px-4 py-2 rounded-xl hover:text-white text-neutral-300 text-xs font-semibold flex items-center gap-2 transition-colors"
                >
                  <ShieldCheck className="h-4 w-4 text-neutral-300" />
                  <span>Autopay</span>
                </Link>

                <Link
                  href={`/circles/${circle.id}/pool`}
                  className="px-4 py-2 rounded-xl hover:text-white text-neutral-300 text-xs font-semibold flex items-center gap-2 transition-colors"
                >
                  <Layers className="h-4 w-4 text-neutral-300" />
                  <span>Pool Vault</span>
                </Link>

                <Link
                  href={`/circles/${circle.id}/bidding`}
                  className="px-4 py-2 rounded-xl hover:text-white text-neutral-300 text-xs font-semibold flex items-center gap-2 transition-colors"
                >
                  <Coins className="h-4 w-4 text-neutral-300" />
                  <span>Secret Auction</span>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Symmetrical 4-Column Stats Row with vertical divider lines */}
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-white/15 py-2 border-b border-white/15 shrink-0">
          <div className="p-3 text-center space-y-1">
            <span className="text-xs uppercase tracking-wider text-neutral-400 block font-semibold">Capacity</span>
            <p className="text-lg sm:text-xl font-bold text-white font-mono">{circle.numPeople} Members</p>
          </div>
          <div className="p-3 text-center space-y-1">
            <span className="text-xs uppercase tracking-wider text-neutral-400 block font-semibold">Monthly Amount</span>
            <p className="text-lg sm:text-xl font-bold text-white font-mono">{monthlyUSDC} <span className="text-xs font-normal text-neutral-400">USDC</span></p>
          </div>
          <div className="p-3 text-center space-y-1">
            <span className="text-xs uppercase tracking-wider text-neutral-400 block font-semibold">Tenure</span>
            <p className="text-lg sm:text-xl font-bold text-white font-mono">{circle.durationMonths} Months</p>
          </div>
          <div className="p-3 text-center space-y-1">
            <span className="text-xs uppercase tracking-wider text-neutral-400 block font-semibold">3x Verification</span>
            <p className="text-lg sm:text-xl font-bold text-white font-mono">
              {(Number(monthlyUSDC) * 3).toLocaleString()} <span className="text-xs font-normal text-neutral-400">USDC</span>
            </p>
          </div>
        </div>

        {/* Symmetrical 2-Column Section: Participant Board & Add Members with vertical divider */}
        <div className="grid md:grid-cols-2 md:divide-x divide-white/15 gap-8 flex-1 min-h-0 pt-2">
          {/* Left Column: Participant Board */}
          <div className="flex flex-col h-full min-h-[22rem] space-y-4 md:pr-4">
            <div className="flex items-center justify-between shrink-0 pb-1">
              <h2 className="text-base font-bold text-white flex items-center gap-2.5">
                <Users className="h-5 w-5 text-neutral-300" />
                <span>Participant Board ({acceptedInvites.length} of {circle.numPeople})</span>
              </h2>
              <span className="text-xs font-mono text-neutral-400">
                {Math.max(0, circle.numPeople - acceptedInvites.length)} seats remaining
              </span>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-3 pr-1">
              {circle.invites.map((inv) => {
                const u = users.find((usr) => usr.username === inv.inviteeUsername);
                const isVol =
                  (circle.volunteerWallet && inv.inviteeWallet.toLowerCase() === circle.volunteerWallet.toLowerCase()) ||
                  (circle.volunteerUsername && inv.inviteeUsername.toLowerCase() === circle.volunteerUsername.toLowerCase());
                const isCurrentUser =
                  inv.inviteeUsername.toLowerCase() === dynamicUsername.toLowerCase() ||
                  (user?.username && inv.inviteeUsername.toLowerCase() === user.username.toLowerCase()) ||
                  (activeWalletAddress && inv.inviteeWallet.toLowerCase() === activeWalletAddress) ||
                  (user?.walletAddress && inv.inviteeWallet.toLowerCase() === user.walletAddress.toLowerCase());

                return (
                  <div
                    key={inv.id}
                    className="py-2.5 flex items-center justify-between transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-white">
                          {isCurrentUser ? (u?.displayName ? `${u.displayName} (You)` : "You") : u?.displayName || inv.inviteeUsername}
                        </span>
                        <span className="text-xs text-neutral-400 font-mono">@{inv.inviteeUsername}</span>
                        {isCurrentUser && (
                          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded text-neutral-300">
                            You
                          </span>
                        )}
                        {!isCurrentUser && isVol && circle.status !== "FINALIZED" && (
                          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded text-neutral-300">
                            Volunteer
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-mono text-neutral-400">
                        {inv.inviteeWallet.slice(0, 6)}...{inv.inviteeWallet.slice(-4)} • Verified:{" "}
                        {fromBaseUnits(inv.balanceAtCheck)} USDC
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono uppercase tracking-wider ${
                          inv.status === "ACCEPTED"
                            ? "text-emerald-400"
                            : inv.status === "PENDING"
                            ? "text-amber-400"
                            : "text-red-400"
                        }`}
                      >
                        {inv.status === "ACCEPTED" && <CheckCircle2 className="h-3.5 w-3.5" />}
                        {inv.status === "PENDING" && <Clock className="h-3.5 w-3.5" />}
                        {inv.status === "REJECTED" && <XCircle className="h-3.5 w-3.5" />}
                        {inv.status}
                      </span>

                      {/* Volunteer option to remove other added individuals until activation */}
                      {isVolunteer && !isCurrentUser && !isVol && circle.status !== "FINALIZED" && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(inv.id, inv.inviteeUsername)}
                          disabled={removingInviteId === inv.id}
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-red-400 transition-colors cursor-pointer"
                          title={`Remove @${inv.inviteeUsername}`}
                        >
                          {removingInviteId === inv.id ? (
                            <span className="text-[10px] font-mono text-neutral-400">...</span>
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Add Members */}
          <div className="flex flex-col h-full min-h-[22rem] space-y-4 md:pl-8">
            <div className="shrink-0 pb-1">
              <h3 className="text-base font-bold text-white flex items-center gap-2.5">
                <UserPlus className="h-5 w-5 text-neutral-300" />
                <span>Add Members</span>
              </h3>
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
              <div className="relative h-14 border-b border-white/20 focus-within:border-white transition-colors flex items-center">
                <Search className="absolute left-0 top-5 h-4 w-4 text-neutral-400 pointer-events-none" />
                <input
                  type="text"
                  id="search-member"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (inviteError) setInviteError(null);
                  }}
                  placeholder=" "
                  className="peer w-full h-full bg-transparent border-none outline-none pt-4 pb-1 pl-6 text-sm text-white font-mono placeholder-transparent"
                />
                <label
                  htmlFor="search-member"
                  className="absolute left-6 top-4 text-sm text-neutral-400 pointer-events-none transition-all duration-200 origin-[0] peer-focus:top-0 peer-focus:text-xs peer-focus:text-white peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-neutral-400"
                >
                  Type member username...
                </label>
              </div>
            </form>

            {inviteError && (
              <div className="p-3 rounded-xl text-red-300 text-xs flex items-center gap-2.5 shrink-0">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                <span>{inviteError}</span>
              </div>
            )}

            {inviteSuccess && (
              <div className="p-3 rounded-xl text-emerald-300 text-xs flex items-center gap-2.5 shrink-0">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>{inviteSuccess}</span>
              </div>
            )}

            <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-3 pr-1">
              {filteredUsers.map((u) => {
                const alreadyInvited = circle.invites.some(
                  (i) => i.inviteeUsername?.toLowerCase() === u.username?.toLowerCase() && i.status !== "REJECTED"
                );
                const isInvitingThis = invitingUsername === u.username;

                return (
                  <div
                    key={u.username}
                    className="py-2.5 flex items-center justify-between text-sm transition-colors"
                  >
                    <div className="space-y-0.5">
                      <p className="font-semibold text-white text-sm">{u.displayName}</p>
                      <p className="text-neutral-400 font-mono text-xs">@{u.username}</p>
                    </div>
                    <button
                      type="button"
                      disabled={alreadyInvited || isInvitingThis || !isVolunteer}
                      onClick={() => handleInviteUser(u.username)}
                      className={`px-4 py-1.5 rounded-xl font-semibold text-xs transition-colors cursor-pointer ${
                        alreadyInvited
                          ? "text-neutral-500 cursor-not-allowed"
                          : !isVolunteer
                          ? "text-neutral-500 cursor-not-allowed"
                          : "bg-white text-black hover:bg-neutral-200 shadow-sm"
                      }`}
                    >
                      {isInvitingThis ? "Verifying..." : alreadyInvited ? "Added" : "Add"}
                    </button>
                  </div>
                );
              })}

              {cleanQuery && filteredUsers.length === 0 && (
                <div className="p-6 text-center text-sm space-y-1">
                  <p className="text-neutral-300 font-medium">No registered member found</p>
                  <p className="text-xs text-neutral-500">@{cleanQuery} does not exist.</p>
                </div>
              )}

              {!cleanQuery && filteredUsers.length === 0 && (
                <p className="text-neutral-500 text-sm text-center py-6 font-mono">
                  No other members found.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
