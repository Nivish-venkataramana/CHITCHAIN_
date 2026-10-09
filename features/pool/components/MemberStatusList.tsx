"use client";

import React from "react";
import { PoolMember } from "../types";
import { Users, CheckCircle2, AlertTriangle, Clock, Trophy, UserCheck, Shield } from "lucide-react";

interface Props {
  members: PoolMember[];
  monthlyAmount: bigint;
  currentCycle: number;
}

export function MemberStatusList({ members, monthlyAmount, currentCycle }: Props) {
  const formattedMonthly = (Number(monthlyAmount) / 1e6).toLocaleString();

  const paidCount = members.filter((m) => m.hasPaid).length;
  const missedCount = members.filter((m) => m.hasMissed).length;
  const pendingCount = members.length - paidCount - missedCount;

  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 backdrop-blur-xl shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-100">Member Contributions</h3>
            <p className="text-xs text-slate-400">Payment status for Cycle {currentCycle} (Fixed: {formattedMonthly} USDC)</p>
          </div>
        </div>

        {/* Quick status counter */}
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
            Paid: {paidCount}
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
            Pending: {pendingCount}
          </span>
          {missedCount > 0 && (
            <span className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 font-medium">
              Missed: {missedCount}
            </span>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-800/50 text-xs uppercase text-slate-400 font-semibold border-b border-slate-800">
            <tr>
              <th className="py-3 px-4 rounded-l-lg">Member</th>
              <th className="py-3 px-4">Wallet Address</th>
              <th className="py-3 px-4">Contribution</th>
              <th className="py-3 px-4">Cycle {currentCycle} Status</th>
              <th className="py-3 px-4 rounded-r-lg text-right">Pot Winner</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40">
            {members.map((member, idx) => {
              const shortened = `${member.address.slice(0, 6)}...${member.address.slice(-4)}`;

              return (
                <tr key={member.address} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3.5 px-4 font-medium text-slate-200">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-inner">
                        {member.username ? member.username.slice(0, 2).toUpperCase() : `M${idx + 1}`}
                      </div>
                      <div>
                        <div className="font-semibold">{member.displayName || member.username || `Member ${idx + 1}`}</div>
                        {member.username && <div className="text-[11px] text-slate-400">@{member.username}</div>}
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 font-mono text-xs text-slate-400">
                    <span className="px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/50">{shortened}</span>
                  </td>

                  <td className="py-3.5 px-4 font-semibold text-slate-200">
                    {member.hasPaid ? `${formattedMonthly} USDC` : `0.00 USDC`}
                  </td>

                  <td className="py-3.5 px-4">
                    {member.hasPaid ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Contributed
                      </span>
                    ) : member.hasMissed ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        <AlertTriangle className="w-3.5 h-3.5" /> Missed Payment
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <Clock className="w-3.5 h-3.5" /> Autopay Pending
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    {member.hasWon ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <Trophy className="w-3.5 h-3.5" /> Won Prior Cycle
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500 font-medium">Eligible</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
