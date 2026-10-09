import { SimulationScenarioConfig, SimulationResult, SimulationMonthRecord } from "./types";

/**
 * Calculates effective monthly compounding rate from nominal annual APR.
 * Using standard 365-day daily compounding convention:
 * monthlyRate = (1 + APR / 365) ** (365 / 12) - 1
 */
export function calculateEffectiveMonthlyRate(apr: number): number {
  if (apr <= 0) return 0;
  const daysPerMonth = 365 / 12;
  const dailyRate = apr / 365;
  return Math.pow(1 + dailyRate, daysPerMonth) - 1;
}

/**
 * Closed-form Future Value (FV) of an annuity with regular monthly contributions and daily compounding.
 * For End-of-Month timing:
 * FV = P * (((1 + r)^n - 1) / r)
 * For Beginning-of-Month timing:
 * FV = P * (((1 + r)^n - 1) / r) * (1 + r)
 */
export function calculateAnnuityFutureValue(
  monthlyContribution: number,
  months: number,
  apr: number,
  timing: "END_OF_MONTH" | "BEGINNING_OF_MONTH" = "END_OF_MONTH"
): { totalContributions: number; futureValue: number; totalInterest: number } {
  const totalContributions = monthlyContribution * months;
  if (months <= 0 || monthlyContribution <= 0) {
    return { totalContributions: 0, futureValue: 0, totalInterest: 0 };
  }

  const r = calculateEffectiveMonthlyRate(apr);
  if (r <= 0) {
    return {
      totalContributions,
      futureValue: totalContributions,
      totalInterest: 0,
    };
  }

  let fv = monthlyContribution * ((Math.pow(1 + r, months) - 1) / r);
  if (timing === "BEGINNING_OF_MONTH") {
    fv *= 1 + r;
  }

  return {
    totalContributions,
    futureValue: Number(fv.toFixed(2)),
    totalInterest: Number((fv - totalContributions).toFixed(2)),
  };
}

/**
 * Runs a deterministic simulation scenario month by month, generating an exact financial ledger.
 */
export function runDeterministicSimulation(config: SimulationScenarioConfig): SimulationResult {
  const {
    monthlyContribution,
    durationMonths,
    hypotheticalAPR,
    depositTiming = "END_OF_MONTH",
    withdrawals = [],
  } = config;

  const monthlyRate = calculateEffectiveMonthlyRate(hypotheticalAPR);
  const monthlyLedger: SimulationMonthRecord[] = [];

  let currentBalance = 0;
  let cumulativeContributions = 0;
  let cumulativeInterest = 0;

  const withdrawalMap = new Map<number, number>();
  for (const w of withdrawals) {
    withdrawalMap.set(w.month, (withdrawalMap.get(w.month) || 0) + w.amount);
  }

  const startDate = new Date();

  for (let m = 1; m <= durationMonths; m++) {
    const openingBalance = currentBalance;
    const requestedWithdrawal = withdrawalMap.get(m) || 0;

    let deposit = monthlyContribution;
    let interest = 0;
    let withdrawal = 0;

    if (depositTiming === "BEGINNING_OF_MONTH") {
      // Deposit earns interest for the full month
      const balanceBeforeInterest = openingBalance + deposit;
      interest = balanceBeforeInterest * monthlyRate;
      const balanceAfterInterest = balanceBeforeInterest + interest;

      withdrawal = Math.min(requestedWithdrawal, balanceAfterInterest);
      currentBalance = balanceAfterInterest - withdrawal;
    } else {
      // END_OF_MONTH: Only existing balance earns interest; new deposit added at month end
      interest = openingBalance * monthlyRate;
      const balanceAfterInterest = openingBalance + interest;

      withdrawal = Math.min(requestedWithdrawal, balanceAfterInterest);
      currentBalance = balanceAfterInterest - withdrawal + deposit;
    }

    cumulativeContributions += deposit;
    cumulativeInterest += interest;

    const vDate = new Date(startDate);
    vDate.setMonth(vDate.getMonth() + m - 1);
    const dateStr = vDate.toLocaleDateString("en-US", { month: "short", year: "numeric" });

    monthlyLedger.push({
      month: m,
      virtualDate: dateStr,
      openingBalance: Number(openingBalance.toFixed(2)),
      newContribution: Number(deposit.toFixed(2)),
      simulatedInterest: Number(interest.toFixed(2)),
      withdrawal: Number(withdrawal.toFixed(2)),
      closingBalance: Number(currentBalance.toFixed(2)),
      cumulativeContributions: Number(cumulativeContributions.toFixed(2)),
      cumulativeInterest: Number(cumulativeInterest.toFixed(2)),
    });
  }

  const projectedFinalValue = Number(currentBalance.toFixed(2));
  const projectedTotalInterest = Number(cumulativeInterest.toFixed(2));
  const effectiveAnnualYield = hypotheticalAPR > 0 ? (Math.pow(1 + hypotheticalAPR / 365, 365) - 1) : 0;

  return {
    mode: "SIMULATION",
    scenario: config,
    totalContributions: Number(cumulativeContributions.toFixed(2)),
    projectedFinalValue,
    projectedTotalInterest,
    effectiveAnnualYield: Number((effectiveAnnualYield * 100).toFixed(2)),
    currentVirtualMonth: durationMonths,
    monthlyLedger,
    disclaimer:
      "SIMULATION ONLY — Hypothetical scenario calculated using daily compounding model. Does not represent live on-chain assets or guaranteed future returns.",
  };
}

