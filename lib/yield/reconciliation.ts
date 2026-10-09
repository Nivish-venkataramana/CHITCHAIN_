/**
 * Yield Accounting and Reconciliation Engine for ChitChain Aave Yield Platform.
 */

export interface StrategyCashFlows {
  cumulativeSupplies: number;
  cumulativeWithdrawals: number;
  currentPositionValue: number;
  strategyHeldIdle: number;
}

export interface ReconciledStrategyReport {
  totalSuppliedPrincipal: number;
  totalWithdrawnPrincipal: number;
  currentStrategyValue: number;
  netStrategyGain: number; // Net earned interest from Aave
  isProfit: boolean;
  gainPercentage: number;
  reconciliationFormula: string;
  reconciledAt: Date;
}

/**
 * Reconciles net strategy gain/loss according to the non-negotiable formula:
 * netStrategyGain = currentStrategyValue + cumulativeWithdrawals - cumulativeSupplies
 */
export function reconcileStrategyAccounting(flows: StrategyCashFlows): ReconciledStrategyReport {
  const {
    cumulativeSupplies,
    cumulativeWithdrawals,
    currentPositionValue,
    strategyHeldIdle = 0,
  } = flows;

  const totalCurrentValue = currentPositionValue + strategyHeldIdle;
  const netGain = totalCurrentValue + cumulativeWithdrawals - cumulativeSupplies;
  const roundedNetGain = Number(netGain.toFixed(6));

  const gainPercentage =
    cumulativeSupplies > 0
      ? Number(((roundedNetGain / cumulativeSupplies) * 100).toFixed(4))
      : 0;

  return {
    totalSuppliedPrincipal: Number(cumulativeSupplies.toFixed(6)),
    totalWithdrawnPrincipal: Number(cumulativeWithdrawals.toFixed(6)),
    currentStrategyValue: Number(totalCurrentValue.toFixed(6)),
    netStrategyGain: roundedNetGain,
    isProfit: roundedNetGain >= 0,
    gainPercentage,
    reconciliationFormula: `${totalCurrentValue.toFixed(2)} (Value) + ${cumulativeWithdrawals.toFixed(2)} (Withdrawn) - ${cumulativeSupplies.toFixed(2)} (Supplied) = ${roundedNetGain.toFixed(2)} USDC`,
    reconciledAt: new Date(),
  };
}

/**
 * Converts integer base units (e.g. 6 decimals for USDC) to human formatted number.
 */
export function fromTokenBaseUnits(baseUnits: string | bigint, decimals: number = 6): number {
  try {
    const b = BigInt(baseUnits);
    const divisor = BigInt(10 ** decimals);
    const whole = b / divisor;
    const fraction = b % divisor;
    const fracStr = fraction.toString().padStart(decimals, "0");
    return Number(`${whole}.${fracStr}`);
  } catch {
    return 0;
  }
}

/**
 * Converts human formatted number to integer base units string.
 */
export function toTokenBaseUnits(amount: number | string, decimals: number = 6): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num) || num < 0) return "0";
  const multiplier = 10 ** decimals;
  return BigInt(Math.round(num * multiplier)).toString();
}
