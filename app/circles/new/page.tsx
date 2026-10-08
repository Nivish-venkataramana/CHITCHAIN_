"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDevUser } from "@/components/providers";
import { ArrowLeft, AlertCircle, Info, Shield, PlusCircle, ArrowRight } from "lucide-react";
import { validateCircleParams } from "@/lib/validation";

export default function CreateCirclePage() {
  const router = useRouter();
  const { user } = useDevUser();

  const [name, setName] = useState("");
  const [numPeople, setNumPeople] = useState<number>(4);
  const [monthlyAmount, setMonthlyAmount] = useState<string>("1000");
  const [durationMonths, setDurationMonths] = useState<number>(3);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live validation calculations using shared validation logic
  const validation = validateCircleParams({
    name,
    numPeople,
    monthlyAmount,
    durationMonths,
  });

  const parsedAmount = parseFloat(monthlyAmount) || 0;
  const allowedDurations = [numPeople - 1, numPeople - 2].filter((d) => d >= 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
          ...(user?.username ? { "x-dev-user": user.username } : {}),
        },
        body: JSON.stringify({
          name: name.trim(),
          numPeople,
          monthlyAmount,
          durationMonths,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create circle");
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
            As organizer (<span className="font-semibold text-white">{user?.displayName}</span>), specify circle pooling rules. You count as member 1 of N.
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-red-950/60 border border-red-800/50 text-red-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
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
            <p className="text-xs text-emerald-400">
              Required 3x balance check at invite time: <strong>{(parsedAmount * 3).toLocaleString()} USDC</strong>
            </p>
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
            disabled={!validation.valid || isSubmitting}
            className={`w-full py-4 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all shadow-xl ${
              validation.valid && !isSubmitting
                ? "bg-white hover:bg-neutral-200 text-black cursor-pointer shadow-white/5"
                : "bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700/50"
            }`}
          >
            {isSubmitting ? "Creating Circle..." : "Create Circle and Invite Members"}
          </button>
        </form>
      </div>
    </div>
  );
}
