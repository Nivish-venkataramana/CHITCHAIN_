"use client";

import React from "react";
import { Hourglass, Lock, ShieldCheck, CheckCircle2, RefreshCw } from "lucide-react";
import { formatUnits6 } from "../utils/crypto";

interface WaitingScreenProps {
  cycle: number;
  poolAmount: string;
  committedCount: number;
  totalMembers: number;
  userSavedBid?: string;
  userAddress: string;
  onOpenReveal?: () => void;
  isAdmin?: boolean;
}

export const WaitingScreen: React.FC<WaitingScreenProps> = ({
  cycle,
  poolAmount,
  committedCount,
  totalMembers,
  userSavedBid,
  userAddress,
  onOpenReveal,
  isAdmin = true
}) => {
  const percentCommitted = Math.round((committedCount / (totalMembers || 1)) * 100);

  return (
    <div className="max-w-xl mx-auto space-y-6 text-neutral-100">
      {/* Status Card */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-6 shadow-2xl backdrop-blur-md space-y-6 text-center">
        <div className="mx-auto w-16 h-16 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400">
          <Hourglass className="w-8 h-8 animate-pulse" />
        </div>

        <div className="space-y-1.5">
          <span className="text-xs font-semibold tracking-wider text-blue-400 uppercase">
            Round {cycle} • Commit Phase Open
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Bid Successfully Committed!
          </h2>
          <p className="text-sm text-neutral-400 max-w-md mx-auto">
            Your secret bid is safely sealed on-chain. Waiting for all members to finish committing before the Reveal phase opens.
          </p>
        </div>

        {/* Member Commit Counter Progress */}
        <div className="bg-neutral-950/80 border border-neutral-800/80 rounded-2xl p-5 space-y-3 text-left">
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-300 font-medium">Member Commitments</span>
            <span className="font-mono font-bold text-blue-400">
              {committedCount} of {totalMembers} committed
            </span>
          </div>

          <div className="w-full h-3 bg-neutral-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-500"
              style={{ width: `${Math.min(percentCommitted, 100)}%` }}
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-neutral-400 pt-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Zero bid amounts leaked. Only anonymous commitment counts are visible.</span>
          </div>
        </div>

        {/* Local Sealed Bid Info */}
        {userSavedBid && (
          <div className="bg-neutral-950/50 border border-neutral-800/60 rounded-xl p-4 text-xs text-left space-y-1.5">
            <div className="text-neutral-400 font-medium flex items-center justify-between">
              <span>Your Sealed Bid (Stored Locally / Deterministic):</span>
              <span className="text-blue-400 font-mono font-bold">
                {formatUnits6(userSavedBid)} USDC
              </span>
            </div>
            <div className="text-[11px] text-neutral-500">
              When Reveal opens, your bid will be unsealed in 1-Click.
            </div>
          </div>
        )}

        {/* Admin/Demo Scheduler Trigger */}
        {isAdmin && onOpenReveal && (
          <div className="pt-2 border-t border-neutral-800/80">
            <button
              onClick={onOpenReveal}
              className="w-full py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all border border-neutral-700/80"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>(Demo / Scheduler) Open Reveal Phase</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
