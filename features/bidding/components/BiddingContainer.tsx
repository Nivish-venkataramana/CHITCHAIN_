"use client";

import React, { useState, useEffect } from "react";
import { CommitScreen } from "./CommitScreen";
import { WaitingScreen } from "./WaitingScreen";
import { RevealScreen } from "./RevealScreen";
import { SettledScreen } from "./SettledScreen";
import { AlreadyWonScreen } from "./AlreadyWonScreen";
import { BiddingState, BidView } from "../types";
import { deriveDeterministicSalt, computeBidCommitment, formatUnits6 } from "../utils/crypto";
import { Shield, Sparkles, Layers, RefreshCw } from "lucide-react";

interface BiddingContainerProps {
  circleId?: string;
  initialState?: Partial<BiddingState>;
}

export const BiddingContainer: React.FC<BiddingContainerProps> = ({
  circleId = "sample-circle-01",
  initialState
}) => {
  const defaultUser = "0x1111111111111111111111111111111111111111" as `0x${string}`;

  const [state, setState] = useState<BiddingState>(() => {
    return {
      circle: {
        circleId,
        name: "Bangalore Web3 Builders Pot",
        currentCycle: 2,
        poolAmount: "5000000000", // 5000 USDC
        monthlyAmount: "1000000000", // 1000 USDC
        members: [
          "0x1111111111111111111111111111111111111111",
          "0x2222222222222222222222222222222222222222",
          "0x3333333333333333333333333333333333333333",
          "0x4444444444444444444444444444444444444444",
          "0x5555555555555555555555555555555555555555"
        ],
        durationMonths: 4
      },
      phase: "Commit",
      userAddress: defaultUser,
      hasWon: false,
      hasMissed: false,
      hasCommitted: false,
      hasRevealed: false,
      committedCount: 3,
      totalMembers: 5,
      bids: [
        {
          member: "0x2222222222222222222222222222222222222222",
          amount: "4100000000",
          revealed: false,
          committedAt: Date.now() - 3600000
        },
        {
          member: "0x3333333333333333333333333333333333333333",
          amount: "3800000000",
          revealed: false,
          committedAt: Date.now() - 7200000
        },
        {
          member: "0x4444444444444444444444444444444444444444",
          amount: "3500000000",
          revealed: false,
          committedAt: Date.now() - 1800000
        }
      ],
      ...initialState
    };
  });

  // Local storage sync for 1-Click Reveal
  useEffect(() => {
    try {
      const storageKey = `chitchain_bid_${state.circle.circleId}_${state.circle.currentCycle}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.bid) {
          setState((prev) => ({
            ...prev,
            userSavedBid: parsed.bid,
            userSavedSalt: parsed.salt,
            hasCommitted: true
          }));
        }
      }
    } catch (e) {}
  }, [state.circle.circleId, state.circle.currentCycle]);

  // Handle Commit
  const handleCommit = async (amountBaseUnits: bigint, customSalt?: `0x${string}`) => {
    // 1-Click Reveal deterministic salt
    const derivedSalt = deriveDeterministicSalt(
      state.circle.circleId,
      state.circle.currentCycle,
      state.userAddress
    );
    const saltToUse = customSalt && customSalt !== "0x0" ? customSalt : derivedSalt;
    const commitment = computeBidCommitment(
      amountBaseUnits,
      saltToUse,
      state.userAddress as `0x${string}`
    );

    // Save locally
    try {
      const storageKey = `chitchain_bid_${state.circle.circleId}_${state.circle.currentCycle}`;
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          bid: amountBaseUnits.toString(),
          salt: saltToUse,
          commitment
        })
      );
    } catch (e) {}

    // Update state
    setState((prev) => ({
      ...prev,
      hasCommitted: true,
      userSavedBid: amountBaseUnits.toString(),
      userSavedSalt: saltToUse,
      committedCount: prev.committedCount + 1,
      bids: [
        ...prev.bids.filter(
          (b) => b.member.toLowerCase() !== prev.userAddress.toLowerCase()
        ),
        {
          member: prev.userAddress,
          amount: amountBaseUnits.toString(),
          revealed: false,
          committedAt: Date.now()
        }
      ]
    }));
  };

  // Handle Reveal
  const handleReveal = async () => {
    // Deterministic salt lookup / re-derivation (works even if localStorage was wiped!)
    let bidToReveal = state.userSavedBid || "3500000000";
    let saltToReveal =
      state.userSavedSalt ||
      deriveDeterministicSalt(
        state.circle.circleId,
        state.circle.currentCycle,
        state.userAddress
      );

    // Mark other mock members as revealed for interactive simulation
    const updatedBids: BidView[] = state.bids.map((b) => {
      if (b.member.toLowerCase() === state.userAddress.toLowerCase()) {
        return { ...b, amount: bidToReveal, revealed: true };
      }
      return { ...b, revealed: true };
    });

    setState((prev) => ({
      ...prev,
      hasRevealed: true,
      bids: updatedBids
    }));
  };

  // Transition to Reveal
  const handleOpenReveal = () => {
    setState((prev) => ({
      ...prev,
      phase: "Reveal"
    }));
  };

  // Settle Round
  const handleSettle = () => {
    const revealedOnly = state.bids.filter((b) => b.revealed);
    if (revealedOnly.length === 0) {
      setState((prev) => ({
        ...prev,
        phase: "Settled",
        winner: "0x0000000000000000000000000000000000000000",
        winningBid: "0",
        dividendCarried: prev.circle.poolAmount,
        settleReason: "ROLLOVER_NO_BIDS"
      }));
      return;
    }

    // Find lowest valid bid
    let lowest = revealedOnly[0];
    for (const b of revealedOnly) {
      if (BigInt(b.amount) < BigInt(lowest.amount)) {
        lowest = b;
      }
    }

    const dividend = BigInt(state.circle.poolAmount) - BigInt(lowest.amount);

    setState((prev) => ({
      ...prev,
      phase: "Settled",
      winner: lowest.member,
      winningBid: lowest.amount,
      dividendCarried: dividend.toString(),
      settleReason: "LOWEST_BID"
    }));
  };

  const handleResetDemo = () => {
    try {
      const storageKey = `chitchain_bid_${state.circle.circleId}_${state.circle.currentCycle}`;
      localStorage.removeItem(storageKey);
    } catch (e) {}

    setState((prev) => ({
      ...prev,
      phase: "Commit",
      hasWon: false,
      hasCommitted: false,
      hasRevealed: false,
      committedCount: 3,
      userSavedBid: undefined,
      userSavedSalt: undefined,
      winner: undefined,
      winningBid: undefined,
      dividendCarried: undefined
    }));
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 py-10 px-4 sm:px-6 lg:px-8">
      {/* Interactive Phase Controller Toolbar (Demo Helper) */}
      <div className="max-w-3xl mx-auto mb-8 bg-neutral-900/90 border border-neutral-800 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-white uppercase tracking-wider">
              Bidding Module Live Controller
            </div>
            <div className="text-[11px] text-neutral-400">
              Switch phases or simulate scenarios
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setState((p) => ({ ...p, phase: "Commit", hasCommitted: false, hasRevealed: false }))}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              state.phase === "Commit" && !state.hasCommitted
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
            }`}
          >
            1. Commit Form
          </button>
          <button
            onClick={() => setState((p) => ({ ...p, phase: "Commit", hasCommitted: true }))}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              state.phase === "Commit" && state.hasCommitted
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
            }`}
          >
            2. Waiting
          </button>
          <button
            onClick={() => setState((p) => ({ ...p, phase: "Reveal", hasCommitted: true }))}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              state.phase === "Reveal"
                ? "bg-purple-600 text-white shadow-md shadow-purple-500/20"
                : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
            }`}
          >
            3. Reveal
          </button>
          <button
            onClick={handleSettle}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              state.phase === "Settled"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/20"
                : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
            }`}
          >
            4. Settled
          </button>
          <button
            onClick={() => setState((p) => ({ ...p, hasWon: !p.hasWon }))}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              state.hasWon
                ? "bg-amber-600 text-white"
                : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
            }`}
          >
            {state.hasWon ? "Already Won (Active)" : "Simulate Already Won"}
          </button>
        </div>
      </div>

      {/* Screen Render Switcher */}
      {state.hasWon ? (
        <AlreadyWonScreen
          cycle={state.circle.currentCycle}
          poolAmount={state.circle.poolAmount}
          monthlyAmount={state.circle.monthlyAmount}
        />
      ) : state.phase === "Settled" ? (
        <SettledScreen
          circleId={state.circle.circleId}
          cycle={state.circle.currentCycle}
          poolAmount={state.circle.poolAmount}
          winner={state.winner}
          winningBid={state.winningBid}
          dividendCarried={state.dividendCarried}
          settleReason={state.settleReason}
          bids={state.bids}
          userAddress={state.userAddress}
          onResetDemo={handleResetDemo}
        />
      ) : state.phase === "Reveal" ? (
        <RevealScreen
          circleId={state.circle.circleId}
          cycle={state.circle.currentCycle}
          poolAmount={state.circle.poolAmount}
          userAddress={state.userAddress}
          hasCommitted={state.hasCommitted}
          hasRevealed={state.hasRevealed}
          userSavedBid={state.userSavedBid}
          onReveal={handleReveal}
          onSettle={handleSettle}
        />
      ) : state.hasCommitted ? (
        <WaitingScreen
          cycle={state.circle.currentCycle}
          poolAmount={state.circle.poolAmount}
          committedCount={state.committedCount}
          totalMembers={state.totalMembers}
          userSavedBid={state.userSavedBid}
          userAddress={state.userAddress}
          onOpenReveal={handleOpenReveal}
        />
      ) : (
        <CommitScreen
          circleId={state.circle.circleId}
          cycle={state.circle.currentCycle}
          poolAmount={state.circle.poolAmount}
          userAddress={state.userAddress}
          onCommit={handleCommit}
        />
      )}
    </div>
  );
};
