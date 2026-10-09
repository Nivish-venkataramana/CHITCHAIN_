import { z } from "zod";

export interface CircleInput {
  name: string;
  numPeople: number;
  monthlyAmount: string; // can be entered as human USDC string (e.g. "1000") or base units
  durationMonths: number;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  baseUnitAmount?: string;
}

/**
 * Converts a human USDC string (e.g., "1000" or "1000.5") to 6-decimal integer base units string ("1000000000").
 */
export function toBaseUnits(amountUSDC: string | number): string {
  const str = String(amountUSDC).trim();
  const num = parseFloat(str);
  if (isNaN(num) || num <= 0) {
    throw new Error("Amount must be a positive number.");
  }
  // 6 decimals for MockUSDC
  return BigInt(Math.round(num * 1_000_000)).toString();
}

/**
 * Converts 6-decimal base unit string to human-readable USDC string.
 */
export function fromBaseUnits(baseUnits: string): string {
  try {
    const b = BigInt(baseUnits);
    const divisor = BigInt(1_000_000);
    const whole = b / divisor;
    const fraction = b % divisor;
    if (fraction === BigInt(0)) return whole.toString();
    const fracStr = fraction.toString().padStart(6, "0").replace(/0+$/, "");
    return `${whole}.${fracStr}`;
  } catch {
    return baseUnits;
  }
}

/**
 * Computes allowed duration options (in months) based on capacity N:
 * For N < 5: N - 1
 * For every 5-member increase, an additional -1 offset is allowed (5 -> N-1, N-2; 10 -> N-1..N-2; 15 -> N-1..N-3, etc.)
 */
export function getAllowedDurations(numPeople: number): number[] {
  const N = Math.floor(numPeople);
  if (isNaN(N) || N < 2) return [];
  const maxOffset = Math.max(2, Math.floor(N / 5));
  const durations: number[] = [];
  for (let k = 1; k <= maxOffset; k++) {
    const d = N - k;
    if (d >= 1 && !durations.includes(d)) {
      durations.push(d);
    }
  }
  return durations;
}

/**
 * Validates circle creation parameters according to rules:
 * A > 0n
 * N >= 2
 * D in allowedDurations(N)
 */
export function validateCircleParams(input: CircleInput): ValidationResult {
  if (!input.name || input.name.trim().length === 0) {
    return { valid: false, error: "Circle name is required." };
  }

  const N = Math.floor(input.numPeople);
  if (isNaN(N) || N < 2) {
    return { valid: false, error: "Number of people (N) must be at least 2." };
  }

  const D = Math.floor(input.durationMonths);
  if (isNaN(D) || D < 1) {
    return { valid: false, error: "Duration must be at least 1 month." };
  }

  const allowedDurations = getAllowedDurations(N);
  if (!allowedDurations.includes(D)) {
    return {
      valid: false,
      error: `Duration must be one of ${allowedDurations.join(", ")} months for ${N} members.`,
    };
  }

  try {
    const baseUnits = toBaseUnits(input.monthlyAmount);
    const baseBigInt = BigInt(baseUnits);
    if (baseBigInt <= BigInt(0)) {
      return { valid: false, error: "Monthly amount must be greater than 0." };
    }
    return { valid: true, baseUnitAmount: baseUnits };
  } catch (err: any) {
    return { valid: false, error: err.message || "Invalid monthly amount." };
  }
}

export const circleSchema = z.object({
  name: z.string().min(1, "Circle name is required"),
  numPeople: z.number().int().min(2, "Number of people must be at least 2"),
  monthlyAmount: z.string().min(1, "Monthly amount is required"),
  durationMonths: z.number().int().min(1, "Duration must be at least 1 month"),
});
