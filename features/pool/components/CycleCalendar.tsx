"use client";

import React from "react";
import { CycleSchedule } from "../types";
import { Calendar, CheckCircle2, Clock, Trophy, ArrowRight } from "lucide-react";

interface Props {
  schedule: CycleSchedule[];
  currentCycle: number;
}

export function CycleCalendar({ schedule, currentCycle }: Props) {
  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 backdrop-blur-xl shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-100">Cycle Timeline & Calendar</h3>
            <p className="text-xs text-slate-400">Monthly pool collection on the 1st & secret bidding at month-end</p>
          </div>
        </div>
        <span className="text-xs font-medium px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
          Total Cycles: {schedule.length}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {schedule.map((c) => {
          const isActive = c.cycleNumber === currentCycle;
          const isCompleted = c.cycleNumber < currentCycle;

          return (
            <div
              key={c.cycleNumber}
              className={`relative flex flex-col justify-between p-5 rounded-xl border transition-all duration-200 ${
                isActive
                  ? "bg-gradient-to-b from-blue-950/40 to-slate-900 border-blue-500/50 shadow-lg shadow-blue-500/10 ring-1 ring-blue-500/30"
                  : isCompleted
                  ? "bg-slate-900/40 border-slate-800/60 opacity-80"
                  : "bg-slate-900/20 border-slate-800/40"
              }`}
            >
              {isActive && (
                <div className="absolute -top-2.5 right-4 px-2.5 py-0.5 rounded-full bg-blue-600 text-[10px] font-bold text-white uppercase tracking-wider shadow">
                  Current Cycle
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold text-slate-200">
                    Month {c.cycleNumber}
                  </span>
                  {isCompleted ? (
                    <span className="flex items-center gap-1 text-xs font-medium text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Done
                    </span>
                  ) : isActive ? (
                    <span className="flex items-center gap-1 text-xs font-medium text-blue-400 animate-pulse">
                      <Clock className="w-3.5 h-3.5" /> Active
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500 font-medium">Upcoming</span>
                  )}
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between py-1 px-2 rounded bg-slate-800/40">
                    <span className="text-slate-400">Pool Collect:</span>
                    <span className="font-semibold text-slate-200">{c.collectionDate}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 px-2 rounded bg-slate-800/40">
                    <span className="text-slate-400">Bid Date:</span>
                    <span className="font-semibold text-slate-200">{c.biddingDate}</span>
                  </div>
                </div>
              </div>

              {c.winningBid !== undefined && c.winningBid > 0n && (
                <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs">
                  <span className="text-amber-400/90 flex items-center gap-1 font-medium">
                    <Trophy className="w-3.5 h-3.5" /> Winning Bid
                  </span>
                  <span className="font-mono font-bold text-slate-200">
                    {(Number(c.winningBid) / 1e6).toLocaleString()} USDC
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
