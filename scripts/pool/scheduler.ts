import { createWalletClient, createPublicClient, http, getContract } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { foundry, baseSepolia } from "viem/chains";
import * as httpModule from "http";
import * as fs from "fs";
import * as path from "path";

// ABIs
const VAULT_ABI = [
  {
    type: "function",
    name: "currentCycle",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "phase",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "poolAmount",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "collect",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "settle",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "biddingModule",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "payout",
    inputs: [
      { name: "winner", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "creditDividend",
    inputs: [{ name: "totalDividend", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable"
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
    name: "hasWon",
    inputs: [{ name: "member", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view"
  }
] as const;

const BIDDING_ABI = [
  {
    type: "function",
    name: "openReveal",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "settle",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "bidPhase",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view"
  }
] as const;

const PhaseNames = ["NotStarted", "Collect", "Bidding", "Settle", "Completed"];

interface SchedulerState {
  isDemoMode: boolean;
  vaultAddress: `0x${string}`;
  currentCycle: number;
  phase: string;
  isWaiting: boolean;
  holdReason: string | null;
  lastAction: string | null;
  poolAmount: string;
}

let state: SchedulerState = {
  isDemoMode: process.env.DEMO_MODE !== "false",
  vaultAddress: "0x0000000000000000000000000000000000000000",
  currentCycle: 1,
  phase: "NotStarted",
  isWaiting: false,
  holdReason: null,
  lastAction: null,
  poolAmount: "0"
};

let continueResolver: (() => void) | null = null;

function waitForContinue(reason: string): Promise<void> {
  console.log(`\n⏸️  [DEMO HOLD] Paused: ${reason}`);
  console.log(`   👉 Use 'POST http://localhost:3001/continue' or click Continue in the Pool Dashboard.\n`);
  state.isWaiting = true;
  state.holdReason = reason;

  return new Promise((resolve) => {
    continueResolver = () => {
      console.log(`▶️  [DEMO RESUME] Continuing after HOLD: ${reason}`);
      state.isWaiting = false;
      state.holdReason = null;
      resolve();
    };
  });
}

function startHttpServer(port = 3001) {
  const server = httpModule.createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.method === "GET" && req.url === "/state") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(state, null, 2));
      return;
    }

    if (req.method === "POST" && req.url === "/continue") {
      if (continueResolver) {
        const fn = continueResolver;
        continueResolver = null;
        fn();
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, message: "HOLD released" }));
      } else {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, message: "Scheduler is not currently waiting on a HOLD" }));
      }
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not Found" }));
  });

  server.listen(port, () => {
    console.log(`[Scheduler Control Server] Listening on http://localhost:${port}`);
    console.log(`  - GET  /state    : Read current scheduler status`);
    console.log(`  - POST /continue : Trigger resume from DEMO HOLD\n`);
  });
}

