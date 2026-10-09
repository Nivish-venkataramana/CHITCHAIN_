import {
  reconcileStrategyAccounting,
  fromTokenBaseUnits,
  toTokenBaseUnits,
} from "../lib/yield/reconciliation";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

function assertCloseTo(actual: number, expected: number, tolerance = 0.001, message = "") {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(
      `Assertion Failed: Expected ${expected} ± ${tolerance}, got ${actual}. ${message}`
    );
  }
}

console.log("▶ Running Unit Tests for ChitChain Aave Yield Reconciliation Engine...");

// 1. Exact Cash Flow Reconciliation Specification Test: 10,120 + 5,000 - 15,000 = 120 USDC
{
  const report = reconcileStrategyAccounting({
    cumulativeSupplies: 15000,
    cumulativeWithdrawals: 5000,
    currentPositionValue: 10120,
    strategyHeldIdle: 0,
  });

  assert(report.totalSuppliedPrincipal === 15000, "Supplied principal must be 15,000");
  assert(report.totalWithdrawnPrincipal === 5000, "Withdrawn principal must be 5,000");
  assert(report.currentStrategyValue === 10120, "Current strategy value must be 10,120");
  assert(report.netStrategyGain === 120, "Net strategy gain must be exactly 120 USDC");
  assert(report.isProfit === true, "isProfit must be true");
  assertCloseTo(report.gainPercentage, 0.8, 0.01, "Gain % must be (120/15000)*100 = 0.8%");
}

// 2. Multi-step lifecycle with strategyHeldIdle
{
  const report = reconcileStrategyAccounting({
    cumulativeSupplies: 50000,
    cumulativeWithdrawals: 20000,
    currentPositionValue: 30450.50,
    strategyHeldIdle: 500,
  });

  // Current value = 30450.50 + 500 = 30950.50
  // Net gain = 30950.50 + 20000 - 50000 = 950.50
  assert(report.currentStrategyValue === 30950.5, "Total value includes idle token in strategy");
  assertCloseTo(report.netStrategyGain, 950.50, 0.001, "Net strategy gain must be 950.50 USDC");
  assert(report.isProfit === true, "Must be profitable");
}

// 3. Loss scenario verification
{
  const reportLoss = reconcileStrategyAccounting({
    cumulativeSupplies: 10000,
    cumulativeWithdrawals: 0,
    currentPositionValue: 9800,
    strategyHeldIdle: 0,
  });

  assert(reportLoss.netStrategyGain === -200, "Net gain should be -200 USDC");
  assert(reportLoss.isProfit === false, "isProfit must be false on loss");
  assertCloseTo(reportLoss.gainPercentage, -2.0, 0.01, "Gain % should be -2%");
}

// 4. Base unit conversions and 6-decimal rounding
{
  const base1 = toTokenBaseUnits(100.5, 6);
  assert(base1 === "100500000", "100.5 USDC to 6 decimals base units is 100500000");

  const human1 = fromTokenBaseUnits("100500000", 6);
  assert(human1 === 100.5, "100500000 base units should format back to 100.5");

  const baseZero = toTokenBaseUnits(0, 6);
  assert(baseZero === "0", "0 should return '0'");

  const baseNegative = toTokenBaseUnits(-10, 6);
  assert(baseNegative === "0", "Negative amount to base units must safe floor to '0'");

  const humanInvalid = fromTokenBaseUnits("invalid", 6);
  assert(humanInvalid === 0, "Invalid string must fallback to 0 safely");
}

console.log("✔ All Yield Reconciliation Unit Tests PASSED Successfully!");
