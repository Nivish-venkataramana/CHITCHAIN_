import { encodePacked, keccak256, toHex } from "viem";

/**
 * Derive deterministic 1-Click Reveal salt in DEMO mode.
 * salt = keccak256("ChitChain bid | circleId | cycle | memberAddress")
 */
export function deriveDeterministicSalt(
  circleId: string,
  cycle: number,
  memberAddress: string
): `0x${string}` {
  const msg = `ChitChain bid | ${circleId} | ${cycle} | ${memberAddress.toLowerCase()}`;
  return keccak256(toHex(msg));
}

/**
 * Create commit hash matching Solidity:
 * keccak256(abi.encodePacked(uint256 bidAmount, bytes32 salt, address member))
 */
export function computeBidCommitment(
  bidAmountBaseUnits: bigint,
  salt: `0x${string}`,
  memberAddress: `0x${string}`
): `0x${string}` {
  return keccak256(
    encodePacked(
      ["uint256", "bytes32", "address"],
      [bidAmountBaseUnits, salt, memberAddress]
    )
  );
}

/**
 * Format 6 decimal base units to human readable USDC
 */
export function formatUnits6(amount: string | bigint): string {
  try {
    const val = typeof amount === "string" ? BigInt(amount) : amount;
    const whole = val / 1_000_000n;
    const fraction = val % 1_000_000n;
    if (fraction === 0n) {
      return whole.toLocaleString("en-US");
    }
    const fracStr = fraction.toString().padStart(6, "0").replace(/0+$/, "");
    return `${whole.toLocaleString("en-US")}.${fracStr}`;
  } catch (e) {
    return "0";
  }
}

/**
 * Parse human USDC input to 6 decimal base units string
 */
export function parseUnits6(usdcAmount: string): bigint {
  const clean = usdcAmount.trim().replace(/,/g, "");
  if (!clean || isNaN(Number(clean))) return 0n;
  const parts = clean.split(".");
  const whole = BigInt(parts[0] || "0") * 1_000_000n;
  let fraction = 0n;
  if (parts[1]) {
    const padded = parts[1].slice(0, 6).padEnd(6, "0");
    fraction = BigInt(padded);
  }
  return whole + fraction;
}
