"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDevUser } from "@/components/providers";
import { ArrowLeft, AlertCircle, Info } from "lucide-react";
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
    <div className="max-w-2xl mx-auto py-4 space-y-6">
      <Link
        href="/circles"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to circles
      </Link>

      <div className="rounded-2xl border bg-white p-8 shadow-sm space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Create a New Chit Circle</h1>
          <p className="text-slate-600 text-sm mt-1">
            As volunteer organizer (<span className="font-semibold">{user?.displayName}</span>), set the pool terms. You count as member 1 of N.
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Circle Name */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-800">
              Circle Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Alpha Friends Chit"
              className="w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Number of People */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-semibold text-slate-800">
                Number of People (N)
              </label>
              <span className="text-xs text-slate-500">Minimum 2 people</span>
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
              className="w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-blue-600">
              ℹ️ Invites needed: <strong>{Math.max(0, numPeople - 1)} members</strong> (you are 1).
            </p>
          </div>

          {/* Monthly Amount */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-semibold text-slate-800">
                Monthly Amount per Member (MockUSDC)
              </label>
              <span className="text-xs text-slate-500">Fixed 6 decimals</span>
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
                className="w-full rounded-xl border pl-4 pr-16 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="absolute right-4 top-2.5 text-xs font-bold text-slate-400">
                USDC
              </span>
            </div>
            <p className="text-xs text-emerald-600">
              💳 Required 3x balance per invitee at invite time: <strong>{(parsedAmount * 3).toLocaleString()} USDC</strong>.
            </p>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-semibold text-slate-800">
                Duration (Months)
              </label>
              <span className="text-xs font-medium text-amber-600">Must be N-1 or N-2 months</span>
            </div>
            <select
              value={durationMonths}
              onChange={(e) => setDurationMonths(parseInt(e.target.value))}
              className="w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {allowedDurations.map((d) => (
                <option key={d} value={d}>
                  {d} Month{d > 1 ? "s" : ""} {d === numPeople - 1 ? "(N - 1)" : "(N - 2)"}
                </option>
              ))}
            </select>
          </div>

          {/* Rules Card */}
          <div className="rounded-xl bg-slate-50 border p-4 text-xs text-slate-600 space-y-2">
            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
              <Info className="h-4 w-4 text-blue-600" />
              Circle Rules Summary
            </div>
            <ul className="list-disc pl-4 space-y-1">
              <li>Candidate balance must be at least 3 x monthly amount at invite time.</li>
              <li>Once all {numPeople} members join, the group enters the Issue Stage to review terms.</li>
              <li>When all members submit &quot;No issues&quot;, the circle becomes Finalized.</li>
            </ul>
          </div>

          <button
            type="submit"
            disabled={!validation.valid || isSubmitting}
            className={`w-full py-3 rounded-xl font-bold text-sm text-white shadow-sm transition-all ${
              validation.valid && !isSubmitting
                ? "bg-blue-600 hover:bg-blue-700 cursor-pointer"
                : "bg-slate-300 cursor-not-allowed"
            }`}
          >
            {isSubmitting ? "Creating Circle..." : "Create Circle & Start Inviting"}
          </button>
        </form>
      </div>
    </div>
  );
}
