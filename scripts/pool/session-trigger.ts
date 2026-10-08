import { createWalletClient, createPublicClient, http, custom } from "viem";
import { foundry, baseSepolia } from "viem/chains";
import * as fs from "fs";
import * as path from "path";

// ABIs
const ERC20_ABI = [
  {
    type: "function",
    name: "transfer",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view"
  }
] as const;

const VAULT_ABI = [
  {
    type: "function",
    name: "recordContribution",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "monthlyAmount",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "currentCycle",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "members",
    inputs: [],
    outputs: [{ name: "", type: "address[]" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "token",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "hasPaidCycle",
    inputs: [
      { name: "cycle", type: "uint256" },
      { name: "member", type: "address" }
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "hasMissed",
    inputs: [{ name: "member", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view"
  }
] as const;

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed: { vault?: string; skip?: string[]; rpcUrl?: string } = { skip: [] };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--vault" && args[i + 1]) {
      parsed.vault = args[++i];
    } else if (args[i] === "--skip" && args[i + 1]) {
      parsed.skip!.push(args[++i].toLowerCase());
    } else if (args[i] === "--rpc" && args[i + 1]) {
      parsed.rpcUrl = args[++i];
    }
  }
  return parsed;
}

async function main() {
  const { vault: vaultArg, skip = [], rpcUrl = "http://127.0.0.1:8545" } = parseArgs();

  const publicClient = createPublicClient({ chain: foundry, transport: http(rpcUrl) });

  let vaultAddress = vaultArg as `0x${string}`;
  if (!vaultAddress) {
    // Check deployments or fallback
    const deploymentsPath = path.resolve(__dirname, "../../deployments/base-sepolia.json");
    if (fs.existsSync(deploymentsPath)) {
      const deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf-8"));
      vaultAddress = deployments.sampleVault as `0x${string}`;
    }
  }

  if (!vaultAddress) {
    console.error("Error: --vault <address> parameter required.");
    process.exit(1);
  }

  console.log(`[Mock Session Trigger] Connecting to Anvil at ${rpcUrl}`);
  console.log(`[Mock Session Trigger] Vault Address: ${vaultAddress}`);
  if (skip.length > 0) {
    console.log(`[Mock Session Trigger] Skipping members: ${skip.join(", ")}`);
  }

  const [members, tokenAddress, monthlyAmount, currentCycle] = await Promise.all([
    publicClient.readContract({ address: vaultAddress, abi: VAULT_ABI, functionName: "members" }),
    publicClient.readContract({ address: vaultAddress, abi: VAULT_ABI, functionName: "token" }),
    publicClient.readContract({ address: vaultAddress, abi: VAULT_ABI, functionName: "monthlyAmount" }),
    publicClient.readContract({ address: vaultAddress, abi: VAULT_ABI, functionName: "currentCycle" })
  ]);

  console.log(`\nCircle Info:`);
  console.log(`  Cycle: ${currentCycle}`);
  console.log(`  Monthly Amount: ${(Number(monthlyAmount) / 1e6).toLocaleString()} USDC`);
  console.log(`  Token: ${tokenAddress}`);
  console.log(`  Members Count: ${members.length}\n`);

  for (let i = 0; i < members.length; i++) {
    const member = members[i];
    const memberLower = member.toLowerCase();

    console.log(`[Member ${i + 1}/${members.length}] ${member}:`);

    if (skip.includes(memberLower)) {
      console.log(`  ⚠️ SKIPPED due to --skip flag (Simulating Missed Payment)`);
      continue;
    }

    const [hasPaid, hasMissed] = await Promise.all([
      publicClient.readContract({ address: vaultAddress, abi: VAULT_ABI, functionName: "hasPaidCycle", args: [currentCycle, member] }),
      publicClient.readContract({ address: vaultAddress, abi: VAULT_ABI, functionName: "hasMissed", args: [member] })
    ]);

    if (hasPaid) {
      console.log(`  ✓ Already contributed for Cycle ${currentCycle}`);
      continue;
    }

    if (hasMissed) {
      console.log(`  ❌ Flagged as hasMissed in past cycles. Cannot contribute.`);
      continue;
    }

    try {
      // Impersonate account on Anvil
      await fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "anvil_impersonateAccount",
          params: [member],
          id: 1
        })
      });

      // Also ensure the member has gas for the simulation
      await fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "anvil_setBalance",
          params: [member, "0x56BC75E2D63100000"], // 100 ETH
          id: 2
        })
      });

      const memberWalletClient = createWalletClient({
        account: member,
        chain: foundry,
        transport: http(rpcUrl)
      });

      // 1. Transfer monthly amount to vault
      console.log(`  Step 1: Transferring ${(Number(monthlyAmount) / 1e6).toLocaleString()} USDC to vault...`);
      const transferHash = await memberWalletClient.writeContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [vaultAddress, monthlyAmount]
      });
      await publicClient.waitForTransactionReceipt({ hash: transferHash });
      console.log(`    Transfer Tx: ${transferHash.slice(0, 10)}...`);

      // 2. Call recordContribution() on vault
      console.log(`  Step 2: Calling vault.recordContribution()...`);
      const recordHash = await memberWalletClient.writeContract({
        address: vaultAddress,
        abi: VAULT_ABI,
        functionName: "recordContribution",
        args: []
      });
      await publicClient.waitForTransactionReceipt({ hash: recordHash });
      console.log(`    ✓ Contribution recorded! Tx: ${recordHash.slice(0, 10)}...`);

      // Stop impersonating
      await fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "anvil_stopImpersonatingAccount",
          params: [member],
          id: 3
        })
      });
    } catch (err: any) {
      console.error(`  ❌ Error processing contribution for ${member}:`, err.message || err);
    }
  }

  console.log(`\n[Mock Session Trigger] Batch execution completed.`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
