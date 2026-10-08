"use client";

import Link from "next/link";
import { useDevUser } from "@/components/providers";
import { PlusCircle, Users, ArrowRight, ShieldCheck, Zap, Lock, Sparkles, TrendingUp, Coins, ChevronRight } from "lucide-react";
import { DemoVideoModal } from "@/components/demo-video-modal";

export default function HomePage() {
  const { user } = useDevUser();

  return (
    <div className="min-h-screen bg-black text-white space-y-16 pb-20">
      <DemoVideoModal />

      {/* Hero Section inspired by Xapo Bank */}
      <section className="relative pt-12 sm:pt-20 pb-8 overflow-hidden max-w-7xl mx-auto px-6">
        {/* Ambient background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-red-600/15 via-rose-600/10 to-transparent blur-[120px] pointer-events-none rounded-full" />

        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-neutral-900 border border-neutral-800 text-xs font-semibold tracking-widest uppercase text-neutral-300">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            <span>Private Financial Protocol</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.08]">
            Wealth circles built for the digital era.
          </h1>

          <p className="text-lg sm:text-xl text-neutral-400 font-normal leading-relaxed max-w-2xl">
            Welcome, <span className="text-white font-semibold">{user?.displayName || "Private Member"}</span>. Combine capital with verified peers, automate monthly pooling, and bid in confidential cryptographic auctions.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-4">
            <Link
              href="/circles/new"
              className="px-8 py-4 rounded-2xl bg-white hover:bg-neutral-200 text-black font-bold text-sm transition-all shadow-xl shadow-white/5 flex items-center gap-2"
            >
              <span>Form a Circle</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              href="/circles"
              className="px-8 py-4 rounded-2xl bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-800 text-white font-bold text-sm transition-all flex items-center gap-2"
            >
              <span>View Active Circles</span>
            </Link>
          </div>
        </div>

        {/* Real Time Portfolio Stats Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-16 pt-8 border-t border-neutral-900">
          <div className="p-6 rounded-2xl bg-neutral-950 border border-neutral-900 space-y-1.5">
            <div className="text-xs uppercase tracking-widest text-neutral-400 font-semibold">
              Total Pooled Volume
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-white font-mono">
              24,500 <span className="text-xs font-normal text-neutral-400">USDC</span>
            </div>
            <div className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
              <TrendingUp className="w-3 h-3" />
              <span>Full capital accounted</span>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-neutral-950 border border-neutral-900 space-y-1.5">
            <div className="text-xs uppercase tracking-widest text-neutral-400 font-semibold">
              Auction Dividend Return
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-red-400 font-mono">
              5.2% <span className="text-xs font-normal text-neutral-400">Surplus</span>
            </div>
            <div className="text-[11px] text-neutral-400">
              Distributed to non winning members
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-neutral-950 border border-neutral-900 space-y-1.5">
            <div className="text-xs uppercase tracking-widest text-neutral-400 font-semibold">
              Settlement Speed
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-white font-mono">
              Instant
            </div>
            <div className="text-[11px] text-neutral-400">
              Direct smart account payout
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-neutral-950 border border-neutral-900 space-y-1.5">
            <div className="text-xs uppercase tracking-widest text-neutral-400 font-semibold">
              Network Protocol
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-white font-mono">
              Base Sepolia
            </div>
            <div className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Smart contracts verified</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Choice Cards inspired by Xapo Bank */}
      <section className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Card 1: Form a Circle */}
          <Link
            href="/circles/new"
            className="group relative rounded-3xl bg-gradient-to-b from-neutral-900/90 to-neutral-950 p-8 sm:p-10 border border-neutral-800 hover:border-red-600/50 shadow-2xl transition-all duration-300 flex flex-col justify-between overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-48 h-48 bg-red-600/10 rounded-full blur-3xl pointer-events-none group-hover:bg-red-600/20 transition-all" />

            <div className="space-y-6 relative z-10">
              <div className="h-16 w-16 rounded-2xl bg-red-600/10 border border-red-600/20 flex items-center justify-center text-red-400 group-hover:scale-105 transition-transform duration-300">
                <PlusCircle className="h-8 w-8" />
              </div>

              <div className="space-y-3">
                <span className="text-xs uppercase tracking-widest font-bold text-red-400">
                  Organizer Access
                </span>
                <h2 className="text-3xl font-bold text-white tracking-tight group-hover:text-red-300 transition-colors">
                  Create a new circle
                </h2>
                <p className="text-neutral-400 text-sm leading-relaxed">
                  Design parameters for your financial circle. Specify member capacity, fixed monthly pooling contributions, duration limits, and add trusted participants.
                </p>
              </div>
            </div>

            <div className="mt-10 pt-6 border-t border-neutral-800/80 flex items-center justify-between text-sm font-bold text-white group-hover:text-red-400 transition-colors">
              <span>Initiate Setup</span>
              <div className="h-9 w-9 rounded-full bg-neutral-800 group-hover:bg-red-600 group-hover:text-white flex items-center justify-center transition-colors">
                <ArrowRight className="h-4 w-4" />
              </div>
            </div>
          </Link>

          {/* Card 2: Existing Circles */}
          <Link
            href="/circles"
            className="group relative rounded-3xl bg-gradient-to-b from-neutral-900/90 to-neutral-950 p-8 sm:p-10 border border-neutral-800 hover:border-neutral-700 shadow-2xl transition-all duration-300 flex flex-col justify-between overflow-hidden"
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
                  Are you in a circle?
                </h2>
                <p className="text-neutral-400 text-sm leading-relaxed">
                  Access circles you belong to, verify invitations, review mutual issue resolutions, authorize monthly autopay, and bid in confidential monthly rounds.
                </p>
              </div>
            </div>

            <div className="mt-10 pt-6 border-t border-neutral-800/80 flex items-center justify-between text-sm font-bold text-white group-hover:text-neutral-300 transition-colors">
              <span>View Portfolio</span>
              <div className="h-9 w-9 rounded-full bg-neutral-800 group-hover:bg-neutral-700 flex items-center justify-center transition-colors">
                <ArrowRight className="h-4 w-4" />
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* Protocol Architecture Features Strip */}
      <section className="max-w-7xl mx-auto px-6 pt-12">
        <div className="grid sm:grid-cols-3 gap-6">
          <div className="p-8 rounded-3xl bg-neutral-950 border border-neutral-900 space-y-4">
            <div className="h-12 w-12 rounded-2xl bg-red-600/10 border border-red-600/20 text-red-400 flex items-center justify-center">
              <Zap className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Automated Autopay</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Preapproved smart session mandates execute timely monthly pooling directly to the circle vault with zero manual friction.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-neutral-950 border border-neutral-900 space-y-4">
            <div className="h-12 w-12 rounded-2xl bg-red-600/10 border border-red-600/20 text-red-400 flex items-center justify-center">
              <Lock className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Sealed Bidding Auctions</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Bids stay cryptographically confidential until the reveal window. The lowest valid bid takes the round pot, while surplus carries forward.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-neutral-950 border border-neutral-900 space-y-4">
            <div className="h-12 w-12 rounded-2xl bg-red-600/10 border border-red-600/20 text-red-400 flex items-center justify-center">
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
