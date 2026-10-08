/**
 * Bidding Module TypeScript Simulation & Payout Vector Validator
 * Tests all rules, edge cases, 1-Click Reveal salt derivation, and handoffs/payout_vectors.json
 */
import { encodePacked, keccak256, toHex } from "viem";
import fs from "fs";
import path from "path";

export interface BidView {
  member: `0x${string}`;
  amount: bigint;
  revealed: boolean;
  committedAt: bigint;
}

export class BiddingEngine {
  public poolAmount: bigint;
  public members: `0x${string}`[];
  public wonMembers: Set<string> = new Set();
  public missedMembers: Set<string> = new Set();
  public minBidBps: bigint = 5000n; // 50%
  public currentCycle: number = 1;

  public commitments: Map<string, { commitment: `0x${string}`; committedAt: bigint }> = new Map();
  public revealedBids: Map<string, bigint> = new Map();
  public phase: "Commit" | "Reveal" | "Settled" = "Commit";

  constructor(poolAmount: bigint, members: `0x${string}`[]) {
    this.poolAmount = poolAmount;
    this.members = members;
  }

  // Derive deterministic 1-Click Reveal salt
  static deriveSalt(circleId: string, cycle: number, memberAddress: `0x${string}`): `0x${string}` {
    const msg = `ChitChain bid | ${circleId} | ${cycle} | ${memberAddress.toLowerCase()}`;
    return keccak256(toHex(msg));
  }

  static createCommitment(bidAmount: bigint, salt: `0x${string}`, memberAddress: `0x${string}`): `0x${string}` {
    return keccak256(
      encodePacked(
        ["uint256", "bytes32", "address"],
        [bidAmount, salt, memberAddress]
      )
    );
  }

  commitBid(member: `0x${string}`, commitment: `0x${string}`, timestamp: bigint = BigInt(Date.now())): void {
    if (this.phase !== "Commit") throw new Error("Not in Commit phase");
    if (!this.members.map(m => m.toLowerCase()).includes(member.toLowerCase())) {
      throw new Error("Not a circle member");
    }
    if (this.wonMembers.has(member.toLowerCase())) throw new Error("Member already won");
    if (this.missedMembers.has(member.toLowerCase())) throw new Error("Member missed payment");
    if (this.commitments.has(member.toLowerCase())) throw new Error("Already committed");

    this.commitments.set(member.toLowerCase(), { commitment, committedAt: timestamp });
  }

  openReveal(): void {
    if (this.phase !== "Commit") throw new Error("Can only open reveal from Commit phase");
    this.phase = "Reveal";
  }

  revealBid(member: `0x${string}`, bidAmount: bigint, salt: `0x${string}`): void {
    if (this.phase !== "Reveal") throw new Error("Not in Reveal phase");
    const commitData = this.commitments.get(member.toLowerCase());
    if (!commitData) throw new Error("No commit found for member");
    if (this.revealedBids.has(member.toLowerCase())) throw new Error("Already revealed");

    const expectedCommitment = BiddingEngine.createCommitment(bidAmount, salt, member);
    if (expectedCommitment.toLowerCase() !== commitData.commitment.toLowerCase()) {
      throw new Error("Commitment mismatch / wrong salt or amount");
    }

    const minBid = (this.poolAmount * this.minBidBps) / 10000n;
    if (bidAmount < minBid) throw new Error("Bid below 50% floor");
    if (bidAmount > this.poolAmount) throw new Error("Bid exceeds pool amount");

    this.revealedBids.set(member.toLowerCase(), bidAmount);
  }

  settle(): { winner: `0x${string}` | null; winningBid: bigint; dividendCarried: bigint; discarded: `0x${string}`[] } {
    if (this.phase !== "Reveal") throw new Error("Must be in Reveal phase to settle");

    const discarded: `0x${string}`[] = [];
    let lowestBid: bigint = (1n << 255n);
    let winningMember: `0x${string}` | null = null;
    let earliestCommit: bigint = (1n << 63n);

    for (const [memberKey, commitData] of this.commitments.entries()) {
      const member = this.members.find(m => m.toLowerCase() === memberKey) || (memberKey as `0x${string}`);
      if (!this.revealedBids.has(memberKey)) {
        discarded.push(member);
      } else {
        const bid = this.revealedBids.get(memberKey)!;
        if (bid < lowestBid) {
          lowestBid = bid;
          winningMember = member;
          earliestCommit = commitData.committedAt;
        } else if (bid === lowestBid && commitData.committedAt < earliestCommit) {
          winningMember = member;
          earliestCommit = commitData.committedAt;
        }
      }
    }

    this.phase = "Settled";

    if (!winningMember) {
      // Rollover
      return {
        winner: null,
        winningBid: 0n,
        dividendCarried: this.poolAmount,
        discarded
      };
    }

    this.wonMembers.add(winningMember.toLowerCase());
    const dividendCarried = this.poolAmount - lowestBid;

    return {
      winner: winningMember,
      winningBid: lowestBid,
      dividendCarried,
      discarded
    };
  }

  getBidList(): BidView[] {
    const list: BidView[] = [];
    for (const [memberKey, commitData] of this.commitments.entries()) {
      const member = this.members.find(m => m.toLowerCase() === memberKey) || (memberKey as `0x${string}`);
      const isRevealed = this.revealedBids.has(memberKey);
      list.push({
        member,
        amount: isRevealed ? this.revealedBids.get(memberKey)! : 0n,
        revealed: isRevealed,
        committedAt: commitData.committedAt
      });
    }
    return list;
  }
}

