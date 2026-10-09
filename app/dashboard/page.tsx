"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDevUser } from "@/components/providers";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { fetchLiveBalanceUSDC } from "@/lib/client-balance";
import { fromBaseUnits, toBaseUnits, validateCircleParams, getAllowedDurations } from "@/lib/validation";
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
    const val = await fetchLiveBalanceUSDC(activeWalletAddress, dynamicUsername);
    setUserBalance(val);
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
      const allowed = getAllowedDurations(n);
      setDurationMonths(String(allowed[0] || n - 1));
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
    const allowedDurations = getAllowedDurations(parsedNumPeople);
    if (!allowedDurations.includes(parsedDuration)) {
      setCreateError(`Duration must be one of ${allowedDurations.join(", ")} months for ${parsedNumPeople} members.`);
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

  const allowedDurations = !isNaN(parsedNumPeople) && parsedNumPeople >= 2 ? getAllowedDurations(parsedNumPeople) : [];

  const isFormFilled =
    name.trim().length > 0 &&
    !isNaN(parsedNumPeople) &&
    parsedNumPeople >= 2 &&
    !isNaN(parsedDuration) &&
    allowedDurations.includes(parsedDuration) &&
    monthlyNumeric > 0;

  const hasSufficientBalance =
    userBalance === null || collateralRequired <= userBalance;

  const isCreateDisabled = !isFormFilled || !hasSufficientBalance || isSubmitting;

  if (!mounted) {
    return (
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 space-y-6 text-neutral-100 flex flex-col justify-between min-h-[calc(100vh-6rem)]">
        <div className="flex-1 flex flex-col justify-center">
          <div className="w-full max-w-xl mx-auto bg-transparent p-12 text-center text-xs text-neutral-500 animate-pulse">
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
          <div className="max-w-3xl w-full mx-auto p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white">Create a Circle</h2>
            </div>

            {createError && (
              <div className="p-3 rounded-xl text-red-300 text-xs flex items-center gap-2.5">
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
                <span>{createError}</span>
              </div>
            )}

            {createSuccess && (
              <div className="p-3 rounded-xl text-emerald-300 text-xs flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>{createSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-6">
              {/* Field 1: Circle Name */}
              <div className="relative h-14 border-b border-white/20 focus-within:border-white transition-colors">
                <input
                  type="text"
                  id="circle-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder=" "
                  required
                  className="peer w-full h-full bg-transparent border-none outline-none pt-4 pb-1 text-sm text-white font-mono placeholder-transparent"
                />
                <label
                  htmlFor="circle-name"
                  className="absolute left-0 top-4 text-sm text-neutral-400 pointer-events-none transition-all duration-200 origin-[0] peer-focus:top-0 peer-focus:text-xs peer-focus:text-white peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-neutral-400"
                >
                  Circle Name
                </label>
              </div>

              {/* Row 2: Capacity & Duration */}
              <div className="grid sm:grid-cols-2 gap-6 items-start">
                <div className="relative h-14 border-b border-white/20 focus-within:border-white transition-colors">
                  <input
                    type="text"
                    id="circle-capacity"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={numPeople}
                    onChange={(e) => handleNumPeopleChange(e.target.value)}
                    placeholder=" "
                    required
                    className="peer w-full h-full bg-transparent border-none outline-none pt-4 pb-1 text-sm text-white font-mono placeholder-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <label
                    htmlFor="circle-capacity"
                    className="absolute left-0 top-4 text-sm text-neutral-400 pointer-events-none transition-all duration-200 origin-[0] peer-focus:top-0 peer-focus:text-xs peer-focus:text-white peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-neutral-400"
                  >
                    Capacity (Members)
                  </label>
                </div>

                <div className="relative h-14 border-b border-white/20 flex flex-col justify-end">
                  <span className="absolute left-0 top-0 text-xs text-neutral-400 font-semibold">
                    Duration (Months)
                  </span>
                  {parseInt(numPeople, 10) >= 2 ? (
                    <div className="flex items-center gap-4 pb-1 overflow-x-auto no-scrollbar">
                      {allowedDurations.map((d) => {
                        const isSelected = durationMonths === String(d);
                        return (
                          <button
                            key={d}
                            type="button"
                            onClick={() => setDurationMonths(String(d))}
                            className={`text-sm font-mono transition-colors cursor-pointer ${
                              isSelected
                                ? "text-white font-bold underline underline-offset-8 decoration-2"
                                : "text-neutral-500 hover:text-neutral-300"
                            }`}
                          >
                            {d} {d === 1 ? "Month" : "Months"}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="pb-1 text-xs text-neutral-500 font-mono">
                      Enter capacity (N ≥ 2)
                    </div>
                  )}
                </div>
              </div>

              {/* Field 3: Monthly Amount & 3x Required */}
              <div className="grid sm:grid-cols-2 gap-6 items-start">
                <div className="relative h-14 border-b border-white/20 focus-within:border-white transition-colors">
                  <input
                    type="text"
                    id="circle-monthly"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={monthlyAmount}
                    onChange={(e) => setMonthlyAmount(e.target.value.replace(/\D/g, ""))}
                    placeholder=" "
                    required
                    className="peer w-full h-full bg-transparent border-none outline-none pt-4 pb-1 text-sm text-white font-mono placeholder-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <label
                    htmlFor="circle-monthly"
                    className="absolute left-0 top-4 text-sm text-neutral-400 pointer-events-none transition-all duration-200 origin-[0] peer-focus:top-0 peer-focus:text-xs peer-focus:text-white peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-neutral-400"
                  >
                    Monthly Contribution (USDC)
                  </label>
                </div>

                <div className="relative h-14 border-b border-white/20 flex flex-col justify-end">
                  <span className="absolute left-0 top-0 text-xs text-neutral-400 font-semibold">
                    Required 3x Balance Verification
                  </span>
                  <div className="flex items-center justify-between pb-1 font-mono text-sm">
                    <span className="font-semibold text-white">
                      {collateralRequired > 0 ? collateralRequired.toLocaleString() : "0"}
                    </span>
                    <span className="text-neutral-500 text-xs">USDC</span>
                  </div>
                  {!hasSufficientBalance && monthlyNumeric > 0 && (
                    <span className="text-[11px] text-red-400 font-mono absolute -bottom-5 left-0">
                      Account holds {userBalance} USDC; needs {collateralRequired} USDC.
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab("view")}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreateDisabled}
                  className="px-6 py-2.5 rounded-xl bg-white text-black font-semibold text-xs hover:bg-neutral-200 transition-colors disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
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
              <div className="p-12 text-center text-sm text-neutral-500 w-full max-w-xl mx-auto">
                Loading circles...
              </div>
            ) : circles.length === 0 ? (
              <div className="p-12 text-center space-y-3 w-full max-w-xl mx-auto">
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
              <div className={`w-full ${circles.length === 1 ? "max-w-xl mx-auto" : "grid grid-cols-1 md:grid-cols-2 gap-5 max-w-4xl mx-auto"}`}>
                {circles.map((circle) => {
                  const isVolunteer =
                    circle.volunteerUsername?.toLowerCase() === dynamicUsername.toLowerCase() ||
                    (activeWalletAddress && circle.volunteerWallet?.toLowerCase() === activeWalletAddress);

                  return (
                    <div
                      key={circle.id}
                      className="p-6 rounded-2xl border border-white/20 flex flex-col justify-between space-y-4 transition-colors bg-transparent"
                    >
                      <div className="space-y-4">
                        {/* Top Row: Name & Status with divider */}
                        <div className="flex items-start justify-between gap-3 pb-4 border-b border-white/15">
                          <div className="space-y-0.5">
                            <h3 className="text-xl font-bold text-white tracking-tight">{circle.name}</h3>
                          </div>

                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono uppercase tracking-wider text-neutral-300">
                            {circle.status === "FINALIZED" && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
                            {circle.status === "ISSUE_STAGE" && <AlertCircle className="h-3.5 w-3.5 text-amber-400" />}
                            {circle.status === "INVITING" && <Clock className="h-3.5 w-3.5 text-neutral-400" />}
                            {circle.status}
                          </span>
                        </div>

                        {/* Symmetrical Parameters Grid with internal vertical divider lines */}
                        <div className="grid grid-cols-3 divide-x divide-white/15 py-2 text-center">
                          <div className="space-y-1 px-2">
                            <span className="text-xs uppercase tracking-wider text-neutral-500 block font-semibold">Capacity</span>
                            <span className="text-lg font-bold text-white block font-mono">{circle.numPeople}</span>
                          </div>
                          <div className="space-y-1 px-2">
                            <span className="text-xs uppercase tracking-wider text-neutral-500 block font-semibold">Monthly</span>
                            <span className="text-lg font-bold text-white block font-mono">
                              {fromBaseUnits(circle.monthlyAmount)}
                            </span>
                          </div>
                          <div className="space-y-1 px-2">
                            <span className="text-xs uppercase tracking-wider text-neutral-500 block font-semibold">Duration</span>
                            <span className="text-lg font-bold text-white block font-mono">
                              {circle.durationMonths}mo
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Symmetrical Bottom Actions with top divider line */}
                      <div className="flex items-center justify-between pt-4 border-t border-white/15 text-xs">
                        {/* Left: Volunteer Edit / Delete */}
                        <div className="flex items-center gap-2">
                          {isVolunteer && circle.status !== "FINALIZED" ? (
                            <>
                              <button
                                type="button"
                                onClick={() => setEditModalCircle(circle)}
                                className="p-2 rounded-xl text-neutral-400 hover:text-white transition-colors cursor-pointer"
                                title="Edit Circle"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteModalCircle({ id: circle.id, name: circle.name })}
                                className="p-2 rounded-xl text-neutral-400 hover:text-red-400 transition-colors cursor-pointer"
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
                          className="px-5 py-2 rounded-xl bg-white text-black hover:bg-neutral-200 font-semibold text-xs flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          <span>Open Details</span>
                          <ArrowRight className="h-4 w-4" />
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
