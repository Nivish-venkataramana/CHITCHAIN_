import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";

const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";

export const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(rpcUrl),
});

export const BASE_SEPOLIA_CHAIN_ID = 84532;
