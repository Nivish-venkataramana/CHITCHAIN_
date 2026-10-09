"use client";

import React, { useState } from "react";
import { SchedulerState } from "../types";
import { Play, PauseCircle, Activity, RefreshCw, Check, AlertCircle, FastForward } from "lucide-react";

interface Props {
  schedulerState: SchedulerState | null;
  onContinue: () => Promise<any>;
}

export function DemoAdminPanel({ schedulerState, onContinue }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleContinueClick = async () => {
    try {
      setSubmitting(true);
      setFeedback(null);
      const res = await onContinue();
      setFeedback(res.message || "HOLD released successfully!");
      setTimeout(() => setFeedback(null), 4000);
    } catch (e: any) {
      setFeedback(e.message || "Error triggering continue");
    } finally {
      setSubmitting(false);
    }
  };

  const isConnected = !!schedulerState;
  const isWaiting = schedulerState?.isWaiting;

  return (
    <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-950/20 via-slate-900/80 to-slate-900/80 p-6 backdrop-blur-xl shadow-xl">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="flex h-2.5 w-2.5 relative">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isConnected ? "bg-emerald-400" : "bg-slate-400"}`}></span>
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isConnected ? "bg-emerald-500" : "bg-slate-500"}`}></span>
            </span>
            <h4 className="text-sm font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
              <Activity className="w-4 h-4" /> Demo Mode Administrator Controls
            </h4>
          </div>
          <p className="text-xs text-slate-300">
            {isWaiting ? (
              <span className="text-amber-200 font-semibold flex items-center gap-1">
                <PauseCircle className="w-3.5 h-3.5 text-amber-400" />
                Paused at HOLD: {schedulerState?.holdReason}
              </span>
            ) : isConnected ? (
              <span className="text-slate-400">
                Scheduler running (Cycle {schedulerState?.currentCycle}, Phase: {schedulerState?.phase}). Ready for next transition.
              </span>
            ) : (
              <span className="text-slate-400">
                Scheduler offline or running standalone. Connect `npx tsx scripts/pool/scheduler.ts` for live HOLD/Continue hooks.
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {feedback && (
            <span className="text-xs font-medium px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {feedback}
            </span>
          )}

          <button
            onClick={handleContinueClick}
            disabled={submitting || (!isWaiting && isConnected)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs tracking-wide uppercase transition-all shadow-lg ${
              isWaiting
                ? "bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 shadow-amber-500/20 ring-2 ring-amber-400/50 cursor-pointer animate-bounce"
                : "bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-750"
            }`}
          >
            {submitting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <FastForward className="w-4 h-4" />
            )}
            <span>Continue Step ▶</span>
          </button>
        </div>
      </div>
    </div>
  );
}
