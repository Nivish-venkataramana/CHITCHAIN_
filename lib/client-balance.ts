import { createPublicClient, http, formatUnits, erc20Abi } from "viem";
import { baseSepolia } from "viem/chains";

export const BASE_SEPOLIA_USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

export const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org", {
    timeout: 2000,
    retryCount: 0,
  }),
});

interface CacheEntry {
  balance: number;
  timestamp: number;
}

const balanceCache: Record<string, CacheEntry> = {};
const inFlightPromises: Record<string, Promise<number>> = {};

export async function fetchLiveBalanceUSDC(walletAddress: string, username?: string): Promise<number> {
  const norm = (walletAddress || "").toLowerCase().trim();
  if (!norm || !/^0x[a-f0-9]{40}$/i.test(norm)) return 0;

  const now = Date.now();
  const cached = balanceCache[norm];
  // 15-second TTL cache for instant UI rendering without RPC lag
  if (cached && now - cached.timestamp < 15000) {
    return cached.balance;
  }

  if (inFlightPromises[norm]) {
    return inFlightPromises[norm];
  }

  const promise = (async () => {
    try {
      const raw = await publicClient.readContract({
        address: BASE_SEPOLIA_USDC,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [norm as `0x${string}`],
      });
      const parsed = Number(formatUnits(raw, 6));
      balanceCache[norm] = { balance: parsed, timestamp: Date.now() };
      return parsed;
    } catch {
      if (cached) return cached.balance;
      if (username) {
        try {
          const res = await fetch("/api/account/faucet", { headers: { "x-dev-user": username } });
          const data = await res.json();
          const parsed = Number(data?.balanceUSDC || 0);
          balanceCache[norm] = { balance: parsed, timestamp: Date.now() };
          return parsed;
        } catch {}
      }
      return 0;
    } finally {
      delete inFlightPromises[norm];
    }
  })();

  inFlightPromises[norm] = promise;
  return promise;
}
