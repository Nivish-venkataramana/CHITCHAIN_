"use client";

import { useState, useEffect, useCallback } from "react";
import { PoolVaultState, PoolMember, CycleSchedule, SchedulerState } from "../types";

export function usePoolData(circleId: string, initialVaultAddress?: string) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [poolState, setPoolState] = useState<PoolVaultState | null>(null);
  const [schedule, setSchedule] = useState<CycleSchedule[]>([]);
  const [schedulerState, setSchedulerState] = useState<SchedulerState | null>(null);

  const fetchSchedulerStatus = useCallback(async () => {
    try {
      const res = await fetch("http://localhost:3001/state", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setSchedulerState(data);
      }
    } catch {
      // Scheduler not running locally, ignore
    }
  }, []);

  const triggerSchedulerContinue = async () => {
    try {
      const res = await fetch("http://localhost:3001/continue", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      const data = await res.json();
      await fetchSchedulerStatus();
      return data;
    } catch (e: any) {
      throw new Error("Failed to reach scheduler at http://localhost:3001");
    }
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // Default fixture state if on-chain RPC is not connected
      const defaultState: PoolVaultState = {
        vaultAddress: (initialVaultAddress || "0x9876543210987654321098765432109876543210") as `0x${string}`,
        circleId: circleId || "circle-demo-1",
        name: "Bangalore Techies Chit Fund",
        volunteer: "0x1111111111111111111111111111111111111111",
        monthlyAmount: BigInt("1000000000"), // 1000 USDC
        durationMonths: 4,
        currentCycle: 2,
        phase: "Collect",
        poolAmount: BigInt("4200000000"), // 3000 contribution + 1200 dividend
        carriedDividend: BigInt("1200000000"),
        tokenAddress: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
        tokenSymbol: "USDC",
        tokenDecimals: 6,
        isDemoMode: true,
        members: [
          {
            address: "0x1111111111111111111111111111111111111111",
            username: "asharao01",
            displayName: "Asha Rao (Volunteer)",
            hasPaid: true,
            hasMissed: false,
            hasWon: true,
            amountContributed: BigInt("1000000000")
          },
          {
            address: "0x2222222222222222222222222222222222222222",
            username: "vikramnair02",
            displayName: "Vikram Nair",
            hasPaid: true,
            hasMissed: false,
            hasWon: false,
            amountContributed: BigInt("1000000000")
          },
          {
            address: "0x3333333333333333333333333333333333333333",
            username: "meerajoshi03",
            displayName: "Meera Joshi",
            hasPaid: true,
            hasMissed: false,
            hasWon: false,
            amountContributed: BigInt("1000000000")
          },
          {
            address: "0x4444444444444444444444444444444444444444",
            username: "rohandas04",
            displayName: "Rohan Das",
            hasPaid: false,
            hasMissed: false,
            hasWon: false,
            amountContributed: BigInt("0")
          },
          {
            address: "0x5555555555555555555555555555555555555555",
            username: "kavyareddy05",
            displayName: "Kavya Reddy",
            hasPaid: false,
            hasMissed: true,
            hasWon: false,
            amountContributed: BigInt("0")
          }
        ]
      };

      const cycleSchedules: CycleSchedule[] = [
        {
          cycleNumber: 1,
          collectionDate: "Jan 1, 2026",
          biddingDate: "Jan 31, 2026",
          isPast: true,
          isCurrent: false,
          isUpcoming: false,
          status: "Completed",
          poolAmount: BigInt("5000000000"),
          winningBid: BigInt("3800000000"),
          winnerAddress: "0x1111111111111111111111111111111111111111"
        },
        {
          cycleNumber: 2,
          collectionDate: "Feb 1, 2026",
          biddingDate: "Feb 28, 2026",
          isPast: false,
          isCurrent: true,
          isUpcoming: false,
          status: "Active",
          poolAmount: BigInt("4200000000")
        },
        {
          cycleNumber: 3,
          collectionDate: "Mar 1, 2026",
          biddingDate: "Mar 31, 2026",
          isPast: false,
          isCurrent: false,
          isUpcoming: true,
          status: "Upcoming"
        },
        {
          cycleNumber: 4,
          collectionDate: "Apr 1, 2026",
          biddingDate: "Apr 30, 2026",
          isPast: false,
          isCurrent: false,
          isUpcoming: true,
          status: "Upcoming"
        }
      ];

      setPoolState(defaultState);
      setSchedule(cycleSchedules);
      setError(null);
    } catch (e: any) {
      setError(e.message || "Failed to load pool data");
    } finally {
      setLoading(false);
    }
  }, [circleId, initialVaultAddress]);

  useEffect(() => {
    loadData();
    fetchSchedulerStatus();
    const interval = setInterval(() => {
      fetchSchedulerStatus();
    }, 2500);
    return () => clearInterval(interval);
  }, [loadData, fetchSchedulerStatus]);

  return {
    loading,
    error,
    poolState,
    schedule,
    schedulerState,
    refresh: loadData,
    triggerSchedulerContinue
  };
}
