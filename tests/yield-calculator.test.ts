import {
  simulateAaveYield,
  calculateInvestableSurplus,
  calculateMonthlyRateFromApr,
  calculateExpectedYieldOverDays,
} from "../lib/yield/calculator";
import { AAVE_CONFIG_BASE_SEPOLIA } from "../lib/yield/types";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

function assertCloseTo(actual: number, expected: number, tolerance = 0.05, message = "") {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(
      `Assertion Failed: Expected ${expected} ± ${tolerance}, got ${actual}. ${message}`
    );
  }
}

console.log("▶ Running Unit Tests for ChitChain Aave Yield Calculator & Simulation Engine...");

// 1. Exact 24-Month Benchmark Test
{
  const result24 = simulateAaveYield({
    monthlyContribution: 10000,
    annualPercentageRate: 8.08,
    durationMonths: 24,
    circleId: "test-benchmark-circle",
  });

  console.log(`  - 24M Benchmark Result: Final Balance = $${result24.finalBalance.toFixed(2)}, Earned = $${result24.totalInterestEarned.toFixed(2)}`);

  assertCloseTo(result24.finalBalance, 259601.93, 0.05, "Final balance must match $259,601.93 standard benchmark");
  assertCloseTo(result24.totalPrincipal, 240000, 0.01, "Total principal for 24mo x $10k must be $240,000");
  assertCloseTo(result24.totalInterestEarned, 19601.93, 0.05, "Interest earned must match $19,601.93");
  assert(result24.monthlySchedule.length === 24, "Monthly schedule must contain exactly 24 entries");

  // Verify month 1 numbers (ordinary annuity deposit arrives at end of month)
  const m1 = result24.monthlySchedule[0];
  assert(m1.month === 1, "First month must be 1");
  assert(m1.deposit === 10000, "First deposit must be 10000");
  assert(m1.cumulativePrincipal === 10000, "Month 1 principal is 10000");
  assert(m1.interestEarned >= 0, "Month 1 interest earned is non-negative");

  // Verify month 2 numbers (earns compounding interest on month 1)
  const m2 = result24.monthlySchedule[1];
  assert(m2.interestEarned > 0, "Month 2 interest earned must be positive");

  // Verify month 24 numbers
  const m24 = result24.monthlySchedule[23];
  assert(m24.month === 24, "Last month must be 24");
  assert(m24.cumulativePrincipal === 240000, "Month 24 principal is 240000");
  assertCloseTo(m24.endingBalance, 259601.93, 0.05, "Month 24 ending balance must match final balance");
}

// 2. Scenario Horizon Tests (1mo, 6mo, 12mo)
{
  const r1 = simulateAaveYield({
    monthlyContribution: 10000,
    annualPercentageRate: 8.08,
    durationMonths: 1,
  });
  assert(r1.monthlySchedule.length === 1, "1mo schedule length must be 1");
  assert(r1.totalPrincipal === 10000, "1mo principal must be 10000");
  assert(r1.finalBalance === 10000, "1mo ending balance equals initial deposit");


  const r6 = simulateAaveYield({
    monthlyContribution: 10000,
    annualPercentageRate: 8.08,
    durationMonths: 6,
  });
  assert(r6.monthlySchedule.length === 6, "6mo schedule length must be 6");
  assert(r6.totalPrincipal === 60000, "6mo principal must be 60000");
  assert(r6.totalInterestEarned > 0, "6mo interest must be positive");

  const r12 = simulateAaveYield({
    monthlyContribution: 10000,
    annualPercentageRate: 8.08,
    durationMonths: 12,
  });
  assert(r12.monthlySchedule.length === 12, "12mo schedule length must be 12");
  assert(r12.totalPrincipal === 120000, "12mo principal must be 120000");
  assert(r12.totalInterestEarned > r6.totalInterestEarned, "12mo interest must exceed 6mo interest");
}

// 3. 0% Interest Rate Edge Case
{
  const rZero = simulateAaveYield({
    monthlyContribution: 5000,
    annualPercentageRate: 0,
    durationMonths: 12,
  });
  assert(rZero.totalPrincipal === 60000, "0% interest principal must be 60000");
  assert(rZero.totalInterestEarned === 0, "0% interest earned must be 0");
  assert(rZero.finalBalance === 60000, "0% final balance must equal principal");
}

// 4. Rate Conversion Formula Verification
{
  const rate808 = calculateMonthlyRateFromApr(8.08);
  // (1 + 0.0808/365)^(365/12) - 1 = approx 0.006753
  assertCloseTo(rate808, 0.006753, 0.0001, "Effective monthly compounding rate from 8.08% APR");

  const expected7d = calculateExpectedYieldOverDays(100000, 5.24, 7);
  // 100000 * ((1 + 0.0524/365)^7 - 1) approx 100.51
  assertCloseTo(expected7d, 100.51, 0.1, "7-day expected yield on $100k at 5.24% APR");
}

// 5. Investable Surplus & Buffer Constraints
{
  const surplus1 = calculateInvestableSurplus(10000, 2000, 1000);
  assert(surplus1 === 7000, "Surplus = 10000 - 2000 - 1000 = 7000");

  const surplusNegative = calculateInvestableSurplus(1000, 2000, 1000);
  assert(surplusNegative === 0, "Surplus cannot be negative, must floor at 0");

  const surplusZero = calculateInvestableSurplus(0, 0, 0);
  assert(surplusZero === 0, "Zero vault balance yields zero surplus");
}

console.log("✔ All Yield Calculator & Simulation Unit Tests PASSED Successfully!");
