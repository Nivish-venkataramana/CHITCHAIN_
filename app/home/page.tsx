"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useDevUser } from "@/components/providers";
import { PlusCircle, Users, ArrowRight, ShieldCheck, Zap, Lock, TrendingUp, User, Box } from "lucide-react";
import { fromBaseUnits } from "@/lib/validation";

const FloatingCoinsBackground = dynamic(
  () => import("@/components/floating-coins-background").then((mod) => mod.FloatingCoinsBackground),
  { ssr: false }
);

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
  const issuesCount = circles.filter((c) => c.status === "ISSUE_STAGE").length;
  const invitingCount = circles.filter((c) => c.status === "INVITING").length;

  return (
    <div className="relative min-h-screen bg-black text-white overflow-hidden pb-24">
      {/* 3D Moving Floating Rupee Coins Dynamic Background Layer */}
      <FloatingCoinsBackground />

      {/* Main Hero Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-16 sm:pt-24 lg:pt-28 pb-16">
        <div className="max-w-2xl lg:max-w-3xl space-y-8">
          
          {/* Top Quick Trigger to return to 3D ChitVaults View */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-950/60 hover:bg-orange-900/80 border border-orange-500/40 text-orange-300 text-xs font-mono tracking-wider transition-all duration-300 shadow-lg shadow-orange-950/50 cursor-pointer group"
            >
              <Box className="w-3.5 h-3.5 text-orange-400 group-hover:rotate-45 transition-transform duration-300" />
              <span>Launch 3D ChitVaults View</span>
            </Link>
          </div>

          {/* Main Hero Headline */}
          <h1 className="text-5xl sm:text-7xl lg:text-8xl font-extrabold tracking-tight text-white leading-[1.04]">
            Chit funds for India. 0% commission on pool.
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg lg:text-xl text-neutral-300 font-normal leading-relaxed max-w-2xl">
            The decentralized chit fund protocol on Base Sepolia helps you pool monthly capital with trusted friends and family. Automate pooling via autopay, bid in confidential auctions, and grow wealth together.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-4 pt-4">
            <Link
              href="/circles/new"
              className="px-8 py-4 rounded-full bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-sm tracking-wide transition-all shadow-2xl shadow-orange-900/50 flex items-center gap-2.5 transform hover:scale-105 duration-300 cursor-pointer"
            >
              <span>Start a Chit Circle</span>
              <User className="h-4 w-4" />
            </Link>

            <Link
              href="/circles"
              className="px-8 py-4 rounded-full bg-neutral-900/90 hover:bg-neutral-800 text-neutral-200 hover:text-white font-bold text-sm tracking-wide border border-neutral-800 transition-all flex items-center gap-2"
            >
              <span>Explore Active Chits ({circles.length})</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Live Authenticated Member Pill */}
          <div className="pt-2 flex items-center gap-2 text-xs text-neutral-400 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Active member: <strong className="text-white">{user?.displayName || "Member"}</strong> (@{user?.username})</span>
          </div>

        </div>

        {/* Real-Time Live Volume Statistics Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-20 pt-8 border-t border-neutral-900">
          <div className="p-6 rounded-2xl bg-neutral-950/80 border border-neutral-900 space-y-1.5 backdrop-blur-md">
            <div className="text-xs uppercase tracking-widest text-neutral-400 font-semibold">
              Total Pooled Volume
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-white font-mono">
              {loading ? "..." : `${Number(totalPooledDisplay).toLocaleString()} USDC`}
            </div>
            <div className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
              <TrendingUp className="w-3 h-3" />
              <span>Base Sepolia onchain</span>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-neutral-950/80 border border-neutral-900 space-y-1.5 backdrop-blur-md">
            <div className="text-xs uppercase tracking-widest text-neutral-400 font-semibold">
              Active Wealth Circles
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-orange-400 font-mono">
              {loading ? "..." : `${circles.length} Circles`}
            </div>
            <div className="text-[11px] text-neutral-400">
              {finalizedCount} Finalized • {invitingCount} Inviting
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-neutral-950/80 border border-neutral-900 space-y-1.5 backdrop-blur-md">
            <div className="text-xs uppercase tracking-widest text-neutral-400 font-semibold">
              Issue Review Stage
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-amber-400 font-mono">
              {loading ? "..." : `${issuesCount} Pending`}
            </div>
            <div className="text-[11px] text-neutral-400">
              Dispute & agreement gate
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-neutral-950/80 border border-neutral-900 space-y-1.5 backdrop-blur-md">
            <div className="text-xs uppercase tracking-widest text-neutral-400 font-semibold">
              Organizer Foreman Cut
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-emerald-400 font-mono">
              ₹0 Zero
            </div>
            <div className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Zero middleman commission</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Choice Tiles Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-10">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Card 1: Create a Circle */}
          <Link
            href="/circles/new"
            className="group relative rounded-3xl bg-gradient-to-b from-neutral-900/90 via-neutral-950 to-black p-8 sm:p-10 border border-neutral-800/80 hover:border-orange-500/50 shadow-2xl transition-all duration-300 flex flex-col justify-between overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-48 h-48 bg-orange-600/10 rounded-full blur-3xl pointer-events-none group-hover:bg-orange-600/20 transition-all" />

            <div className="space-y-6 relative z-10">
              <div className="h-16 w-16 rounded-2xl bg-orange-600/10 border border-orange-500/20 flex items-center justify-center text-orange-400 group-hover:scale-105 transition-transform duration-300">
                <PlusCircle className="h-8 w-8" />
              </div>

              <div className="space-y-3">
                <span className="text-xs uppercase tracking-widest font-bold text-orange-400">
                  Organizer Access
                </span>
                <h2 className="text-3xl font-bold text-white tracking-tight group-hover:text-orange-300 transition-colors">
                  Create a new chit circle
                </h2>
                <p className="text-neutral-400 text-sm leading-relaxed">
                  Design parameters for your chit circle. Specify member capacity, fixed monthly pooling contributions in USDC, duration in months, and add trusted participants by username.
                </p>
              </div>
            </div>

            <div className="mt-10 pt-6 border-t border-neutral-800/80 flex items-center justify-between text-sm font-bold text-white group-hover:text-orange-400 transition-colors">
              <span>Initiate Setup</span>
              <div className="h-9 w-9 rounded-full bg-neutral-800 group-hover:bg-orange-600 group-hover:text-white flex items-center justify-center transition-colors">
                <ArrowRight className="h-4 w-4" />
              </div>
            </div>
          </Link>

          {/* Card 2: Existing Circles */}
          <Link
            href="/circles"
            className="group relative rounded-3xl bg-gradient-to-b from-neutral-900/90 via-neutral-950 to-black p-8 sm:p-10 border border-neutral-800/80 hover:border-neutral-700 shadow-2xl transition-all duration-300 flex flex-col justify-between overflow-hidden"
          >
            <div className="space-y-6 relative z-10">
              <div className="h-16 w-16 rounded-2xl bg-neutral-800/80 border border-neutral-700 flex items-center justify-center text-white group-hover:scale-105 transition-transform duration-300">
                <Users className="h-8 w-8" />
              </div>

              <div className="space-y-3">
                <span className="text-xs uppercase tracking-widest font-bold text-neutral-400">
                  Membership Dashboard
                </span>
                <h2 className="text-3xl font-bold text-white tracking-tight group-hover:text-neutral-200 transition-colors">
                  Your Circles Portfolio ({circles.length})
                </h2>
                <p className="text-neutral-400 text-sm leading-relaxed">
                  Access chit circles you belong to, verify invitations, review mutual issue resolutions, authorize monthly autopay, and bid in confidential monthly rounds.
                </p>
              </div>
            </div>

            <div className="mt-10 pt-6 border-t border-neutral-800/80 flex items-center justify-between text-sm font-bold text-white group-hover:text-neutral-300 transition-colors">
              <span>View Chit Portfolio</span>
              <div className="h-9 w-9 rounded-full bg-neutral-800 group-hover:bg-neutral-700 flex items-center justify-center transition-colors">
                <ArrowRight className="h-4 w-4" />
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* Protocol Architecture Features Strip */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-16">
        <div className="grid sm:grid-cols-3 gap-6">
          <div className="p-8 rounded-3xl bg-neutral-950/80 border border-neutral-900 space-y-4 backdrop-blur-md">
            <div className="h-12 w-12 rounded-2xl bg-orange-600/10 border border-orange-500/20 text-orange-400 flex items-center justify-center">
              <Zap className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Automated Autopay</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Preapproved smart session mandates execute timely monthly pooling directly to the circle vault with zero manual friction.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-neutral-950/80 border border-neutral-900 space-y-4 backdrop-blur-md">
            <div className="h-12 w-12 rounded-2xl bg-orange-600/10 border border-orange-500/20 text-orange-400 flex items-center justify-center">
              <Lock className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Sealed Bidding Auctions</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Bids stay cryptographically confidential until the reveal window. The lowest valid bid takes the round pot, while surplus carries forward.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-neutral-950/80 border border-neutral-900 space-y-4 backdrop-blur-md">
            <div className="h-12 w-12 rounded-2xl bg-orange-600/10 border border-orange-500/20 text-orange-400 flex items-center justify-center">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Trustless Settlement</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Audited smart contract rules govern all pool accounting, winner payouts, and dividends with complete onchain transparency.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
