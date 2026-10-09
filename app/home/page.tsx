"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useDevUser } from "@/components/providers";
import { PlusCircle, Users, ArrowRight, TrendingUp, User, ShieldCheck, Zap } from "lucide-react";
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

export default function HomePage() {
  const { user } = useDevUser();
  const [circles, setCircles] = useState<CircleItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    fetch("/api/circles/mine", {
      headers: { "x-dev-user": user.username },
    })
      .then((res) => res.json())
      .then((data: CircleItem[]) => {
        if (Array.isArray(data)) {
          setCircles(data);
        }
      })
      .catch((err) => console.error("Error fetching live circles:", err))
      .finally(() => setLoading(false));
  }, [user]);

  // Compute live dynamic statistics
  const totalPooledUnits = circles.reduce((acc, c) => {
    const monthly = BigInt(c.monthlyAmount || "0");
    const total = monthly * BigInt(c.numPeople || 0) * BigInt(c.durationMonths || 0);
    return acc + total;
  }, BigInt(0));

  const totalPooledDisplay = fromBaseUnits(totalPooledUnits.toString());
  const finalizedCount = circles.filter((c) => c.status === "FINALIZED").length;
  const invitingCount = circles.filter((c) => c.status === "INVITING").length;

  return (
    <div className="relative min-h-screen bg-black text-white selection:bg-amber-500 selection:text-black overflow-hidden">
      {/* Hero Section */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pt-12 pb-8">
        <div className="space-y-6">
          
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-neutral-900/90 border border-neutral-800 text-[11px] font-mono text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Base Sepolia • 0% Commission Protocol</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Chit Funds on Base Sepolia
          </h1>

          <p className="text-base text-neutral-400 max-w-xl leading-relaxed">
            Decentralized ROSCA savings circles with automated smart autopay and confidential sealed-bid auctions.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/circles/new"
              className="px-6 py-3 rounded-full bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20"
            >
              <span>Start a Circle</span>
              <PlusCircle className="h-4 w-4" />
            </Link>

            <Link
              href="/circles"
              className="px-6 py-3 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs uppercase tracking-wider border border-neutral-800 transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>Your Circles ({circles.length})</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

        </div>

        {/* Live Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12 pt-6 border-t border-neutral-900">
          <div className="p-5 rounded-2xl bg-neutral-950 border border-neutral-900 space-y-1">
            <div className="text-[11px] uppercase tracking-wider text-neutral-500 font-semibold">Total Pooled</div>
            <div className="text-xl sm:text-2xl font-bold text-white font-mono">
              {loading ? "..." : `${Number(totalPooledDisplay).toLocaleString()} USDC`}
            </div>
            <div className="text-[10px] text-emerald-400 font-mono">On-chain Base Sepolia</div>
          </div>

          <div className="p-5 rounded-2xl bg-neutral-950 border border-neutral-900 space-y-1">
            <div className="text-[11px] uppercase tracking-wider text-neutral-500 font-semibold">Circles Joined</div>
            <div className="text-xl sm:text-2xl font-bold text-amber-400 font-mono">
              {loading ? "..." : `${circles.length}`}
            </div>
            <div className="text-[10px] text-neutral-500 font-mono">{finalizedCount} Active</div>
          </div>

          <div className="p-5 rounded-2xl bg-neutral-950 border border-neutral-900 space-y-1">
            <div className="text-[11px] uppercase tracking-wider text-neutral-500 font-semibold">Inviting Circles</div>
            <div className="text-xl sm:text-2xl font-bold text-orange-400 font-mono">
              {loading ? "..." : `${invitingCount}`}
            </div>
            <div className="text-[10px] text-neutral-500 font-mono">Pending Confirmation</div>
          </div>

          <div className="p-5 rounded-2xl bg-neutral-950 border border-neutral-900 space-y-1">
            <div className="text-[11px] uppercase tracking-wider text-neutral-500 font-semibold">Middleman Cut</div>
            <div className="text-xl sm:text-2xl font-bold text-emerald-400 font-mono">
              0%
            </div>
            <div className="text-[10px] text-emerald-400 font-mono">Zero Fee</div>
          </div>
        </div>
      </section>

      {/* Core Action Cards */}
      <section className="max-w-6xl mx-auto px-6 py-6">
        <div className="grid md:grid-cols-2 gap-6">
          
          <Link
            href="/circles/new"
            className="rounded-3xl bg-neutral-950 p-8 border border-neutral-900 hover:border-amber-500/40 transition-all space-y-4 group cursor-pointer"
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
              <PlusCircle className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-white group-hover:text-amber-400 transition-colors">
                Create a Chit Circle
              </h2>
              <p className="text-xs text-neutral-400">
                Configure duration, monthly USDC contribution, and invite trusted members.
              </p>
            </div>
            <div className="pt-4 flex items-center gap-2 text-xs font-bold text-amber-400">
              <span>Start Setup</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link
            href="/circles"
            className="rounded-3xl bg-neutral-950 p-8 border border-neutral-900 hover:border-neutral-700 transition-all space-y-4 group cursor-pointer"
          >
            <div className="w-12 h-12 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-300 group-hover:scale-105 transition-transform">
              <Users className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-white group-hover:text-neutral-200 transition-colors">
                View Your Circles
              </h2>
              <p className="text-xs text-neutral-400">
                Monitor pool cycles, submit confidential bids, and authorize smart autopay.
              </p>
            </div>
            <div className="pt-4 flex items-center gap-2 text-xs font-bold text-neutral-300">
              <span>Open Portfolio</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

        </div>
      </section>

    </div>
  );
}