async function main() {
  const rpcUrl = process.env.BASE_SEPOLIA_RPC_URL || "http://127.0.0.1:8545";
  const isLocal = rpcUrl.includes("127.0.0.1") || rpcUrl.includes("localhost");
  const chain = isLocal ? foundry : baseSepolia;

  const rawKey = process.env.SCHEDULER_PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
  const account = privateKeyToAccount((rawKey.startsWith("0x") ? rawKey : `0x${rawKey}`) as `0x${string}`);

  const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
  const walletClient = createWalletClient({ account, chain, transport: http(rpcUrl) });

  let vaultAddress = (process.env.VAULT_ADDRESS || process.argv[2]) as `0x${string}`;
  if (!vaultAddress) {
    const depPath = path.resolve(__dirname, "../../deployments/base-sepolia.json");
    if (fs.existsSync(depPath)) {
      const dep = JSON.parse(fs.readFileSync(depPath, "utf-8"));
      vaultAddress = dep.sampleVault as `0x${string}`;
    }
  }

  if (!vaultAddress) {
    console.error("Please provide vault address: npx tsx scripts/pool/scheduler.ts <VAULT_ADDRESS>");
    process.exit(1);
  }

  state.vaultAddress = vaultAddress;
  startHttpServer(3001);

  console.log(`[Scheduler Engine] Started for Vault: ${vaultAddress}`);
  console.log(`[Scheduler Engine] Operator Account: ${account.address}`);
  console.log(`[Scheduler Engine] Demo Mode: ${state.isDemoMode ? "ENABLED (HOLD active)" : "DISABLED (Real Windows)"}\n`);

  while (true) {
    try {
      const [cycleBig, phaseNum, poolAmt, biddingMod] = await Promise.all([
        publicClient.readContract({ address: vaultAddress, abi: VAULT_ABI, functionName: "currentCycle" }),
        publicClient.readContract({ address: vaultAddress, abi: VAULT_ABI, functionName: "phase" }),
        publicClient.readContract({ address: vaultAddress, abi: VAULT_ABI, functionName: "poolAmount" }),
        publicClient.readContract({ address: vaultAddress, abi: VAULT_ABI, functionName: "biddingModule" })
      ]);

      const cycle = Number(cycleBig);
      const phase = PhaseNames[phaseNum] || "Unknown";

      state.currentCycle = cycle;
      state.phase = phase;
      state.poolAmount = poolAmt.toString();

      console.log(`[Scheduler Tick] Cycle: ${cycle} | Phase: ${phase} | Pool: ${(Number(poolAmt) / 1e6).toLocaleString()} USDC`);

      if (phase === "Completed") {
        console.log(`\n🎉 Circle has COMPLETED all cycles! Scheduler done.`);
        break;
      }

      if (phase === "NotStarted") {
        console.log(`⏳ Vault is NotStarted. Waiting for start()...`);
        await new Promise((r) => setTimeout(r, 4000));
        continue;
      }

      if (phase === "Collect") {
        console.log(`📥 Phase is Collect. Waiting for contributions to gather...`);
        if (state.isDemoMode) {
          await waitForContinue("HOLD before ending Collect phase and opening Bidding");
        } else {
          await new Promise((r) => setTimeout(r, 10000));
        }

        console.log(`⚡ Calling vault.collect()...`);
        const tx = await walletClient.writeContract({
          address: vaultAddress,
          abi: VAULT_ABI,
          functionName: "collect",
          args: []
        });
        await publicClient.waitForTransactionReceipt({ hash: tx });
        console.log(`  ✓ vault.collect() succeeded! (Tx: ${tx.slice(0, 10)}...)`);
        state.lastAction = `vault.collect() at Cycle ${cycle}`;
        continue;
      }

      if (phase === "Bidding") {
        console.log(`🎯 Phase is Bidding. Managing BiddingModule lifecycle...`);

        const hasBiddingContract = biddingMod && biddingMod !== "0x0000000000000000000000000000000000000000";

        if (hasBiddingContract) {
          // 1. Open reveal
          if (state.isDemoMode) {
            await waitForContinue("HOLD before opening Reveal window in BiddingModule");
          }
          console.log(`⚡ Calling biddingModule.openReveal()...`);
          try {
            const txReveal = await walletClient.writeContract({
              address: biddingMod,
              abi: BIDDING_ABI,
              functionName: "openReveal",
              args: []
            });
            await publicClient.waitForTransactionReceipt({ hash: txReveal });
            console.log(`  ✓ bidding.openReveal() succeeded!`);
          } catch (e: any) {
            console.log(`  (openReveal note: ${e.message?.slice(0, 80)}...)`);
          }

          // 2. Settle bidding
          if (state.isDemoMode) {
            await waitForContinue("HOLD before settling BiddingModule");
          }
          console.log(`⚡ Calling biddingModule.settle()...`);
          try {
            const txSettle = await walletClient.writeContract({
              address: biddingMod,
              abi: BIDDING_ABI,
              functionName: "settle",
              args: []
            });
            await publicClient.waitForTransactionReceipt({ hash: txSettle });
            console.log(`  ✓ bidding.settle() succeeded!`);
          } catch (e: any) {
            console.log(`  (settle note: ${e.message?.slice(0, 80)}...)`);
          }
        } else {
          // Fallback mock bidding execution if Pranav's module is not yet connected
          console.log(`ℹ️  No external BiddingModule bound. Executing default mock payout for Demo...`);
          if (state.isDemoMode) {
            await waitForContinue("HOLD before mock payout and vault settlement");
          }
        }

        // 3. Settle vault cycle
        console.log(`⚡ Calling vault.settle() to advance cycle...`);
        const txVaultSettle = await walletClient.writeContract({
          address: vaultAddress,
          abi: VAULT_ABI,
          functionName: "settle",
          args: []
        });
        await publicClient.waitForTransactionReceipt({ hash: txVaultSettle });
        console.log(`  ✓ vault.settle() completed! (Tx: ${txVaultSettle.slice(0, 10)}...)`);
        state.lastAction = `vault.settle() at Cycle ${cycle}`;
        continue;
      }

      await new Promise((r) => setTimeout(r, 4000));
    } catch (err: any) {
      console.error(`Scheduler iteration error:`, err.message || err);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

export function getSchedulerState(): SchedulerState {
  return state;
}

export function advanceSchedulerState(): SchedulerState {
  if (continueResolver) {
    const fn = continueResolver;
    continueResolver = null;
    fn();
  }
  return state;
}

if (process.argv[1] && process.argv[1].endsWith("scheduler.ts")) {
  main().catch((err) => {
    console.error("Fatal scheduler error:", err);
    process.exit(1);
  });
}
