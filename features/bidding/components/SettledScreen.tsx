"use client";

import React from "react";
import { Trophy, ArrowDownRight, Users, Ban, Sparkles, CheckCircle2, RotateCcw } from "lucide-react";
import { BidView } from "../types";
import { formatUnits6 } from "../utils/crypto";

interface SettledScreenProps {
  circleId: string;
  cycle: number;
  poolAmount: string;
  winner?: string;
  winningBid?: string;
  dividendCarried?: string;
  settleReason?: "LOWEST_BID" | "TIE_EARLIEST_COMMIT" | "ROLLOVER_NO_BIDS";
  bids: BidView[];
  userAddress: string;
  onResetDemo?: () => void;
}

export const SettledScreen: React.FC<SettledScreenProps> = ({
  circleId,
  cycle,
  poolAmount,
  winner,
  winningBid,
  dividendCarried,
  settleReason = "LOWEST_BID",
  bids,
  userAddress,
  onResetDemo
}) => {
  const isRollover = !winner || winner === "0x0000000000000000000000000000000000000000";
  const isUserWinner = !isRollover && winner.toLowerCase() === userAddress.toLowerCase();

  const getReasonBadge = () => {
    switch (settleReason) {
      case "TIE_EARLIEST_COMMIT":
        return "Tie-breaker: Won by earliest commit timestamp";
      case "ROLLOVER_NO_BIDS":
        return "No bids revealed: 100% pool rolled over as dividend";
      default:
        return "Lowest Valid Bid";
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 text-neutral-100">
      {/* Winner Highlight Card */}
      {isRollover ? (
        <div className="bg-gradient-to-r from-amber-950/40 via-neutral-900/50 to-amber-950/40 border border-amber-500/30 rounded-2xl p-6 text-center space-y-3 backdrop-blur-md">
          <div className="w-14 h-14 bg-amber-500/20 rounded-2xl flex items-center justify-center text-amber-400 mx-auto">
            <RotateCcw className="w-7 h-7" />
          </div>
          <div>
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
              Round {cycle} • Rollover
            </span>
            <h2 className="text-2xl font-bold text-white mt-1">
              No Valid Bids Revealed
            </h2>
          </div>
          <p className="text-xs text-neutral-300 max-w-md mx-auto">
            The full pot of <span className="font-bold text-white">{formatUnits6(poolAmount)} USDC</span> has rolled over into next month&apos;s pool as a dividend.
          </p>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-emerald-950/40 via-indigo-950/30 to-purple-950/40 border border-emerald-500/30 rounded-2xl p-6 backdrop-blur-md shadow-2xl relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                  Round {cycle} • Auction Settled
                </span>
                <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/30 rounded-full text-[10px] font-medium text-emerald-300">
                  {getReasonBadge()}
                </span>
              </div>
              <h2 className="text-2xl font-bold text-white">
                {isUserWinner ? "🎉 Congratulations, You Won!" : "Round Winner Selected"}
              </h2>
            </div>
            <div className="p-3 bg-emerald-500/20 rounded-2xl text-emerald-400 border border-emerald-500/30">
              <Trophy className="w-7 h-7" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-5 border-t border-white/10">
            <div>
              <div className="text-xs text-neutral-400">Winning Member</div>
              <div className="font-mono text-xs font-bold text-white mt-1 truncate" title={winner}>
                {winner ? `${winner.slice(0, 6)}...${winner.slice(-4)}` : "None"}
                {isUserWinner && <span className="ml-1 text-emerald-400">(You)</span>}
              </div>
            </div>
            <div>
              <div className="text-xs text-neutral-400">Payout Sent</div>
              <div className="text-lg font-bold text-emerald-400 mt-0.5">
                {winningBid ? formatUnits6(winningBid) : "0"}{" "}
                <span className="text-xs font-normal text-neutral-400">USDC</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-neutral-400">Dividend Carried</div>
              <div className="text-lg font-bold text-purple-400 mt-0.5">
                {dividendCarried ? formatUnits6(dividendCarried) : "0"}{" "}
                <span className="text-xs font-normal text-neutral-400">USDC</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full Revealed Bids List */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-6 shadow-xl backdrop-blur-md space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-neutral-400" />
            <h3 className="font-bold text-white text-base">All Revealed Bids</h3>
          </div>
          <span className="text-xs text-neutral-400 font-mono">
            {bids.filter((b) => b.revealed).length} of {bids.length} revealed
          </span>
        </div>

        {bids.length === 0 ? (
          <div className="text-center py-8 text-neutral-500 text-sm">
            No bids recorded for this round.
          </div>
        ) : (
          <div className="divide-y divide-neutral-800/80">
            {bids
              .sort((a, b) => {
                if (a.revealed && !b.revealed) return -1;
                if (!a.revealed && b.revealed) return 1;
                if (a.revealed && b.revealed) {
                  return Number(BigInt(a.amount || "0") - BigInt(b.amount || "0"));
                }
                return 0;
              })
              .map((bid, idx) => {
                const isWinner =
                  !isRollover &&
                  bid.revealed &&
                  bid.member.toLowerCase() === winner?.toLowerCase();

                return (
                  <div
                    key={bid.member}
                    className={`py-3.5 px-3 rounded-xl flex items-center justify-between transition-colors ${
                      isWinner
                        ? "bg-emerald-950/30 border border-emerald-500/20"
                        : "hover:bg-neutral-800/40"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-mono ${
                          isWinner
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : "bg-neutral-800 text-neutral-400"
                        }`}
                      >
                        {idx + 1}
                      </div>
                      <div>
                        <div className="text-xs font-mono text-neutral-200 flex items-center gap-1.5">
                          <span>
                            {bid.member.slice(0, 6)}...{bid.member.slice(-4)}
                          </span>
                          {bid.member.toLowerCase() === userAddress.toLowerCase() && (
                            <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.2 rounded font-sans">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-neutral-500 mt-0.5">
                          {bid.revealed ? "Valid Reveal" : "Unrevealed / Discarded"}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      {bid.revealed ? (
                        <div>
                          <div className="text-sm font-bold font-mono text-white">
                            {formatUnits6(bid.amount)} USDC
                          </div>
                          {isWinner && (
                            <div className="text-[10px] text-emerald-400 font-semibold flex items-center justify-end gap-1">
                              <Trophy className="w-3 h-3" /> Winner
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                          <Ban className="w-3.5 h-3.5 text-amber-500/60" />
                          <span>Discarded</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        {onResetDemo && (
          <div className="pt-4 border-t border-neutral-800">
            <button
              onClick={onResetDemo}
              className="w-full py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs font-semibold transition-all border border-neutral-700"
            >
              (Demo Control) Reset Bidding Round Simulation
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