// Run test vectors from handoffs/payout_vectors.json
export function runPayoutVectorTests() {
  console.log("=== Running Payout Vectors Test Suite ===");
  const vectorsPath = path.resolve(process.cwd(), "handoffs/payout_vectors.json");
  const vectors = JSON.parse(fs.readFileSync(vectorsPath, "utf-8"));

  let passed = 0;

  for (const v of vectors) {
    console.log(`Testing Vector: "${v.name}"`);
    const monthly = BigInt(v.monthlyAmount);
    const paidMembers = Number(v.paid);
    const carriedDividend = BigInt(v.carriedDividend || "0");
    const totalPool = (BigInt(paidMembers) * monthly) + carriedDividend;

    const dummyMembers: `0x${string}`[] = Array.from({ length: v.members }, (_, i) => 
      `0x${(i + 1).toString(16).padStart(40, "0")}` as `0x${string}`
    );

    const engine = new BiddingEngine(totalPool, dummyMembers);

    // If missed payment test, mark member 5 as missed
    if (v.name.includes("missed payment")) {
      engine.missedMembers.add(dummyMembers[4].toLowerCase());
    }

    const winningBid = BigInt(v.winningBid);

    if (winningBid > 0n) {
      // Member 1 bids winningBid
      const salt1 = BiddingEngine.deriveSalt("test-circle", v.cycle, dummyMembers[0]);
      const commit1 = BiddingEngine.createCommitment(winningBid, salt1, dummyMembers[0]);
      engine.commitBid(dummyMembers[0], commit1, 1000n);

      // Other paid members bid higher
      for (let i = 1; i < paidMembers; i++) {
        const higherBid = winningBid + BigInt(100000000 * i);
        if (higherBid <= totalPool) {
          const salt = BiddingEngine.deriveSalt("test-circle", v.cycle, dummyMembers[i]);
          const commit = BiddingEngine.createCommitment(higherBid, salt, dummyMembers[i]);
          engine.commitBid(dummyMembers[i], commit, BigInt(1000 + i * 100));
        }
      }

      engine.openReveal();

      // Reveal member 1
      engine.revealBid(dummyMembers[0], winningBid, salt1);

      // Reveal others
      for (let i = 1; i < paidMembers; i++) {
        const higherBid = winningBid + BigInt(100000000 * i);
        if (higherBid <= totalPool) {
          const salt = BiddingEngine.deriveSalt("test-circle", v.cycle, dummyMembers[i]);
          engine.revealBid(dummyMembers[i], higherBid, salt);
        }
      }

      const res = engine.settle();

      if (res.winningBid.toString() !== v.expect.payout) {
        throw new Error(`Payout mismatch for ${v.name}: expected ${v.expect.payout}, got ${res.winningBid}`);
      }
      if (res.dividendCarried.toString() !== v.expect.dividendCarried) {
        throw new Error(`Dividend mismatch for ${v.name}: expected ${v.expect.dividendCarried}, got ${res.dividendCarried}`);
      }
    } else {
      // No bids rollover
      engine.openReveal();
      const res = engine.settle();
      if (res.winningBid.toString() !== v.expect.payout) {
        throw new Error(`Payout mismatch on rollover: expected ${v.expect.payout}, got ${res.winningBid}`);
      }
      if (res.dividendCarried.toString() !== v.expect.dividendCarried) {
        throw new Error(`Dividend mismatch on rollover: expected ${v.expect.dividendCarried}, got ${res.dividendCarried}`);
      }
    }

    console.log(`  -> Passed! (Payout: ${v.expect.payout}, Dividend Carried: ${v.expect.dividendCarried})`);
    passed++;
  }

  console.log(`\nAll ${passed}/${vectors.length} Payout Vectors Passed successfully!`);
}

// 1-Click Reveal Recovery Test
export function test1ClickRevealRecovery() {
  console.log("\n=== Testing 1-Click Reveal Deterministic Recovery ===");
  const circleId = "circle-xyz-123";
  const cycle = 2;
  const member: `0x${string}` = "0x1111111111111111111111111111111111111111";
  const bidAmount = 3500000000n;

  // 1. Derive salt initially
  const initialSalt = BiddingEngine.deriveSalt(circleId, cycle, member);
  const commitment = BiddingEngine.createCommitment(bidAmount, initialSalt, member);

  const engine = new BiddingEngine(5000000000n, [member]);
  engine.commitBid(member, commitment);

  // 2. Simulate complete localStorage wipe / loss of random salt
  // Re-derive from deterministic rule:
  const recoveredSalt = BiddingEngine.deriveSalt(circleId, cycle, member);
  if (recoveredSalt !== initialSalt) {
    throw new Error("Deterministic salt re-derivation failed");
  }

  engine.openReveal();
  engine.revealBid(member, bidAmount, recoveredSalt);

  const result = engine.settle();
  if (result.winner?.toLowerCase() !== member.toLowerCase()) {
    throw new Error("1-Click Reveal settlement winner failed");
  }

  console.log("  -> 1-Click Reveal recovery test passed with zero salt loss!");
}

if (require.main === module) {
  runPayoutVectorTests();
  test1ClickRevealRecovery();
}
