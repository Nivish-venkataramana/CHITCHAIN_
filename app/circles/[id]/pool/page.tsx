"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Play, Coins, Calendar, CheckCircle2 } from "lucide-react";

export default function PoolVaultPage() {
  const params = useParams();
  const circleId = params.id as string;

  return (
    <div className="max-w-3xl mx-auto py-6 space-y-6">
      <Link
        href={`/circles/${circleId}`}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to circle
      </Link>

      <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
              <Coins className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Pool Vault &amp; Cycle Clock</h1>
              <p className="text-xs text-slate-500">
                [Nivish Slice: PoolVault minimal proxy, monthly pool accounting &amp; scheduler]
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
            Cycle 1 / 3 • Phase: Collect
          </span>
        </div>

        {/* Pool Stats */}
        <div className="grid grid-cols-3 gap-4 bg-slate-50 rounded-2xl p-4 border text-center">
          <div>
            <span className="text-xs text-slate-500 block">Total Pool in Vault</span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">4,000 USDC</span>
          </div>
          <div>
            <span className="text-xs text-slate-500 block">Carried Dividend</span>
            <span className="text-2xl font-black text-emerald-600 mt-1 block">0 USDC</span>
          </div>
          <div>
            <span className="text-xs text-slate-500 block">Next Auction Date</span>
            <span className="text-2xl font-black text-purple-600 mt-1 block">Jan 31</span>
          </div>
        </div>

        {/* Demo Mode Admin Scheduler Panel */}
        <div className="rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/50 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
              <Play className="h-3.5 w-3.5 text-blue-600" />
              Demo Mode Scheduler Control (DEMO_MODE=true)
            </h3>
            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
              HOLD: Awaiting Continue
            </span>
          </div>
          <p className="text-xs text-blue-800">
            Current status: Contributions collected. Ready to transition from <strong>Collect</strong> to <strong>Bidding (Commit)</strong>.
          </p>
          <button className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow transition-colors">
            Continue to Next Phase (Commit Bids) →
          </button>
        </div>
      </div>
    </div>
  );
}
