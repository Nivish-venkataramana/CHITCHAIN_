"use client";

import Link from "next/link";
import { useDevUser } from "@/components/providers";
import { PlusCircle, Users, ArrowRight, ShieldCheck, Zap, Lock } from "lucide-react";

export default function HomePage() {
  const { user } = useDevUser();

  return (
    <div className="space-y-12 py-6">
      {/* Hero Section */}
      <div className="text-center max-w-2xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold uppercase tracking-wider">
          <ShieldCheck className="h-3.5 w-3.5" />
          Base Sepolia Powered
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900">
          Chit funds built on trustless math.
        </h1>
        <p className="text-lg text-slate-600">
          Welcome back, <span className="font-semibold text-slate-900">{user?.displayName || "Member"}</span> (@{user?.username}).
          Form circles with verified friends, automate contributions, and bid with secret commit-reveal auctions.
        </p>
      </div>

      {/* Main Choice Tiles */}
      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* Choice 1: Create a Circle */}
        <Link
          href="/circles/new"
          className="group relative overflow-hidden rounded-2xl border-2 border-blue-200 bg-white p-8 shadow-sm hover:border-blue-500 hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
        >
          <div className="space-y-4">
            <div className="h-14 w-14 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
              <PlusCircle className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                Create a circle
              </h2>
              <p className="text-slate-600 mt-2 text-sm leading-relaxed">
                As a volunteer organizer, set up members count, monthly pool amount, duration, and invite friends by username.
              </p>
            </div>
          </div>
          <div className="mt-8 flex items-center gap-2 font-semibold text-sm text-blue-600">
            <span>Start new circle</span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Choice 2: Are you existing in a circle */}
        <Link
          href="/circles"
          className="group relative overflow-hidden rounded-2xl border-2 border-slate-200 bg-white p-8 shadow-sm hover:border-slate-400 hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
        >
          <div className="space-y-4">
            <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-700 group-hover:scale-110 transition-transform">
              <Users className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 group-hover:text-slate-700 transition-colors">
                Are you existing in a circle?
              </h2>
              <p className="text-slate-600 mt-2 text-sm leading-relaxed">
                Check active circles you participate in, verify invites, review proposed terms, and track upcoming auctions.
              </p>
            </div>
          </div>
          <div className="mt-8 flex items-center gap-2 font-semibold text-sm text-slate-700">
            <span>View my circles</span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>

      {/* Feature Highlights */}
      <div className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto pt-6 border-t border-slate-200">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-semibold text-sm text-slate-800">Autopay Mandates</h4>
            <p className="text-xs text-slate-500 mt-0.5">Pre-authorized, tightly scoped monthly smart session transfers.</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-semibold text-sm text-slate-800">Commit-Reveal Bidding</h4>
            <p className="text-xs text-slate-500 mt-0.5">Bids stay secret until reveal. Lowest valid bid wins pot.</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-semibold text-sm text-slate-800">Carried Dividends</h4>
            <p className="text-xs text-slate-500 mt-0.5">Surplus funds roll into the next month's pool automatically.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
