import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia, foundry } from "viem/chains";
import * as fs from "fs";
import * as path from "path";

function loadArtifact(name: string) {
  const artifactPath = path.resolve(__dirname, `../../contracts/artifacts/${name}.json`);
  if (!fs.existsSync(artifactPath)) {
    throw new Error(`Artifact ${name} not found. Run compile first.`);
  }
  return JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
}

async function main() {
  console.log("=================================================");
  console.log("      ChitChain Pool Contract Deployment        ");
  console.log("=================================================\n");

  const rpcUrl = process.env.BASE_SEPOLIA_RPC_URL || "http://127.0.0.1:8545";
  const isLocal = rpcUrl.includes("127.0.0.1") || rpcUrl.includes("localhost");
  const chain = isLocal ? foundry : baseSepolia;
  const chainId = isLocal ? 31337 : 84532;

  const rawKey = process.env.DEPLOYER_PRIVATE_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
  const account = privateKeyToAccount((rawKey.startsWith("0x") ? rawKey : `0x${rawKey}`) as `0x${string}`);

  console.log(`Network: ${isLocal ? "Anvil Local" : "Base Sepolia"}`);
  console.log(`Chain ID: ${chainId}`);
  console.log(`Deployer Address: ${account.address}\n`);

  const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
  const walletClient = createWalletClient({ account, chain, transport: http(rpcUrl) });

  const MockUSDCArtifact = loadArtifact("MockUSDC");
  const PoolVaultArtifact = loadArtifact("PoolVault");
  const CircleFactoryArtifact = loadArtifact("CircleFactory");

  // 1. Deploy MockUSDC
  console.log("1. Deploying MockUSDC (6 Decimals)...");
  const usdcHash = await walletClient.deployContract({
    abi: MockUSDCArtifact.abi,
    bytecode: MockUSDCArtifact.bytecode,
    args: []
  });
  const usdcReceipt = await publicClient.waitForTransactionReceipt({ hash: usdcHash });
  const usdcAddress = usdcReceipt.contractAddress!;
  console.log(`   ✓ MockUSDC deployed at: ${usdcAddress}`);

  // 2. Deploy PoolVault Implementation
  console.log("2. Deploying PoolVault Implementation...");
  const vaultImplHash = await walletClient.deployContract({
    abi: PoolVaultArtifact.abi,
    bytecode: PoolVaultArtifact.bytecode,
    args: []
  });
  const vaultImplReceipt = await publicClient.waitForTransactionReceipt({ hash: vaultImplHash });
  const vaultImplAddress = vaultImplReceipt.contractAddress!;
  console.log(`   ✓ PoolVault implementation deployed at: ${vaultImplAddress}`);

  // 3. Deploy CircleFactory
  console.log("3. Deploying CircleFactory...");
  const factoryHash = await walletClient.deployContract({
    abi: CircleFactoryArtifact.abi,
    bytecode: CircleFactoryArtifact.bytecode,
    args: [vaultImplAddress]
  });
  const factoryReceipt = await publicClient.waitForTransactionReceipt({ hash: factoryHash });
  const factoryAddress = factoryReceipt.contractAddress!;
  console.log(`   ✓ CircleFactory deployed at: ${factoryAddress}`);

  // 4. Save Deployment JSON
  const deploymentData = {
    chainId,
    network: isLocal ? "anvil-local" : "base-sepolia",
    mockUSDC: usdcAddress,
    poolVaultImplementation: vaultImplAddress,
    circleFactory: factoryAddress,
    deployedAt: new Date().toISOString()
  };

  const targetFile = isLocal
    ? path.resolve(__dirname, "../../deployments/anvil.json")
    : path.resolve(__dirname, "../../deployments/base-sepolia.json");

  fs.writeFileSync(targetFile, JSON.stringify(deploymentData, null, 2));
  console.log(`\nDeployment details written to: ${targetFile}`);

  console.log("\n=================================================");
  console.log("              DEPLOYMENT COMPLETE                ");
  console.log("=================================================\n");
}

main().catch((err) => {
  console.error("Deployment failed:", err);
  process.exit(1);
});
