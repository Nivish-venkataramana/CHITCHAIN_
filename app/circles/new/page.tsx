"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDevUser } from "@/components/providers";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { validateCircleParams } from "@/lib/validation";

export default function CreateCirclePage() {
  const router = useRouter();
  const { user } = useDevUser();

  const [name, setName] = useState("");
  const [numPeople, setNumPeople] = useState<string>("");
  const [monthlyAmount, setMonthlyAmount] = useState<string>("");
  const [durationMonths, setDurationMonths] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const parsedPeople = parseInt(numPeople) || 0;
  const parsedAmount = parseFloat(monthlyAmount) || 0;
  const parsedDuration = parseInt(durationMonths) || 0;

  const validation = validateCircleParams({
    name,
    numPeople: parsedPeople,
    monthlyAmount,
    durationMonths: parsedDuration,
  });

  const allowedDurations = parsedPeople >= 2
    ? [parsedPeople - 1, parsedPeople - 2].filter((d) => d >= 1)
    : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validation.valid) {
      setError(validation.error || "Please verify parameters.");
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
          numPeople: parsedPeople,
          monthlyAmount,
          durationMonths: parsedDuration,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create circle");

      router.push(`/circles/${data.id}`);
    } catch (err: any) {
      setError(err.message || "Failed to create circle");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto py-8 space-y-6">
      <Link
        href="/circles"
        className="inline-flex items-center gap-2 text-xs text-neutral-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to circles
      </Link>

      <div className="rounded-3xl glass-panel-glow p-8 sm:p-10 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Create a Chit Circle</h1>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-red-950/30 border border-red-500/30 text-red-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Circle Name */}
          <div className="line-input-group">
            <input
              type="text"
              id="circle-name"
              required
              placeholder=" "
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="line-input"
            />
            <label htmlFor="circle-name" className="line-label">
              Circle Name
            </label>
          </div>

          {/* Members Count & Monthly Amount in the Same Line */}
          <div className="grid grid-cols-2 gap-6">
            <div className="line-input-group">
              <input
                type="number"
                id="members-count"
                min={2}
                max={20}
                required
                placeholder=" "
                value={numPeople}
                onChange={(e) => {
                  const val = e.target.value;
                  setNumPeople(val);
                  const p = parseInt(val) || 0;
                  if (p >= 2) {
                    setDurationMonths(String(p - 1));
                  } else {
                    setDurationMonths("");
                  }
                }}
                className="line-input"
              />
              <label htmlFor="members-count" className="line-label">
                Members Count (N)
              </label>
            </div>

            <div className="line-input-group">
              <input
                type="number"
                id="monthly-amount"
                min={1}
                step={1}
                required
                placeholder=" "
                value={monthlyAmount}
                onChange={(e) => setMonthlyAmount(e.target.value)}
                className="line-input"
              />
              <label htmlFor="monthly-amount" className="line-label">
                Monthly Amount (USDC)
              </label>
            </div>
          </div>

          {/* Live helper status if values entered */}
          {(parsedPeople >= 2 || parsedAmount > 0) && (
            <div className="flex items-center justify-between text-[11px] text-neutral-400 px-0.5 -mt-4">
              <span>{parsedPeople >= 2 ? `${parsedPeople - 1} invites required` : ""}</span>
              <span className="text-emerald-400">
                {parsedAmount > 0 ? `${(parsedAmount * 3).toLocaleString()} USDC required at invite` : ""}
              </span>
            </div>
          )}

          {/* Duration */}
          <div className="line-input-group">
            <select
              id="circle-duration"
              value={durationMonths}
              onChange={(e) => setDurationMonths(e.target.value)}
              className={`line-input cursor-pointer bg-transparent appearance-none ${
                durationMonths ? "line-input-active text-white" : "text-transparent"
              }`}
            >
              <option value="" disabled className="bg-neutral-950 text-neutral-500">
                Select duration
              </option>
              {allowedDurations.map((d) => (
                <option key={d} value={String(d)} className="bg-neutral-950 text-white">
                  {d} Month{d > 1 ? "s" : ""}
                </option>
              ))}
            </select>
            <label htmlFor="circle-duration" className={`line-label ${durationMonths ? "!top-0 !scale-[0.8] !text-emerald-400 !font-semibold" : ""}`}>
              Duration (Months)
            </label>
          </div>

          <button
            type="submit"
            disabled={!validation.valid || isSubmitting}
            className={`w-full py-3.5 rounded-xl font-semibold text-xs tracking-wider uppercase transition-all ${
              validation.valid && !isSubmitting
                ? "bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_25px_rgba(16,185,129,0.35)] cursor-pointer"
                : "bg-white/5 text-neutral-600 border border-white/5 cursor-not-allowed"
            }`}
          >
            {isSubmitting ? "Creating..." : "Create Circle & Invite Members"}
          </button>
        </form>
      </div>
    </div>
  );
}
