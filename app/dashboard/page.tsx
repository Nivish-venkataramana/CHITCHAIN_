"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDevUser } from "@/components/providers";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { fromBaseUnits, toBaseUnits, validateCircleParams, calculateTieredDuration } from "@/lib/validation";
import {
  Plus,
  Layers,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { EditCircleModal, DeleteCircleModal, CircleActionData } from "@/components/circle-action-modals";

interface CircleItem {
  id: string;
  name: string;
  volunteerWallet: string;
  volunteerUsername?: string;
  numPeople: number;
  monthlyAmount: string;
  durationMonths: number;
  status: "INVITING" | "ISSUE_STAGE" | "FINALIZED";
}

import { createPublicClient, http, formatUnits, erc20Abi } from "viem";
import { baseSepolia } from "viem/chains";

const BASE_SEPOLIA_USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org", {
    timeout: 3500,
    retryCount: 1,
  }),
});

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useDevUser();
  const { user: privyUser, authenticated } = usePrivy();
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

  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"view" | "create">("view");

  useEffect(() => {
    setMounted(true);
  }, []);

  // User Live Balance state
  const [userBalance, setUserBalance] = useState<number | null>(null);

  // View Circles state
  const [circles, setCircles] = useState<CircleItem[]>([]);
  const [loadingCircles, setLoadingCircles] = useState(true);

  // Edit / Delete modal state
  const [editModalCircle, setEditModalCircle] = useState<CircleActionData | null>(null);
  const [deleteModalCircle, setDeleteModalCircle] = useState<{ id: string; name: string } | null>(null);

  // Create Circle Form state (No default values, no placeholder examples)
  const [name, setName] = useState("");
  const [numPeople, setNumPeople] = useState("");
  const [durationMonths, setDurationMonths] = useState("");
  const [monthlyAmount, setMonthlyAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  const fetchUserBalance = useCallback(async () => {
    if (!activeWalletAddress || !/^0x[a-f0-9]{40}$/i.test(activeWalletAddress)) {
      setUserBalance(0);
      return;
    }
    try {
      const raw = await publicClient.readContract({
        address: BASE_SEPOLIA_USDC,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [activeWalletAddress as `0x${string}`],
      });
      setUserBalance(Number(formatUnits(raw, 6)));
    } catch {
      if (dynamicUsername) {
        fetch("/api/account/faucet", { headers: { "x-dev-user": dynamicUsername } })
          .then((r) => r.json())
          .then((data) => {
            if (data?.balanceUSDC) {
              setUserBalance(Number(data.balanceUSDC));
            } else {
              setUserBalance(0);
            }
          })
          .catch(() => setUserBalance(0));
      } else {
        setUserBalance(0);
      }
    }
  }, [activeWalletAddress, dynamicUsername]);

  useEffect(() => {
    fetchUserBalance();
  }, [fetchUserBalance]);

  const fetchCircles = useCallback(() => {
    if (!dynamicUsername) return;
    setLoadingCircles(true);
    fetch("/api/circles/mine", {
      headers: {
        "x-dev-user": dynamicUsername,
        "x-dev-wallet": activeWalletAddress,
      },
    })
      .then((res) => res.json())
      .then((data: CircleItem[]) => {
        if (Array.isArray(data)) {
          setCircles(data);
        }
      })
      .catch((err) => console.error("Error loading circles:", err))
      .finally(() => setLoadingCircles(false));
  }, [dynamicUsername, activeWalletAddress]);

  useEffect(() => {
    fetchCircles();
  }, [fetchCircles]);

  const handleNumPeopleChange = (val: string) => {
    const clean = val.replace(/\D/g, "");
    setNumPeople(clean);
    const n = parseInt(clean, 10);
    if (!isNaN(n) && n >= 2) {
      setDurationMonths(String(calculateTieredDuration(n)));
    } else {
      setDurationMonths("");
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreateSuccess(null);

    if (!name.trim()) {
      setCreateError("Circle name is required.");
      return;
    }
    const parsedNumPeople = parseInt(numPeople, 10);
    if (!parsedNumPeople || isNaN(parsedNumPeople) || parsedNumPeople < 2) {
      setCreateError("Capacity must be at least 2 members.");
      return;
    }
    const parsedDuration = parseInt(durationMonths, 10);
    if (!parsedDuration || isNaN(parsedDuration) || parsedDuration < 1) {
      setCreateError("Duration must be at least 1 month.");
      return;
    }
    const tiered = calculateTieredDuration(parsedNumPeople);
    const allowedDurations = Array.from(new Set([tiered, parsedNumPeople - 1, parsedNumPeople - 2])).filter((d) => d >= 1);
    if (!allowedDurations.includes(parsedDuration)) {
      setCreateError(`Duration must be valid for this circle size (${tiered} months).`);
      return;
    }
    if (!monthlyAmount.trim() || isNaN(Number(monthlyAmount)) || Number(monthlyAmount) <= 0) {
      setCreateError("Enter a valid monthly contribution.");
      return;
    }

    const validation = validateCircleParams({
      name: name.trim(),
      numPeople: parsedNumPeople,
      monthlyAmount: monthlyAmount.trim(),
      durationMonths: parsedDuration,
    });

    if (!validation.valid) {
      setCreateError(validation.error || "Invalid circle parameters.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/circles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-dev-user": dynamicUsername,
          "x-dev-wallet": activeWalletAddress,
        },
        body: JSON.stringify({
          name: name.trim(),
          numPeople: parsedNumPeople,
          monthlyAmount: monthlyAmount.trim(),
          durationMonths: parsedDuration,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create circle.");
      }

      // Reset form
      setName("");
      setNumPeople("");
      setDurationMonths("");
      setMonthlyAmount("");
      setCreateSuccess("Circle created successfully.");
      fetchCircles();
      setTimeout(() => {
        setActiveTab("view");
        setCreateSuccess(null);
      }, 800);
    } catch (err: any) {
      setCreateError(err.message || "Failed to create circle.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const monthlyNumeric = parseFloat(monthlyAmount) || 0;
  const collateralRequired = monthlyNumeric * 3;
  const parsedNumPeople = parseInt(numPeople, 10);
  const parsedDuration = parseInt(durationMonths, 10);

  const isFormFilled =
    name.trim().length > 0 &&
    !isNaN(parsedNumPeople) &&
    parsedNumPeople >= 2 &&
    !isNaN(parsedDuration) &&
    [parsedNumPeople - 1, parsedNumPeople - 2].includes(parsedDuration) &&
    monthlyNumeric > 0;

  const hasSufficientBalance =
    userBalance === null || collateralRequired <= userBalance;

  const isCreateDisabled = !isFormFilled || !hasSufficientBalance || isSubmitting;

  if (!mounted) {
    return (
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 space-y-6 text-neutral-100 flex flex-col justify-between min-h-[calc(100vh-6rem)]">
        <div className="flex-1 flex flex-col justify-center">
          <div className="w-full max-w-xl mx-auto rounded-3xl border border-white/10 bg-transparent p-12 text-center text-xs text-neutral-500 animate-pulse">
            Loading dashboard...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 space-y-6 text-neutral-100 flex flex-col justify-between min-h-[calc(100vh-6rem)]">
      {/* Action Modals */}
      <EditCircleModal
        isOpen={Boolean(editModalCircle)}
        circle={editModalCircle}
        onClose={() => setEditModalCircle(null)}
        onSuccess={fetchCircles}
      />

      <DeleteCircleModal
        isOpen={Boolean(deleteModalCircle)}
        circle={deleteModalCircle}
        onClose={() => setDeleteModalCircle(null)}
        onSuccess={fetchCircles}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col justify-center">
        {/* OPTION 1: CREATE A CIRCLE */}
        {activeTab === "create" && (
          <div className="max-w-3xl w-full mx-auto rounded-3xl border border-white/10 bg-transparent p-6 sm:p-7 shadow-2xl space-y-4">
            <div className="border-b border-white/10 pb-3">
              <h2 className="text-xl font-bold text-white">Create a Circle</h2>
              <p className="text-xs text-neutral-400">Configure circle parameters</p>
            </div>

            {createError && (
              <div className="p-3 rounded-xl border border-red-900/60 bg-red-950/40 text-red-300 text-xs flex items-center gap-2.5">
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
                <span>{createError}</span>
              </div>
            )}

            {createSuccess && (
              <div className="p-3 rounded-xl border border-emerald-900/60 bg-emerald-950/40 text-emerald-300 text-xs flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>{createSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              {/* Field 1: Circle Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-neutral-300">
                  Circle Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-white/10 bg-white/[0.03] text-white focus:outline-none focus:border-white/30 font-mono transition-colors"
                />
              </div>

              {/* Row 2: Capacity & Duration */}
              <div className="grid sm:grid-cols-2 gap-4 items-start">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-neutral-300">
                    Capacity (Members)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={numPeople}
                    onChange={(e) => handleNumPeopleChange(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-white/10 bg-white/[0.03] text-white focus:outline-none focus:border-white/30 font-mono transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-neutral-300">
                    Duration Tenure (Months)
                  </label>
                  {parseInt(numPeople, 10) >= 2 && durationMonths ? (
                    <div className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-white/20 bg-white/[0.06] text-white font-mono flex items-center justify-between">
                      <span className="font-bold">{durationMonths} Months</span>
                      <span className="text-[11px] text-neutral-400 font-normal">
                        {durationMonths} monthly cycles
                      </span>
                    </div>
                  ) : (
                    <div className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-white/10 bg-white/[0.02] text-neutral-500 font-mono flex items-center">
                      <span>Enter capacity (min 2) to calculate</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Field 3: Monthly Amount & 3x Required */}
              <div className="grid sm:grid-cols-2 gap-4 items-start">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-neutral-300">
                    Monthly Contribution (USDC)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={monthlyAmount}
                    onChange={(e) => setMonthlyAmount(e.target.value.replace(/\D/g, ""))}
                    required
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-white/10 bg-white/[0.03] text-white focus:outline-none focus:border-white/30 font-mono transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-neutral-400">
                    Required 3x Balance Verification
                  </label>
                  <div className={`w-full px-3.5 py-2.5 text-sm rounded-xl border ${!hasSufficientBalance && monthlyNumeric > 0 ? "border-red-900/60 bg-red-950/20 text-red-300" : "border-white/10 bg-white/[0.02] text-neutral-300"} font-mono flex items-center justify-between`}>
                    <span className="font-semibold text-white">{collateralRequired > 0 ? collateralRequired.toLocaleString() : "0"}</span>
                    <span className="text-neutral-500 text-xs">USDC</span>
                  </div>
                  {!hasSufficientBalance && monthlyNumeric > 0 && (
                    <span className="text-[11px] text-red-400 font-mono block">
                      Account holds {userBalance} USDC; needs {collateralRequired} USDC.
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setActiveTab("view")}
                  className="px-5 py-2 rounded-xl border border-white/10 text-xs font-semibold text-neutral-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreateDisabled}
                  className="px-6 py-2 rounded-xl bg-white text-black font-semibold text-xs hover:bg-neutral-200 transition-colors disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer shadow-md"
                >
                  {isSubmitting ? "Creating..." : "Create Circle"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* OPTION 2: VIEW CIRCLES */}
        {activeTab === "view" && (
          <div className="w-full flex flex-col items-center justify-center">
            {loadingCircles ? (
              <div className="p-12 text-center text-xs text-neutral-500 rounded-3xl border border-white/10 bg-transparent w-full max-w-xl mx-auto">
                Loading circles...
              </div>
            ) : circles.length === 0 ? (
              <div className="p-12 text-center rounded-3xl border border-white/10 bg-transparent space-y-3 w-full max-w-xl mx-auto">
                <p className="text-sm text-neutral-400">No circles found for your account.</p>
                <button
                  type="button"
                  onClick={() => setActiveTab("create")}
                  className="text-xs text-white font-semibold hover:underline inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Create your first circle</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className={`w-full ${circles.length === 1 ? "max-w-xl mx-auto" : "grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto"}`}>
                {circles.map((circle) => {
                  const isVolunteer =
                    circle.volunteerUsername?.toLowerCase() === dynamicUsername.toLowerCase() ||
                    (activeWalletAddress && circle.volunteerWallet?.toLowerCase() === activeWalletAddress);

                  return (
                    <div
                      key={circle.id}
                      className="rounded-3xl border border-white/10 bg-transparent p-5 sm:p-6 flex flex-col justify-between space-y-4 hover:border-white/20 transition-colors shadow-lg"
                    >
                      <div className="space-y-3.5">
                        {/* Top Row: Name & Status */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-0.5">
                            <h3 className="text-lg font-bold text-white tracking-tight">{circle.name}</h3>
                            <p className="text-xs text-neutral-400 font-mono">
                              {circle.status === "FINALIZED" ? (
                                <span className="text-emerald-400">Decentralized Protocol</span>
                              ) : isVolunteer ? (
                                <span>Initiated by You (Volunteer)</span>
                              ) : (
                                <span>Volunteer: @{circle.volunteerUsername || "volunteer"}</span>
                              )}
                            </p>
                          </div>

                          <span
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-mono uppercase tracking-wider ${
                              circle.status === "FINALIZED"
                                ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                                : circle.status === "ISSUE_STAGE"
                                ? "bg-amber-950 text-amber-400 border border-amber-800"
                                : "bg-neutral-900 text-neutral-300 border border-neutral-800"
                            }`}
                          >
                            {circle.status === "FINALIZED" && <CheckCircle2 className="h-3 w-3" />}
                            {circle.status === "ISSUE_STAGE" && <AlertCircle className="h-3 w-3" />}
                            {circle.status === "INVITING" && <Clock className="h-3 w-3" />}
                            {circle.status}
                          </span>
                        </div>

                        {/* Symmetrical Parameters Grid */}
                        <div className="grid grid-cols-3 gap-2 border border-white/10 bg-white/[0.02] rounded-2xl p-3 text-center">
                          <div className="space-y-0.5">
                            <span className="text-[10px] uppercase tracking-wider text-neutral-500 block font-semibold">Capacity</span>
                            <span className="text-base font-bold text-white block font-mono">{circle.numPeople}</span>
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-[10px] uppercase tracking-wider text-neutral-500 block font-semibold">Monthly</span>
                            <span className="text-base font-bold text-white block font-mono">
                              {fromBaseUnits(circle.monthlyAmount)}
                            </span>
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-[10px] uppercase tracking-wider text-neutral-500 block font-semibold">Duration</span>
                            <span className="text-base font-bold text-white block font-mono">
                              {circle.durationMonths}mo
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Symmetrical Bottom Actions */}
                      <div className="flex items-center justify-between pt-3 border-t border-white/10 text-xs">
                        {/* Left: Volunteer Edit / Delete */}
                        <div className="flex items-center gap-2">
                          {isVolunteer && circle.status !== "FINALIZED" ? (
                            <>
                              <button
                                type="button"
                                onClick={() => setEditModalCircle(circle)}
                                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors cursor-pointer"
                                title="Edit Circle"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteModalCircle({ id: circle.id, name: circle.name })}
                                className="p-1.5 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-neutral-900 transition-colors cursor-pointer"
                                title="Delete Circle"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            <span className="text-neutral-500 text-xs font-mono">
                              {circle.status === "FINALIZED" ? "Member" : isVolunteer ? "Volunteer" : "Member"}
                            </span>
                          )}
                        </div>

                        {/* Right: Open Circle Action */}
                        <Link
                          href={`/circles/${circle.id}`}
                          className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors border border-white/10 cursor-pointer"
                        >
                          <span>Open Details</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Center Toggle Selector without borders or background */}
      <div className="flex items-center justify-center gap-8 pt-4 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("view")}
          className={`relative pb-2 text-sm font-semibold transition-all duration-200 cursor-pointer flex items-center gap-2 ${
            activeTab === "view"
              ? "text-white scale-110 -translate-y-1"
              : "text-neutral-500 hover:text-neutral-300 scale-100 translate-y-0"
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>View Circles</span>
          {activeTab === "view" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full transition-all duration-200" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("create")}
          className={`relative pb-2 text-sm font-semibold transition-all duration-200 cursor-pointer flex items-center gap-2 ${
            activeTab === "create"
              ? "text-white scale-110 -translate-y-1"
              : "text-neutral-500 hover:text-neutral-300 scale-100 translate-y-0"
          }`}
        >
          <Plus className="h-4 w-4" />
          <span>Create a Circle</span>
          {activeTab === "create" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full transition-all duration-200" />
          )}
        </button>
      </div>
    </div>
  );
}
