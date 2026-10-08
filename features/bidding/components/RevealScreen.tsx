"use client";

import React, { useState } from "react";
import { AlertTriangle, Eye, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";
import { formatUnits6 } from "../utils/crypto";

interface RevealScreenProps {
  circleId: string;
  cycle: number;
  poolAmount: string;
  userAddress: string;
  hasCommitted: boolean;
  hasRevealed: boolean;
  userSavedBid?: string;
  onReveal: () => Promise<void>;
  onSettle?: () => void;
  isAdmin?: boolean;
}

export const RevealScreen: React.FC<RevealScreenProps> = ({
  circleId,
  cycle,
  poolAmount,
  userAddress,
  hasCommitted,
  hasRevealed,
  userSavedBid,
  onReveal,
  onSettle,
  isAdmin = true
}) => {
  const [isRevealing, setIsRevealing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRevealClick = async () => {
    setErrorMsg(null);
    try {
      setIsRevealing(true);
      await onReveal();
    } catch (err: any) {
      setErrorMsg(err.message || "Reveal transaction failed");
    } finally {
      setIsRevealing(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 text-neutral-100">
      {/* Prominent Warning Banner */}
      <div className="bg-amber-950/40 border border-amber-500/30 rounded-2xl p-5 backdrop-blur-md space-y-3">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-amber-500/20 rounded-xl text-amber-400 shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-amber-200 text-sm">
              ACTION REQUIRED: Reveal Phase is Open
            </h4>
            <p className="text-xs text-amber-300/80 mt-1 leading-relaxed">
              <strong>CRITICAL RULE:</strong> Any bids not revealed during this window will be permanently <span className="underline font-semibold">discarded</span> and disqualified from winning the round.
            </p>
          </div>
        </div>
      </div>

      {/* Main Reveal Action Card */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-6 shadow-2xl backdrop-blur-md space-y-6">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
          <div>
            <span className="text-xs font-semibold tracking-wider text-purple-400 uppercase">
              Round {cycle} • Reveal Window
            </span>
            <h2 className="text-xl font-bold text-white mt-0.5">
              Unseal & Verify Your Bid
            </h2>
          </div>
          <div className="p-2.5 bg-purple-500/10 rounded-xl border border-purple-500/20 text-purple-400">
            <Eye className="w-5 h-5" />
          </div>
        </div>

        {hasRevealed ? (
          <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-6 text-center space-y-3">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-emerald-200">
              Bid Successfully Revealed!
            </h3>
            <p className="text-xs text-emerald-300/80 max-w-sm mx-auto">
              Your bid of <span className="font-mono font-bold text-white">{userSavedBid ? formatUnits6(userSavedBid) : "..."} USDC</span> is now verified on-chain. Waiting for settlement.
            </p>
          </div>
        ) : !hasCommitted ? (
          <div className="bg-neutral-950/60 border border-neutral-800 rounded-2xl p-6 text-center space-y-2 text-neutral-400">
            <p className="text-sm">You did not submit a commitment in the commit phase for this cycle.</p>
            <p className="text-xs text-neutral-500">You can participate as a bidder in the next round.</p>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="bg-neutral-950/80 border border-neutral-800 rounded-xl p-4 space-y-2 text-xs">
              <div className="flex justify-between text-neutral-400">
                <span>Committed Bid Amount:</span>
                <span className="font-mono font-bold text-white text-sm">
                  {userSavedBid ? `${formatUnits6(userSavedBid)} USDC` : "Derived via Wallet"}
                </span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Pool Total:</span>
                <span className="font-mono text-neutral-200">{formatUnits6(poolAmount)} USDC</span>
              </div>
            </div>

            {/* 1-Click Reveal Guarantee */}
            <div className="bg-purple-950/20 border border-purple-800/30 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-purple-200">
              <Sparkles className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
              <span>
                <strong>1-Click Reveal:</strong> Your cryptographic salt is verified with your deterministic wallet key.
              </span>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-950/50 border border-red-800/50 rounded-xl flex items-center gap-2 text-xs text-red-300">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              onClick={handleRevealClick}
              disabled={isRevealing}
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-500/20 cursor-pointer"
            >
              {isRevealing ? (
                <span>Submitting 1-Click Reveal...</span>
              ) : (
                <>
                  <Eye className="w-4 h-4" />
                  <span>1-Click Reveal Bid</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Demo Settle Button */}
        {isAdmin && onSettle && (
          <div className="pt-2 border-t border-neutral-800">
            <button
              onClick={onSettle}
              className="w-full py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl text-xs font-semibold transition-all border border-neutral-700/80 cursor-pointer"
            >
              (Demo / Scheduler) Settle Round & Pick Winner
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
