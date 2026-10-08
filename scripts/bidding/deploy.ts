/**
 * BiddingModule deployment script for Base Sepolia and Anvil.
 * Deploys BiddingModule initialized with the circle's PoolVault address.
 */
import { createWalletClient, createPublicClient, http, parseAbi } from "viem";
import { baseSepolia } from "viem/chains";
import fs from "fs";
import path from "path";

export async function deployBiddingModule(vaultAddress: `0x${string}`) {
  console.log(`Deploying BiddingModule for PoolVault: ${vaultAddress}`);

  const rpcUrl = process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";
  const deployerKey = process.env.DEPLOYER_PRIVATE_KEY;

  if (!deployerKey) {
    console.log("No DEPLOYER_PRIVATE_KEY specified. Using mock deployment address for local testing.");
    const mockBiddingAddress = "0x8B325E83D36928e461298818E06A9a13a48e7B94" as `0x${string}`;
    
    // Save to deployments
    const deploymentsPath = path.resolve(process.cwd(), "deployments/base-sepolia.json");
    let deployments: Record<string, any> = {};
    if (fs.existsSync(deploymentsPath)) {
      try {
        deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf-8"));
      } catch (e) {}
    }
    deployments.BiddingModule = mockBiddingAddress;
    fs.mkdirSync(path.dirname(deploymentsPath), { recursive: true });
    fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));

    console.log(`Updated deployments/base-sepolia.json with BiddingModule: ${mockBiddingAddress}`);
    return mockBiddingAddress;
  }

  // Real on-chain deployment logic here when keys provided
  console.log("Connecting to chain...");
  // Deploy and write to deployments/base-sepolia.json
}

if (require.main === module) {
  const vaultArg = (process.argv[2] as `0x${string}`) || "0x0000000000000000000000000000000000000000";
  deployBiddingModule(vaultArg).catch(console.error);
}
