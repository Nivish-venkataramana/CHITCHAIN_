"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDevUser } from "@/components/providers";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { createPublicClient, http, formatUnits, erc20Abi } from "viem";
import { baseSepolia } from "viem/chains";
import { ArrowLeft, AlertCircle, AlertTriangle, Shield, PlusCircle, ArrowRight } from "lucide-react";
import { validateCircleParams } from "@/lib/validation";

const BASE_SEPOLIA_USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org", {
    timeout: 3500,
    retryCount: 1,
  }),
});

export default function CreateCirclePage() {
  const router = useRouter();
  const { user } = useDevUser();
  const { user: privyUser } = usePrivy();
  const { wallets } = useWallets();

  // Dynamic creator wallet address
  const embeddedWallet = wallets.find((w) => w.walletClientType === "privy") || wallets[0];
  const activeWalletAddress = (
    embeddedWallet?.address ||
    privyUser?.wallet?.address ||
    user?.walletAddress ||
    ""
  ).toLowerCase();

  const [creatorBalance, setCreatorBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState<boolean>(true);

  const [name, setName] = useState("");
  const [numPeople, setNumPeople] = useState<number>(4);
  const [monthlyAmount, setMonthlyAmount] = useState<string>("1000");
  const [durationMonths, setDurationMonths] = useState<number>(3);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch creator's live balance
  useEffect(() => {
    const fetchBalance = async () => {
      setLoadingBalance(true);
      if (activeWalletAddress && /^0x[a-f0-9]{40}$/i.test(activeWalletAddress)) {
        try {
          const rawBalance = await publicClient.readContract({
            address: BASE_SEPOLIA_USDC,
            abi: erc20Abi,
            functionName: "balanceOf",
            args: [activeWalletAddress as `0x${string}`],
          });
          const parsed = Number(formatUnits(rawBalance, 6));
          setCreatorBalance(parsed);
          setLoadingBalance(false);
          return;
        } catch (err) {
          console.warn("On-chain balance read notice:", err);
        }
      }

      // Fallback check
      if (user?.username) {
        try {
          const res = await fetch("/api/account/faucet", {
            headers: { "x-dev-user": user.username },
          });
          const data = await res.json();
          if (data?.balanceUSDC !== undefined) {
            setCreatorBalance(Number(data.balanceUSDC));
          } else {
            setCreatorBalance(0);
          }
        } catch {
          setCreatorBalance(0);
        }
      } else {
        setCreatorBalance(0);
      }
      setLoadingBalance(false);
    };

    fetchBalance();
  }, [activeWalletAddress, user?.username]);

  // Live validation calculations
  const validation = validateCircleParams({
    name,
    numPeople,
    monthlyAmount,
    durationMonths,
  });

  const parsedAmount = parseFloat(monthlyAmount) || 0;
  const required3xBalance = parsedAmount * 3;
  const isBalanceInsufficient =
    loadingBalance || (creatorBalance !== null && creatorBalance < required3xBalance);

  const allowedDurations = [numPeople - 1, numPeople - 2].filter((d) => d >= 1);

  const userEmail = privyUser?.email?.address || "";
  const dynamicUsername = userEmail
    ? userEmail.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "").toLowerCase()
    : activeWalletAddress
    ? `user_${activeWalletAddress.slice(2, 6).toLowerCase()}`
    : user?.username || "member";
  const dynamicDisplayName = userEmail
    ? userEmail.split("@")[0]
    : user?.displayName || dynamicUsername;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loadingBalance) {
      setError("Verifying wallet balance on Base Sepolia. Please wait a moment...");
      return;
    }

    if (isBalanceInsufficient || (creatorBalance !== null && creatorBalance < required3xBalance)) {
      setError(
        `Insufficient balance: Your wallet holds ${creatorBalance?.toFixed(2) ?? "0.00"} USDC; needs at least ${required3xBalance.toLocaleString()} USDC (3 x monthly amount) to create a circle.`
      );
      return;
    }

    if (!validation.valid) {
      setError(validation.error || "Please check parameters.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

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
          numPeople,
          monthlyAmount,
          durationMonths,
          volunteerUsername: dynamicUsername,
          volunteerWallet: activeWalletAddress,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data?.id) {
        throw new Error(data?.error || "Failed to create circle. Please verify parameters and wallet balance.");
      }

      router.push(`/circles/${data.id}`);
    } catch (err: any) {
      setError(err.message || "Failed to create circle");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-10 px-6 space-y-8 text-neutral-100">
      <Link
        href="/circles"
        className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Return to Circles</span>
      </Link>

      <div className="rounded-3xl border border-neutral-900 bg-neutral-950 p-8 sm:p-10 shadow-2xl space-y-8 relative overflow-hidden">
        <div className="space-y-2">
          <span className="text-xs uppercase tracking-widest font-bold text-red-500">
            Circle Origination
          </span>
          <h1 className="text-3xl font-bold text-white tracking-tight">Create a Wealth Circle</h1>
          <p className="text-neutral-400 text-xs leading-relaxed">
            As circle volunteer (<span className="font-semibold text-white">@{dynamicDisplayName}</span>), specify circle pooling rules. You count as member 1 of N.
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-red-950/60 border border-red-800/50 text-red-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (!validation.valid || isBalanceInsufficient || loadingBalance || isSubmitting)) {
              e.preventDefault();
              if (isBalanceInsufficient) {
                setError(
                  `Insufficient balance: Your wallet holds ${creatorBalance?.toFixed(2) ?? "0.00"} USDC; needs at least ${required3xBalance.toLocaleString()} USDC (3 x monthly amount) to create a circle.`
                );
              }
            }
          }}
          className="space-y-6"
        >
          {/* Circle Name */}
          <div className="space-y-2">
            <label className="block text-xs uppercase tracking-wider font-bold text-neutral-300">
              Circle Identifier Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Genesis Wealth Club"
              className="w-full rounded-2xl border border-neutral-800 bg-neutral-900/90 px-4 py-3.5 text-sm text-white focus:outline-none focus:border-red-500 transition-colors placeholder:text-neutral-600 font-medium"
            />
          </div>

          {/* Number of People */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs uppercase tracking-wider font-bold text-neutral-300">
                Number of Participants (N)
              </label>
              <span className="text-xs text-neutral-500">Minimum 2</span>
            </div>
            <input
              type="number"
              min={2}
              max={20}
              required
              value={numPeople}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 2;
                setNumPeople(val);
                if (val >= 2) setDurationMonths(val - 1);
              }}
              className="w-full rounded-2xl border border-neutral-800 bg-neutral-900/90 px-4 py-3.5 text-sm text-white focus:outline-none focus:border-red-500 transition-colors font-mono"
            />
            <p className="text-xs text-neutral-400">
              Invites required: <strong className="text-white">{Math.max(0, numPeople - 1)} members</strong> (you count as 1).
            </p>
          </div>

          {/* Monthly Amount */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs uppercase tracking-wider font-bold text-neutral-300">
                Monthly Amount per Member (MockUSDC)
              </label>
              <span className="text-xs text-neutral-500">Base Sepolia 6 Decimals</span>
            </div>
            <div className="relative">
              <input
                type="number"
                min={1}
                step={1}
                required
                value={monthlyAmount}
                onChange={(e) => setMonthlyAmount(e.target.value)}
                placeholder="1000"
                className="w-full rounded-2xl border border-neutral-800 bg-neutral-900/90 pl-4 pr-16 py-3.5 text-sm text-white focus:outline-none focus:border-red-500 transition-colors font-mono"
              />
              <span className="absolute right-4 top-3.5 text-xs font-bold text-neutral-500">
                USDC
              </span>
            </div>

            {isBalanceInsufficient ? (
              <div className="p-3.5 rounded-2xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-start gap-2.5 mt-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-red-200">Insufficient Creator Balance</p>
                  <p className="text-[11px] leading-relaxed text-red-300/90">
                    Your current wallet balance is{" "}
                    <strong className="text-white font-mono">
                      {creatorBalance !== null ? `${creatorBalance.toFixed(2)} USDC` : "0.00 USDC"}
                    </strong>
                    . You must hold at least{" "}
                    <strong className="text-white font-mono">
                      {required3xBalance.toLocaleString()} USDC
                    </strong>{" "}
                    (3x monthly contribution) to originate this circle and invite members.
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-emerald-400 font-mono mt-1">
                Required 3x balance check at invite time:{" "}
                <strong>{required3xBalance.toLocaleString()} USDC</strong>
                {creatorBalance !== null && (
                  <span className="text-neutral-400 text-[11px] ml-2 font-normal">
                    (Your wallet holds: <strong className="text-emerald-300">{creatorBalance.toFixed(2)} USDC</strong>)
                  </span>
                )}
              </p>
            )}
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs uppercase tracking-wider font-bold text-neutral-300">
                Duration (Months)
              </label>
              <span className="text-xs text-red-400 font-semibold">Must be N minus 1 or N minus 2</span>
            </div>
            <select
              value={durationMonths}
              onChange={(e) => setDurationMonths(parseInt(e.target.value))}
              className="w-full rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3.5 text-sm text-white focus:outline-none focus:border-red-500 cursor-pointer font-mono"
            >
              {allowedDurations.map((d) => (
                <option key={d} value={d} className="bg-neutral-950 text-white">
                  {d} Months ({d === numPeople - 1 ? "N minus 1" : "N minus 2"})
                </option>
              ))}
            </select>
          </div>

          {/* Rules Card */}
          <div className="rounded-2xl bg-neutral-900/80 border border-neutral-800 p-5 text-xs text-neutral-300 space-y-2.5">
            <div className="font-bold text-white flex items-center gap-2">
              <Shield className="h-4 w-4 text-red-500" />
              <span>Protocol Governance Rules</span>
            </div>
            <ul className="space-y-1 text-neutral-400 list-disc pl-4">
              <li>Candidate balance must equal at least 3 times the monthly amount prior to invite transmission.</li>
              <li>When all {numPeople} members join, the group enters the Issue Stage to mutually confirm terms.</li>
              <li>Once all participants submit No issues, the circle becomes Finalized for smart contract deployment.</li>
            </ul>
          </div>

          <button
            type="submit"
            disabled={!validation.valid || isBalanceInsufficient || isSubmitting}
            className={`w-full py-4 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all shadow-xl ${
              validation.valid && !isBalanceInsufficient && !isSubmitting
                ? "bg-white hover:bg-neutral-200 text-black cursor-pointer shadow-white/5"
                : "bg-neutral-900 text-neutral-600 cursor-not-allowed border border-neutral-800 shadow-none"
            }`}
          >
            {isSubmitting
              ? "Creating Circle..."
              : isBalanceInsufficient
              ? `Insufficient Wallet Balance (Needs ${required3xBalance.toLocaleString()} USDC)`
              : "Create Circle and Invite Members"}
          </button>
        </form>
      </div>
    </div>
  );
}
