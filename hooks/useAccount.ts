"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { usePrivy, useWallets, getAccessToken } from "@privy-io/react-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getAddress, formatUnits, parseUnits } from "viem";
import { publicClient, BASE_SEPOLIA_CHAIN_ID } from "@/lib/publicClient";
import { UserProfile } from "@/handoffs/user-profile";
import deployments from "@/deployments/base-sepolia.json";

export type AccountState = "loading" | "loggedOut" | "needsProfile" | "ready";

const USDC_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "decimals",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
] as const;

export function useAccount() {
  const queryClient = useQueryClient();
  const {
    ready: privyReady,
    authenticated,
    user: privyUser,
    login: privyLogin,
    logout: privyLogout,
  } = usePrivy();

  const { ready: walletsReady, wallets } = useWallets();

  const [chainError, setChainError] = useState<string | null>(null);

  const ready = privyReady && walletsReady;

  // Find active embedded or connected wallet
  const embeddedWallet = useMemo(() => {
    if (!ready || !wallets.length) return null;
    return (
      wallets.find((w) => w.walletClientType === "privy") ||
      wallets[0] ||
      null
    );
  }, [ready, wallets]);

  const rawAddress = embeddedWallet?.address || privyUser?.wallet?.address;

  // Normalization: lowercased for DB storage, checksummed for UI display
  const address = useMemo(() => {
    if (!rawAddress) return null;
    try {
      return {
        lowercase: rawAddress.toLowerCase() as `0x${string}`,
        checksummed: getAddress(rawAddress) as `0x${string}`,
      };
    } catch {
      return {
        lowercase: rawAddress.toLowerCase() as `0x${string}`,
        checksummed: rawAddress as `0x${string}`,
      };
    }
  }, [rawAddress]);

  // Handle chain verification and auto-switching to Base Sepolia (84532)
  useEffect(() => {
    if (!ready || !embeddedWallet) return;

    const targetChainId = `eip155:${BASE_SEPOLIA_CHAIN_ID}`;
    const numericChainId = Number(embeddedWallet.chainId.replace("eip155:", ""));

    if (numericChainId !== BASE_SEPOLIA_CHAIN_ID) {
      setChainError(`Wallet connected to wrong network (${numericChainId || embeddedWallet.chainId}). Switching to Base Sepolia (84532)...`);
      embeddedWallet
        .switchChain(BASE_SEPOLIA_CHAIN_ID)
        .then(() => {
          setChainError(null);
        })
        .catch((err: any) => {
          console.error("Failed to switch network to Base Sepolia:", err);
          setChainError(
            `Please switch your wallet network to Base Sepolia (Chain ID ${BASE_SEPOLIA_CHAIN_ID}). ${err?.message || ""}`
          );
        });
    } else {
      setChainError(null);
    }
  }, [ready, embeddedWallet, embeddedWallet?.chainId]);

  // Fetch session profile
  const {
    data: profile,
    isLoading: isProfileLoading,
    refetch: refetchProfile,
  } = useQuery<UserProfile | null>({
    queryKey: ["account-session", rawAddress],
    queryFn: async () => {
      if (!authenticated) return null;

      try {
        const token = await getAccessToken();
        const headers: Record<string, string> = {};
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const res = await fetch("/api/session", { headers });
        if (res.status === 401 || res.status === 404) {
          return null;
        }
        if (!res.ok) {
          throw new Error("Failed to fetch user session");
        }
        return await res.json();
      } catch (err) {
        console.error("Session lookup error:", err);
        return null;
      }
    },
    enabled: ready && authenticated,
  });

  // Fetch USDC token balance (6 decimals)
  const mockUSDCAddress = (
    process.env.NEXT_PUBLIC_MOCK_USDC_ADDRESS ||
    deployments.mockUSDC ||
    "0x0000000000000000000000000000000000000000"
  ) as `0x${string}`;

  const {
    data: usdcData,
    isLoading: isBalanceLoading,
    refetch: refetchBalance,
  } = useQuery<{ balanceBaseUnits: bigint; formatted: string }>({
    queryKey: ["usdc-balance", address?.lowercase],
    queryFn: async () => {
      if (!address?.lowercase) {
        return { balanceBaseUnits: 0n, formatted: "0.00" };
      }

      try {
        if (
          mockUSDCAddress &&
          mockUSDCAddress !== "0x0000000000000000000000000000000000000000"
        ) {
          const bal = (await publicClient.readContract({
            address: mockUSDCAddress,
            abi: USDC_ABI,
            functionName: "balanceOf",
            args: [address.lowercase],
          })) as bigint;

          return {
            balanceBaseUnits: bal,
            formatted: formatUnits(bal, 6),
          };
        }
      } catch (e) {
        console.warn("Direct RPC balance query error, falling back:", e);
      }

      return { balanceBaseUnits: 0n, formatted: "0.00" };
    },
    enabled: ready && !!address?.lowercase,
    refetchInterval: 10000,
  });

  // Calculate high-level state
  const state: AccountState = useMemo(() => {
    if (!ready || (authenticated && isProfileLoading)) {
      return "loading";
    }
    if (!authenticated || !rawAddress) {
      return "loggedOut";
    }
    if (profile) {
      return "ready";
    }
    return "needsProfile";
  }, [ready, authenticated, isProfileLoading, rawAddress, profile]);

  const logout = useCallback(async () => {
    await privyLogout();
    queryClient.clear();
    setChainError(null);
  }, [privyLogout, queryClient]);

  const login = useCallback(async () => {
    privyLogin();
  }, [privyLogin]);

  return {
    state,
    ready,
    authenticated,
    address,
    walletAddress: address?.lowercase || null,
    displayAddress: address?.checksummed || null,
    profile: profile || null,
    embeddedWallet,
    chainError,
    chainId: BASE_SEPOLIA_CHAIN_ID,
    balance: usdcData?.formatted || "0.00",
    balanceBaseUnits: usdcData?.balanceBaseUnits || 0n,
    login,
    logout,
    refetchBalance,
    refetchProfile,
  };
}
