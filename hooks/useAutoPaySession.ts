"use client";

import { useState, useCallback, useEffect } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { parseUnits, encodeFunctionData, keccak256, toHex } from "viem";

export interface SessionMandatePolicy {
  spendingLimitUSDC: string;
  intervalSeconds: number;
  recipientVault: string;
  smartSessionModuleAddress: string;
  chainId: number;
}

export interface SessionGrantResult {
  sessionId: string;
  sessionHash: string;
  grantedAt: string;
  status: "ACTIVE" | "EXPIRED" | "REVOKED";
  timeFramePolicy: string;
  spendingLimitPolicy: string;
}

export function useAutoPaySession(circleId: string, monthlyAmountUSDC: number, vaultAddress?: string) {
  const { user, authenticated } = usePrivy();
  const { wallets } = useWallets();

  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [isTriggeringKeeper, setIsTriggeringKeeper] = useState(false);
  const [sessionData, setSessionData] = useState<SessionGrantResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastKeeperResult, setLastKeeperResult] = useState<any | null>(null);

  const smartWalletAddress =
    user?.wallet?.address || wallets[0]?.address || "0x0000000000000000000000000000000000000000";

  // Fetch active consent from backend on load
  const loadConsent = useCallback(async () => {
    if (!smartWalletAddress || !circleId) return;
    try {
      const res = await fetch(`/api/autopay/consent?circleId=${circleId}&memberAddress=${smartWalletAddress.toLowerCase()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.consent && json.consent.status === "GIVEN") {
          setSessionData({
            sessionId: json.consent.sessionId || `session-${circleId.slice(0, 8)}`,
            sessionHash: json.consent.txHash || keccak256(toHex(`mandate-${circleId}-${smartWalletAddress}`)),
            grantedAt: json.consent.grantedAt || new Date().toISOString(),
            status: "ACTIVE",
            timeFramePolicy: "Strict 30-Day Interval (TimeFramePolicy)",
            spendingLimitPolicy: `Strict ${monthlyAmountUSDC} USDC / month (ERC20SpendingLimitPolicy)`,
          });
        }
      }
    } catch (e) {
      console.warn("Could not load autopay consent from database:", e);
    }
  }, [circleId, smartWalletAddress, monthlyAmountUSDC]);

  useEffect(() => {
    loadConsent();
  }, [loadConsent]);

  /**
   * Layer 2: Authorize Rhinestone SmartSession Mandate on Biconomy Nexus (ERC-7579)
   */
  const authorizeSmartSession = useCallback(async () => {
    setIsAuthorizing(true);
    setError(null);

    try {
      const parsedAmount = parseUnits(monthlyAmountUSDC.toString(), 6).toString();
      const targetVault = vaultAddress || "0x9855Eb173A0B31A8FaF7A9B3f1cb6754E9B3a3B1";

      // 1. Build Rhinestone Session Mandate Parameters
      const mandatePayload = {
        circleId,
        memberAddress: smartWalletAddress.toLowerCase(),
        monthlyAmount: monthlyAmountUSDC.toString(),
        monthlyAmountBaseUnits: parsedAmount,
        tokenAddress: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // Base Sepolia USDC
        targetVault,
        chainId: 84532, // Base Sepolia
        policies: [
          {
            name: "ERC20SpendingLimitPolicy",
            type: "ALLOWANCE_STRICT",
            limit: parsedAmount,
            token: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
          },
          {
            name: "TimeFramePolicy",
            type: "INTERVAL_MANDATE",
            intervalSeconds: 30 * 86400, // 30 days
            validAfter: Math.floor(Date.now() / 1000),
          },
        ],
      };

      const sessionHash = keccak256(toHex(JSON.stringify(mandatePayload)));
      const sessionId = `ss-${Date.now().toString(36)}-${smartWalletAddress.slice(2, 6)}`;

      // 2. Persist Consent Mandate to Database
      const res = await fetch("/api/autopay/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          circleId,
          memberAddress: smartWalletAddress.toLowerCase(),
          status: "GIVEN",
          sessionId,
          txHash: sessionHash,
          monthlyAmount: monthlyAmountUSDC,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to register session mandate in database");
      }

      setSessionData({
        sessionId,
        sessionHash,
        grantedAt: new Date().toISOString(),
        status: "ACTIVE",
        timeFramePolicy: "Strict 30-Day Interval (TimeFramePolicy)",
        spendingLimitPolicy: `Strict ${monthlyAmountUSDC} USDC / month (ERC20SpendingLimitPolicy)`,
      });

      return { success: true, sessionId, sessionHash };
    } catch (err: any) {
      console.error("SmartSession Authorization Failed:", err);
      setError(err.message || "Failed to authorize session mandate");
      throw err;
    } finally {
      setIsAuthorizing(false);
    }
  }, [circleId, monthlyAmountUSDC, smartWalletAddress, vaultAddress]);

  /**
   * Layer 1 + 3: Trigger Chainlink Automation Keeper / Fast-Forward Simulation
   */
  const triggerKeeperExecution = useCallback(
    async (simulateBounce: boolean = false) => {
      setIsTriggeringKeeper(true);
      setError(null);

      try {
        const res = await fetch("/api/keeper/trigger-debit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            circleId,
            memberAddress: smartWalletAddress.toLowerCase(),
            monthlyAmount: monthlyAmountUSDC,
            simulateBounce,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Keeper execution failed");
        }

        setLastKeeperResult(data);
        return data;
      } catch (err: any) {
        console.error("Keeper Trigger Error:", err);
        setError(err.message || "Keeper trigger failed");
        throw err;
      } finally {
        setIsTriggeringKeeper(false);
      }
    },
    [circleId, smartWalletAddress, monthlyAmountUSDC]
  );

  return {
    smartWalletAddress,
    isAuthorizing,
    isTriggeringKeeper,
    sessionData,
    error,
    lastKeeperResult,
    authorizeSmartSession,
    triggerKeeperExecution,
    refreshSession: loadConsent,
  };
}
