import { simulateAaveYield } from "../lib/yield/calculator";
import { getLiveYieldState, recordLiveYieldAction, resetLiveYieldStore } from "../lib/yield/db-store";
import { fetchLiveAaveYieldState } from "../lib/yield/live-service";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

console.log("▶ Running Unit Tests for Mode A / Mode B Yield Isolation & Safe Failures...");

// 1. Simulation Isolation Test (Zero DB or Live State Side-effects)
{
  resetLiveYieldStore();
  const circleId = "test-isolated-circle-1";

  const initialLiveState = getLiveYieldState(circleId);
  assert(initialLiveState.status === "ACTIVE", "Initial state starts active in mock store");
  assert(initialLiveState.cumulativeSupplied === 0, "Initial supplied is 0");

  // Run multiple intense simulations
  const simResult = simulateAaveYield({
    monthlyContribution: 10000,
    annualPercentageRate: 8.08,
    durationMonths: 24,
    circleId,
  });

  // Verify simulation result is pure calculation
  assert(simResult.finalBalance > 250000, "Simulation produces calculated compound balance");
  assert(simResult.monthlySchedule.length === 24, "Simulation returns 24-month schedule");

  // Verify Live State was NOT modified by the simulation
  const afterSimLiveState = getLiveYieldState(circleId);
  assert(afterSimLiveState.cumulativeSupplied === 0, "Live cumulativeSupplied MUST remain 0 after simulation");
  assert(afterSimLiveState.currentStrategyValue === 0, "Live currentStrategyValue MUST remain 0 after simulation");
  assert(afterSimLiveState.recentTransactions.length === 0, "No fake transactions should be added by simulation");
}

// 2. Live State Action Integrity & Non-fabrication
{
  const circleId = "test-isolated-circle-2";

  // Simulate a live supply transaction recorded via real wallet execution
  const updatedState = recordLiveYieldAction({
    circleId,
    type: "SUPPLY",
    amount: 5000,
    txHash: "0x3a2b1c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b",
    userAddress: "0x1111111111111111111111111111111111111111",
  });

  assert(updatedState.cumulativeSupplied === 5000, "Cumulative supplied is now 5000");
  assert(updatedState.currentStrategyValue === 5000, "Strategy value is 5000");
  assert(updatedState.recentTransactions.length === 1, "Exactly 1 transaction recorded");
  assert(updatedState.recentTransactions[0].txHash.startsWith("0x"), "Real txHash recorded");
  assert(updatedState.recentTransactions[0].type === "SUPPLY", "Transaction type is SUPPLY");

  // Re-run simulation on the same circleId - it must NOT overwrite the live recorded state
  simulateAaveYield({
    monthlyContribution: 10000,
    annualPercentageRate: 8.08,
    durationMonths: 12,
    circleId,
  });

  const stateAfterAnotherSim = getLiveYieldState(circleId);
  assert(stateAfterAnotherSim.cumulativeSupplied === 5000, "Live supplied remains 5000 after simulation run");
  assert(stateAfterAnotherSim.recentTransactions.length === 1, "Recent transactions count remains 1");
}

// 3. Graceful fallback on unconfigured / unreachable live service
async function runAsyncIsolationTests() {
  const liveData = await fetchLiveAaveYieldState("unconfigured-circle-xyz");
  assert(liveData !== undefined && liveData !== null, "Live service returns a structured state");
  assert(typeof liveData.status === "string", "Status field is present");
  assert(typeof liveData.currentSupplyAPY === "number", "Variable supply APY is a number");
  console.log("✔ All Mode A / Mode B Yield Isolation Unit Tests PASSED Successfully!");
}

runAsyncIsolationTests().catch((err) => {
  console.error("Async test failed:", err);
  process.exit(1);
});

