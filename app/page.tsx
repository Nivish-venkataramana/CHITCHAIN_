"use client";

import Link from "next/link";
import { Plus, Users, ArrowRight } from "lucide-react";
import { DemoVideoModal } from "@/components/demo-video-modal";

export default function HomePage() {
  return (
    <div className="w-full flex flex-col justify-center items-center py-6">
      <DemoVideoModal />

      {/* Main Action Panels */}
      <div className="grid md:grid-cols-2 gap-8 w-full max-w-4xl mx-auto">
        {/* Create Circle */}
        <Link
          href="/circles/new"
          className="group relative rounded-3xl glass-panel-glow p-10 flex flex-col justify-between transition-all duration-300 hover:scale-[1.01]"
        >
          <div className="space-y-6">
            <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500 group-hover:text-black transition-all">
              <Plus className="h-7 w-7" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white tracking-tight">
                Create a Circle
              </h2>
            </div>
          </div>
          <div className="mt-12 flex items-center gap-2 font-medium text-sm text-emerald-400 group-hover:text-emerald-300">
            <span>Start circle</span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Existing Circles */}
        <Link
          href="/circles"
          className="group relative rounded-3xl glass-panel p-10 flex flex-col justify-between hover:border-white/20 transition-all duration-300 hover:scale-[1.01]"
        >
          <div className="space-y-6">
            <div className="h-14 w-14 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-neutral-300 group-hover:bg-white/10 group-hover:text-white transition-all">
              <Users className="h-7 w-7" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white tracking-tight">
                My Circles
              </h2>
            </div>
          </div>
          <div className="mt-12 flex items-center gap-2 font-medium text-sm text-neutral-300 group-hover:text-white">
            <span>View circles</span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>
    </div>
  );
}
