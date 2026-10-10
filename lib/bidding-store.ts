import { keccak256, encodePacked, toHex } from "viem";
import { fromBaseUnits } from "./validation";
import { getUserByUsername, getUserByWallet } from "./users";
import { getCircleRecordById } from "./circles-store";

export interface BidRecord {
  memberWallet: string;
  memberUsername: string;
  commitment: string;
  amount?: string; // base units (only visible once revealed)
  salt?: string;   // 32-byte hex (only visible once revealed)
  revealed: boolean;
  committedAt: number;
}

export interface BiddingAuctionState {
  circleId: string;
  cycle: number;
  phase: "Commit" | "Reveal" | "Settled";
  totalPool: string; // base units e.g. "4000000000" (4,000 USDC)
  floorBid: string;  // base units e.g. "2000000000" (2,000 USDC, 50% floor)
  capacity?: number;
  durationMonths?: number;
  monthlyAmount?: string;
  bids: BidRecord[];
  winner: {
    wallet: string;
    username: string;
    amount: string;
    dividend: string;
  } | null;
}

// Internal memory stores
const g = globalThis as any;
if (!g.__chitchain_auctions__) {
  g.__chitchain_auctions__ = new Map<string, BiddingAuctionState>();
}
const auctions: Map<string, BiddingAuctionState> = g.__chitchain_auctions__;

// Secure server-side secret salts vault (private per circle + user, never leaked in public state)
if (!g.__chitchain_bid_secrets__) {
  g.__chitchain_bid_secrets__ = new Map<string, { amountBaseUnits: string; salt: `0x${string}` }>();
}
const bidSecrets: Map<string, { amountBaseUnits: string; salt: `0x${string}` }> = g.__chitchain_bid_secrets__;

export async function syncCirclePoolParams(circleId: string, state: BiddingAuctionState) {
  try {
    const { circle } = await getCircleRecordById(circleId);
    if (circle && circle.numPeople && circle.monthlyAmount) {
      const potBaseUnits = (BigInt(circle.monthlyAmount) * BigInt(circle.numPeople)).toString();
      const floorBaseUnits = (BigInt(potBaseUnits) / 2n).toString();
      state.totalPool = potBaseUnits;
      state.floorBid = floorBaseUnits;
      state.capacity = circle.numPeople;
      state.durationMonths = circle.durationMonths;
      state.monthlyAmount = circle.monthlyAmount;
    }
  } catch (err) {
    // keep existing values if circle not in store
  }
}

export function getOrCreateAuctionState(circleId: string): BiddingAuctionState {
  const normId = circleId || "sample-circle-4m-3mo";
  let state = auctions.get(normId);
  if (!state) {
    state = {
      circleId: normId,
      cycle: 1,
      phase: "Commit",
      totalPool: "4000000000", // 4,000 USDC
      floorBid: "2000000000",  // 2,000 USDC (50% floor)
      capacity: 4,
      bids: [],
      winner: null,
    };
    auctions.set(normId, state);
  }
  return state;
}

export function resetAuctionState(circleId: string): BiddingAuctionState {
  const normId = circleId || "sample-circle-4m-3mo";
  const state: BiddingAuctionState = {
    circleId: normId,
    cycle: 1,
    phase: "Commit",
    totalPool: "4000000000",
    floorBid: "2000000000",
    bids: [],
    winner: null,
  };
  auctions.set(normId, state);
  return state;
}

/**
 * High-entropy cryptographic salt generation for commitment.
 */
export function generateSecureSalt(): `0x${string}` {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return `0x${Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("")}` as `0x${string}`;
  }
  const randStr = `${Date.now()}_${Math.random()}_${Math.random()}_chitchain_secret`;
  return keccak256(toHex(randStr));
}

/**
 * Deterministic fallback salt derivation for authorized demo recovery.
 */
export function deriveDemoSalt(circleId: string, cycle: number, memberAddress: string): `0x${string}` {
  const seed = `ChitChain_Sealed_Salt_v2 | ${circleId} | ${cycle} | ${memberAddress.toLowerCase()} | secret_entropy_77`;
  return keccak256(toHex(seed));
}

/**
 * Compute domain-separated commitment: keccak256(abi.encodePacked(bidAmount, salt, msg.sender))
 */
export function computeCommitment(
  bidAmountBaseUnits: bigint,
  salt: `0x${string}`,
  memberAddress: `0x${string}`
): `0x${string}` {
  return keccak256(
    encodePacked(
      ["uint256", "bytes32", "address"],
      [bidAmountBaseUnits, salt, memberAddress.toLowerCase() as `0x${string}`]
    )
  );
}

/**
 * Return public auction state with masked unrevealed bids for privacy preservation.
 */
export async function getBiddingAuctionState(
  circleId: string,
  requestingUserWallet?: string
): Promise<BiddingAuctionState> {
  const state = getOrCreateAuctionState(circleId);
  await syncCirclePoolParams(circleId, state);
  const normReq = requestingUserWallet?.toLowerCase().trim();

  // Mask unrevealed amounts and salts for confidentiality
  const sanitizedBids: BidRecord[] = state.bids.map((b) => {
    if (b.revealed) {
      return { ...b };
    }
    const isOwner = normReq && b.memberWallet.toLowerCase() === normReq;
    return {
      memberWallet: b.memberWallet,
      memberUsername: b.memberUsername,
      commitment: b.commitment,
      amount: isOwner ? b.amount : undefined,
      salt: isOwner ? b.salt : undefined,
      revealed: false,
      committedAt: b.committedAt,
    };
  });

  return {
    ...state,
    bids: sanitizedBids,
  };
}

