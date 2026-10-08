import { keccak256, encodePacked, stringToHex, toHex } from "viem";
import { fromBaseUnits } from "./validation";

export interface BidRecord {
  memberWallet: string;
  memberUsername: string;
  commitment: string;
  amount?: string;
  salt?: string;
  revealed: boolean;
  committedAt: number;
}

export interface BiddingAuctionState {
  circleId: string;
  cycle: number;
  phase: "Commit" | "Reveal" | "Settled";
  totalPool: string; // base units
  floorBid: string;  // 50% floor
  bids: BidRecord[];
  winner: {
    wallet: string;
    username: string;
    amount: string;
    dividend: string;
  } | null;
}

// Global bidding auction state
let auctionState: BiddingAuctionState = {
  circleId: "sample-circle-4m-3mo",
  cycle: 1,
  phase: "Commit",
  totalPool: "4000000000",
  floorBid: "2000000000",
  bids: [],
  winner: null,
};

/**
 * 1-Click Reveal Salt derivation in DEMO_MODE:
 * salt = keccak256("ChitChain bid | circleId | cycle | memberAddress")
 */
export function deriveDemoSalt(circleId: string, cycle: number, memberAddress: string): `0x${string}` {
  const msg = `ChitChain bid | ${circleId} | ${cycle} | ${memberAddress.toLowerCase()}`;
  return keccak256(toHex(msg));
}

/**
 * Compute commitment: keccak256(abi.encodePacked(bidAmount, salt, msg.sender))
 */
export function computeCommitment(bidAmountBaseUnits: bigint, salt: `0x${string}`, memberAddress: `0x${string}`): `0x${string}` {
  return keccak256(
    encodePacked(
      ["uint256", "bytes32", "address"],
      [bidAmountBaseUnits, salt, memberAddress]
    )
  );
}

export async function getBiddingAuctionState(circleId: string): Promise<BiddingAuctionState> {
  return auctionState;
}

export async function commitSecretBid(params: {
  circleId: string;
  memberWallet: `0x${string}`;
  memberUsername: string;
  bidAmountUSDC: string;
}): Promise<BidRecord> {
  const num = parseFloat(params.bidAmountUSDC);
  if (isNaN(num) || num <= 0) throw new Error("Invalid bid amount");

  const baseUnits = BigInt(Math.round(num * 1_000_000));
  const floor = BigInt(auctionState.floorBid);
  const maxPool = BigInt(auctionState.totalPool);

  if (baseUnits < floor) {
    throw new Error(`Bid amount must be at least the 50% floor (${fromBaseUnits(auctionState.floorBid)} USDC)`);
  }
  if (baseUnits > maxPool) {
    throw new Error(`Bid amount cannot exceed the pool (${fromBaseUnits(auctionState.totalPool)} USDC)`);
  }

  const salt = deriveDemoSalt(params.circleId, auctionState.cycle, params.memberWallet);
  const commitment = computeCommitment(baseUnits, salt, params.memberWallet);

  const existing = auctionState.bids.find(
    (b) => b.memberWallet.toLowerCase() === params.memberWallet.toLowerCase()
  );
  if (existing) {
    throw new Error("You have already committed a bid for this cycle");
  }

  const newBid: BidRecord = {
    memberWallet: params.memberWallet.toLowerCase(),
    memberUsername: params.memberUsername,
    commitment,
    amount: baseUnits.toString(),
    salt,
    revealed: false,
    committedAt: Date.now(),
  };

  auctionState.bids.push(newBid);

  // Auto-transition to Reveal when 4 bids committed
  if (auctionState.bids.length >= 4) {
    auctionState.phase = "Reveal";
  }

  return newBid;
}

export async function revealSecretBid(params: {
  circleId: string;
  memberWallet: `0x${string}`;
  bidAmountBaseUnits: string;
  salt: `0x${string}`;
}): Promise<BidRecord> {
  const bid = auctionState.bids.find(
    (b) => b.memberWallet.toLowerCase() === params.memberWallet.toLowerCase()
  );
  if (!bid) throw new Error("No commit found for this member");

  const expectedCommitment = computeCommitment(
    BigInt(params.bidAmountBaseUnits),
    params.salt,
    params.memberWallet
  );

  if (expectedCommitment !== bid.commitment) {
    throw new Error("Reveal verification failed: commitment mismatch");
  }

  bid.revealed = true;
  bid.amount = params.bidAmountBaseUnits;
  bid.salt = params.salt;

  return bid;
}

export async function settleAuction(circleId: string): Promise<BiddingAuctionState> {
  const revealedBids = auctionState.bids.filter((b) => b.revealed && b.amount);

  if (revealedBids.length === 0) {
    // Rollover
    auctionState.phase = "Settled";
    auctionState.winner = null;
    return auctionState;
  }

  // Find lowest valid bid
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
  const pool = BigInt(auctionState.totalPool);
  const dividend = pool - winningAmount;

  auctionState.winner = {
    wallet: lowest.memberWallet,
    username: lowest.memberUsername,
    amount: lowest.amount!,
    dividend: dividend.toString(),
  };
  auctionState.phase = "Settled";

  return auctionState;
}
