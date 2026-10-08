import {
  deriveDemoSalt,
  computeCommitment,
  commitSecretBid,
  revealSecretBid,
  settleAuction,
  getBiddingAuctionState,
} from "../lib/bidding-store";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

async function runBiddingTests() {
  console.log("▶ Running Unit Tests for Pranav's Commit-Reveal Bidding & Settlement...");

  const circleId = "sample-circle-4m-3mo";
  const cycle = 1;

  // 1. Test 1-Click Reveal Salt Derivation (deterministic)
  {
    console.log("\n[Test 1] 1-Click Reveal Salt Derivation...");
    const salt1 = deriveDemoSalt(circleId, cycle, "0x2222222222222222222222222222222222222222");
    const salt2 = deriveDemoSalt(circleId, cycle, "0x2222222222222222222222222222222222222222");
    assert(salt1 === salt2, "Derived salt must be deterministic");
    assert(salt1.startsWith("0x"), "Salt must be 32-byte hex");
    console.log("  ✔ Deterministic salt derivation verified.");
  }

  // 2. Test Floor Rejection (< 50% floor, i.e. < 2,000 USDC)
  {
    console.log("\n[Test 2] Bid Floor Rejection (50% rule)...");
    let floorRejected = false;
    try {
      await commitSecretBid({
        circleId,
        memberWallet: "0x1111111111111111111111111111111111111111",
        memberUsername: "asharao01",
        bidAmountUSDC: "1500", // below 2000 floor
      });
    } catch (err: any) {
      floorRejected = true;
      assert(err.message.includes("50% floor"), "Must mention floor rule");
    }
    assert(floorRejected === true, "Bid below 50% floor must be rejected");
    console.log("  ✔ 50% floor rejection verified.");
  }

  // 3. Commit 4 Hidden Bids
  {
    console.log("\n[Test 3] Committing 4 secret bids...");
    // Asha commits 3900 USDC
    await commitSecretBid({
      circleId,
      memberWallet: "0x1111111111111111111111111111111111111111",
      memberUsername: "asharao01",
      bidAmountUSDC: "3900",
    });

    // Vikram commits 3800 USDC (Lowest Valid Bid)
    await commitSecretBid({
      circleId,
      memberWallet: "0x2222222222222222222222222222222222222222",
      memberUsername: "vikramnair02",
      bidAmountUSDC: "3800",
    });

    // Meera commits 3850 USDC
    await commitSecretBid({
      circleId,
      memberWallet: "0x3333333333333333333333333333333333333333",
      memberUsername: "meerajoshi03",
      bidAmountUSDC: "3850",
    });

    // Rohan commits 3950 USDC
    await commitSecretBid({
      circleId,
      memberWallet: "0x4444444444444444444444444444444444444444",
      memberUsername: "rohandas04",
      bidAmountUSDC: "3950",
    });

    const stateAfterCommits = await getBiddingAuctionState(circleId);
    assert(stateAfterCommits.bids.length === 4, "Should have 4 commits");
    assert(stateAfterCommits.phase === "Reveal", "Should transition to Reveal phase");
    console.log("  ✔ 4 bids committed and phase transitioned to Reveal.");
  }

  // 4. Reveal Bids via 1-Click Reveal
  {
    console.log("\n[Test 4] 1-Click Reveal for all members...");
    const members = [
      { w: "0x1111111111111111111111111111111111111111" as `0x${string}`, amt: "3900000000" },
      { w: "0x2222222222222222222222222222222222222222" as `0x${string}`, amt: "3800000000" },
      { w: "0x3333333333333333333333333333333333333333" as `0x${string}`, amt: "3850000000" },
      { w: "0x4444444444444444444444444444444444444444" as `0x${string}`, amt: "3950000000" },
    ];

    for (const m of members) {
      const salt = deriveDemoSalt(circleId, cycle, m.w);
      const revealed = await revealSecretBid({
        circleId,
        memberWallet: m.w,
        bidAmountBaseUnits: m.amt,
        salt,
      });
      assert(revealed.revealed === true, "Bid must be revealed");
    }
    console.log("  ✔ All bids revealed successfully.");
  }

  // 5. Settle Auction
  {
    console.log("\n[Test 5] Settling auction and verifying lowest bid winner...");
    const settled = await settleAuction(circleId);
    assert(settled.phase === "Settled", "Auction must be Settled");
    assert(settled.winner !== null, "Winner must be chosen");
    assert(settled.winner?.username === "vikramnair02", "Vikram Nair (3800 USDC) should win pot");
    assert(settled.winner?.amount === "3800000000", "Winning payout must be 3800 USDC base units");
    assert(settled.winner?.dividend === "200000000", "Dividend carry must be 200 USDC (4000 - 3800)");
    console.log("  ✔ Winner Vikram Nair (3,800 USDC) selected, 200 USDC dividend carried.");
  }

  console.log("\n✔ ALL PRANAV COMMIT-REVEAL & SETTLEMENT TESTS PASSED 100%!");
}

runBiddingTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