/**
 * Calculates investable surplus while strictly protecting required payout liquidity:
 * investableSurplus = max(0, availableIdleCash - protectedObligations - requiredLiquidityBuffer)
 */
export function calculateInvestableSurplus(
  availableIdleCash: number,
  protectedObligations: number,
  requiredLiquidityBuffer: number = 0
): number {
  const surplus = availableIdleCash - protectedObligations - requiredLiquidityBuffer;
  return Math.max(0, Number(surplus.toFixed(2)));
}

/**
 * Reconciles net strategy gain/loss strictly from tracked cash flows and position value:
 * netStrategyGain = currentStrategyValue + cumulativeWithdrawals - cumulativeSupplies
 */
export function calculateMonthlyRateFromApr(apr: number): number {
  const decimalApr = apr > 1 ? apr / 100 : apr;
  return calculateEffectiveMonthlyRate(decimalApr);
}

export function calculateExpectedYieldOverDays(principal: number, apr: number, days: number): number {
  if (apr <= 0 || principal <= 0 || days <= 0) return 0;
  const dailyRate = apr / 100 / 365;
  const factor = Math.pow(1 + dailyRate, days) - 1;
  return Number((principal * factor).toFixed(2));
}

export interface SimulateAaveYieldParams {
  monthlyContribution: number;
  annualPercentageRate: number;
  durationMonths: number;
  circleId?: string;
}

export function simulateAaveYield(params: SimulateAaveYieldParams) {
  const sim = runDeterministicSimulation({
    monthlyContribution: params.monthlyContribution,
    durationMonths: params.durationMonths,
    hypotheticalAPR: params.annualPercentageRate / 100,
    compoundingFrequency: "DAILY",
    depositTiming: "END_OF_MONTH",
  });

  return {
    circleId: params.circleId,
    totalPrincipal: sim.totalContributions,
    finalBalance: sim.projectedFinalValue,
    totalInterestEarned: sim.projectedTotalInterest,
    monthlySchedule: sim.monthlyLedger.map((m) => ({
      month: m.month,
      deposit: m.newContribution,
      cumulativePrincipal: m.cumulativeContributions,
      interestEarned: m.simulatedInterest,
      endingBalance: m.closingBalance,
    })),
  };
}

