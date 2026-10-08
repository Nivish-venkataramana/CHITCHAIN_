"use client";

import React, { useState } from "react";
import { formatUnits6, parseUnits6 } from "../utils/crypto";
import { Lock, ShieldCheck, Sparkles, ArrowRight, AlertCircle, Info } from "lucide-react";

interface CommitScreenProps {
  circleId: string;
  cycle: number;
  poolAmount: string;
  userAddress: string;
  onCommit: (amountBaseUnits: bigint, salt: `0x${string}`) => Promise<void>;
}

export const CommitScreen: React.FC<CommitScreenProps> = ({
  circleId,
  cycle,
  poolAmount,
  userAddress,
  onCommit
}) => {
  const poolVal = BigInt(poolAmount);
  const minFloorVal = (poolVal * 5000n) / 10000n; // 50% floor

  const [bidInput, setBidInput] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const enteredBaseUnits = parseUnits6(bidInput);
  const isValid = enteredBaseUnits >= minFloorVal && enteredBaseUnits <= poolVal;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (enteredBaseUnits < minFloorVal) {
      setErrorMsg(`Bid must be at least 50% of the pool (${formatUnits6(minFloorVal)} USDC).`);
      return;
    }
    if (enteredBaseUnits > poolVal) {
      setErrorMsg(`Bid cannot exceed the total pool amount (${formatUnits6(poolVal)} USDC).`);
      return;
    }

    try {
      setIsSubmitting(true);
      // In demo mode or regular mode, onCommit handles salt generation/derivation and storage
      await onCommit(enteredBaseUnits, "0x0");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to commit bid");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-purple-900/40 border border-blue-500/20 rounded-2xl p-6 backdrop-blur-md shadow-xl text-white">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold tracking-wider text-blue-400 uppercase">
              Round {cycle} • Secret Auction
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-white">
              Commit Your Secret Bid
            </h2>
          </div>
          <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 text-blue-400">
            <Lock className="w-6 h-6" />
          </div>
        </div>

        {/* Pool Summary Stats */}
        <div className="grid grid-cols-2 gap-4 mt-6 pt-5 border-t border-white/10">
          <div>
            <div className="text-xs text-neutral-400">Total Round Pot</div>
            <div className="text-xl font-bold text-white mt-0.5">
              {formatUnits6(poolVal)} <span className="text-xs text-neutral-400 font-normal">USDC</span>
            </div>
          </div>
          <div>
            <div className="text-xs text-neutral-400">Minimum Bid Floor (50%)</div>
            <div className="text-xl font-bold text-emerald-400 mt-0.5">
              {formatUnits6(minFloorVal)} <span className="text-xs text-neutral-400 font-normal">USDC</span>
            </div>
          </div>
        </div>
      </div>

      {/* Secret Commit Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-6 shadow-2xl backdrop-blur-md space-y-5 text-neutral-100"
      >
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-2">
            Payout Amount You Bid to Accept
          </label>
          <div className="relative">
            <input
              type="number"
              step="any"
              min={Number(minFloorVal) / 1_000_000}
              max={Number(poolVal) / 1_000_000}
              placeholder={`e.g. ${formatUnits6(minFloorVal)} - ${formatUnits6(poolVal)}`}
              value={bidInput}
              onChange={(e) => {
                setBidInput(e.target.value);
                setErrorMsg(null);
              }}
              className="w-full bg-neutral-950/80 border border-neutral-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 py-3.5 text-lg font-mono text-white placeholder-neutral-500 outline-none transition-all pr-20"
              required
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-neutral-400">
              USDC
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-neutral-400 mt-2 px-1">
            <span>Floor: {formatUnits6(minFloorVal)} USDC</span>
            <span>Max: {formatUnits6(poolVal)} USDC</span>
          </div>
        </div>

        {/* Calculation preview */}
        {enteredBaseUnits > 0n && (
          <div className="bg-neutral-950/60 border border-neutral-800/80 rounded-xl p-4 space-y-2 text-xs">
            <div className="flex justify-between text-neutral-300">
              <span>If you win with this bid:</span>
              <span className="font-semibold text-white">{formatUnits6(enteredBaseUnits)} USDC payout</span>
            </div>
            <div className="flex justify-between text-neutral-400">
              <span>Dividend returned to circle pot:</span>
              <span className="font-semibold text-emerald-400">
                {enteredBaseUnits <= poolVal ? formatUnits6(poolVal - enteredBaseUnits) : "0"} USDC
              </span>
            </div>
          </div>
        )}

        {/* Security / Privacy notice */}
        <div className="bg-blue-950/30 border border-blue-800/30 rounded-xl p-3.5 flex items-start gap-3 text-xs text-blue-200">
          <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-blue-300">Cryptographic Privacy Guarantee:</span>{" "}
            Your bid amount is encrypted using a cryptographic commitment hash:
            <code className="block mt-1 font-mono text-[11px] text-blue-300 bg-blue-950/70 p-1.5 rounded">
              keccak256(bidAmount + salt + yourAddress)
            </code>
            No one—not even the vault contract—can see your bid amount before the Reveal phase.
          </div>
        </div>

        {/* Demo 1-Click Feature Tag */}
        <div className="bg-purple-950/30 border border-purple-800/30 rounded-xl p-3.5 flex items-start gap-3 text-xs text-purple-200">
          <Sparkles className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-purple-300">1-Click Reveal Protected:</span>{" "}
            Salt is deterministically backed by your wallet session so you will never lose your bid if local storage is cleared.
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-950/50 border border-red-800/50 rounded-xl flex items-center gap-2 text-xs text-red-300">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={!isValid || isSubmitting}
          className={`w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-lg ${
            isValid && !isSubmitting
              ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white cursor-pointer shadow-blue-500/20"
              : "bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700/50"
          }`}
        >
          {isSubmitting ? (
            <span>Hashing & Committing on-chain...</span>
          ) : (
            <>
              <span>Lock In Secret Bid</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
};
