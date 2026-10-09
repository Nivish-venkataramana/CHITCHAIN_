"use client";

import React from "react";
import { CheckCircle2, ShieldCheck, HeartHandshake } from "lucide-react";
import { formatUnits6 } from "../utils/crypto";

interface AlreadyWonScreenProps {
  cycle: number;
  poolAmount: string;
  monthlyAmount: string;
}

export const AlreadyWonScreen: React.FC<AlreadyWonScreenProps> = ({
  cycle,
  poolAmount,
  monthlyAmount
}) => {
  return (
    <div className="max-w-xl mx-auto space-y-6 text-neutral-100">
      <div className="bg-gradient-to-r from-emerald-950/30 via-neutral-900/60 to-blue-950/30 border border-emerald-500/20 rounded-2xl p-8 text-center space-y-4 backdrop-blur-md shadow-2xl">
        <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 mx-auto">
          <HeartHandshake className="w-8 h-8" />
        </div>

        <div className="space-y-1">
          <span className="text-xs font-semibold tracking-wider text-emerald-400 uppercase">
            Round {cycle} • Member Status
          </span>
          <h2 className="text-2xl font-bold text-white">
            Payout Already Received
          </h2>
        </div>

        <p className="text-sm text-neutral-300 max-w-md mx-auto leading-relaxed">
          You have already received your payout pot in a previous auction round. As a contributing member, your autopay mandate will continue pooling each month until the circle tenure finishes.
        </p>

        <div className="bg-neutral-950/70 border border-neutral-800 rounded-xl p-4 mt-6 text-left space-y-2 text-xs">
          <div className="flex justify-between text-neutral-300">
            <span>Your Monthly Autopay:</span>
            <span className="font-mono font-bold text-white">
              {formatUnits6(monthlyAmount)} USDC
            </span>
          </div>
          <div className="flex justify-between text-neutral-400">
            <span>Current Round Pot in Vault:</span>
            <span className="font-mono text-emerald-400">
              {formatUnits6(poolAmount)} USDC
            </span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-neutral-400 pt-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Fairness rule enforced: each member wins exactly once per circle.</span>
        </div>
      </div>
    </div>
  );
};
