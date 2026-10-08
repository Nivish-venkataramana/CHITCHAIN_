import { createWalletClient, createPublicClient, http, parseUnits, getContract } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia, foundry } from "viem/chains";
import * as fs from "fs";
import * as path from "path";

// MockUSDC ABI for minting
const MockUSDC_ABI = [
  {
    type: "function",
    name: "mint",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "decimals",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view"
  }
] as const;

async function main() {
  const rpcUrl = process.env.BASE_SEPOLIA_RPC_URL || "http://127.0.0.1:8545";
  const isLocal = rpcUrl.includes("127.0.0.1") || rpcUrl.includes("localhost");
  const chain = isLocal ? foundry : baseSepolia;

  // Default Anvil dev private key #0 if not set
  const rawKey = process.env.DEPLOYER_PRIVATE_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
  const formattedKey = (rawKey.startsWith("0x") ? rawKey : `0x${rawKey}`) as `0x${string}`;
  const account = privateKeyToAccount(formattedKey);

  const tokenAddress = (process.env.NEXT_PUBLIC_MOCK_USDC_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3") as `0x${string}`;

  console.log(`[Fund Demo Accounts] Using RPC: ${rpcUrl}`);
  console.log(`[Fund Demo Accounts] Deployer / Minting Account: ${account.address}`);
  console.log(`[Fund Demo Accounts] MockUSDC Address: ${tokenAddress}`);

  const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
  const walletClient = createWalletClient({ account, chain, transport: http(rpcUrl) });

  // Read fixture users
  const fixturesPath = path.resolve(__dirname, "../../handoffs/fixtures/users.json");
  const users = JSON.parse(fs.readFileSync(fixturesPath, "utf-8"));

  // Mint 10,000 USDC (10,000 * 10^6 base units)
  const mintAmount = BigInt("10000000000");

  console.log(`\nFound ${users.length} fixture users to fund with 10,000 USDC each...\n`);

  for (const user of users) {
    const targetAddress = user.walletAddress as `0x${string}`;
    console.log(`Funding ${user.username} (${user.displayName}) at ${targetAddress}...`);

    try {
      const hash = await walletClient.writeContract({
        address: tokenAddress,
        abi: MockUSDC_ABI,
        functionName: "mint",
        args: [targetAddress, mintAmount]
      });

      await publicClient.waitForTransactionReceipt({ hash });

      const balance = await publicClient.readContract({
        address: tokenAddress,
        abi: MockUSDC_ABI,
        functionName: "balanceOf",
        args: [targetAddress]
      });

      console.log(`  ✓ Minted! New Balance: ${(Number(balance) / 1e6).toLocaleString()} USDC (Tx: ${hash.slice(0, 10)}...)`);
    } catch (err: any) {
      console.error(`  ✗ Failed to fund ${user.username}:`, err.message || err);
    }
  }

  console.log("\n[Fund Demo Accounts] Finished successfully.");
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