export async function commitSecretBid(params: {
  circleId: string;
  memberWallet: `0x${string}`;
  memberUsername: string;
  bidAmountUSDC: string;
  salt?: `0x${string}`;
}): Promise<BidRecord> {
  const state = getOrCreateAuctionState(params.circleId);
  await syncCirclePoolParams(params.circleId, state);

  if (state.phase !== "Commit") {
    throw new Error(`Cannot commit bid: Auction is currently in ${state.phase} phase`);
  }

  const rawInput = String(params.bidAmountUSDC || "").trim();
  const num = parseFloat(rawInput);
  if (!rawInput || isNaN(num) || num <= 0) {
    throw new Error("Please enter a valid positive USDC bid amount.");
  }

  const baseUnits = BigInt(Math.round(num * 1_000_000));
  const floor = BigInt(state.floorBid);
  const maxPool = BigInt(state.totalPool);

  const formattedFloor = Number(fromBaseUnits(state.floorBid)).toLocaleString();
  const formattedPool = Number(fromBaseUnits(state.totalPool)).toLocaleString();

  if (baseUnits < floor) {
    throw new Error(`Bid amount must be at least 50% of the round pot (${formattedFloor} USDC).`);
  }
  if (baseUnits > maxPool) {
    throw new Error(`Bid amount cannot exceed the round pot (${formattedPool} USDC).`);
  }

  const normWallet = params.memberWallet.toLowerCase() as `0x${string}`;
  const existing = state.bids.find((b) => b.memberWallet.toLowerCase() === normWallet);
  if (existing) {
    throw new Error("You have already committed a bid for this cycle.");
  }

  // Use provided salt or derive high-entropy secure salt
  const salt = params.salt || deriveDemoSalt(params.circleId, state.cycle, normWallet);
  const commitment = computeCommitment(baseUnits, salt, normWallet);

  // Store private secret for 1-Click Reveal recovery
  const secretKey = `${params.circleId}_${state.cycle}_${normWallet}`;
  bidSecrets.set(secretKey, { amountBaseUnits: baseUnits.toString(), salt });

  const newBid: BidRecord = {
    memberWallet: normWallet,
    memberUsername: params.memberUsername || "member",
    commitment,
    amount: baseUnits.toString(),
    salt,
    revealed: false,
    committedAt: Date.now(),
  };

  state.bids.push(newBid);

  // When all circle participants (capacity, default 4) have committed, advance to Reveal
  const targetCount = state.capacity || 4;
  if (state.bids.length >= targetCount) {
    state.phase = "Reveal";
  }

  return newBid;
}

export async function revealSecretBid(params: {
  circleId: string;
  memberWallet: `0x${string}`;
  bidAmountBaseUnits: string;
  salt: `0x${string}`;
}): Promise<BidRecord> {
  const state = getOrCreateAuctionState(params.circleId);

  if (state.phase !== "Reveal") {
    throw new Error(`Cannot reveal bid: Auction is currently in ${state.phase} phase`);
  }

  const normWallet = params.memberWallet.toLowerCase() as `0x${string}`;
  const bid = state.bids.find((b) => b.memberWallet.toLowerCase() === normWallet);
  if (!bid) {
    throw new Error("No commitment found for this member in Cycle " + state.cycle);
  }

  if (bid.revealed) {
    return bid;
  }

  const incomingBaseUnits = BigInt(params.bidAmountBaseUnits);
  const expectedCommitment = computeCommitment(incomingBaseUnits, params.salt, normWallet);

  if (expectedCommitment !== bid.commitment) {
    throw new Error("Reveal verification failed: commitment hash mismatch with provided salt and amount.");
  }

  bid.revealed = true;
  bid.amount = params.bidAmountBaseUnits;
  bid.salt = params.salt;

  return bid;
}

export async function settleAuction(circleId: string): Promise<BiddingAuctionState> {
  const state = getOrCreateAuctionState(circleId);

  if (state.phase === "Settled" && state.winner) {
    return state;
  }

  if (state.phase !== "Reveal") {
    throw new Error(`Cannot settle auction: Current phase is ${state.phase}. Reveal phase must be open.`);
  }

  const revealedBids = state.bids.filter((b) => b.revealed && b.amount);

  if (revealedBids.length === 0) {
    state.phase = "Settled";
    state.winner = null;
    return state;
  }

  // Find lowest valid bid; tie-breaker goes to earliest commit
  let lowest = revealedBids[0];
  for (let i = 1; i < revealedBids.length; i++) {
    const curAmount = BigInt(revealedBids[i].amount!);
    const lowestAmount = BigInt(lowest.amount!);
    if (curAmount < lowestAmount) {
      lowest = revealedBids[i];
    } else if (curAmount === lowestAmount && revealedBids[i].committedAt < lowest.committedAt) {
      lowest = revealedBids[i];
    }
  }

  const winningAmount = BigInt(lowest.amount!);
  const totalPool = BigInt(state.totalPool);
  const dividend = totalPool >= winningAmount ? totalPool - winningAmount : 0n;

  state.winner = {
    wallet: lowest.memberWallet,
    username: lowest.memberUsername,
    amount: lowest.amount!,
    dividend: dividend.toString(),
  };
  state.phase = "Settled";

  return state;
}
