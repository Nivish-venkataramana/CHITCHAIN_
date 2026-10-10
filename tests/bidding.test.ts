import {
  deriveDemoSalt,
  generateSecureSalt,
  computeCommitment,
  commitSecretBid,
  revealSecretBid,
  settleAuction,
  getBiddingAuctionState,
  resetAuctionState,
} from "../lib/bidding-store";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

async function runBiddingTests() {
  console.log("▶ Running Comprehensive Unit Tests for Confidential Sealed Auction...");

  const circleId = "test-auction-circle-1";
  resetAuctionState(circleId);

  // 1. Test Input Rejection for "2" USDC (below 50% floor of 2,000 USDC)
  {
    console.log("\n[Test 1] Input '2' USDC below 50% floor rejection...");
    let rejected = false;
    try {
      await commitSecretBid({
        circleId,
        memberWallet: "0x1111111111111111111111111111111111111111",
        memberUsername: "asharao01",
        bidAmountUSDC: "2",
      });
    } catch (err: any) {
      rejected = true;
      assert(
        err.message.includes("Bid amount must be at least 50% of the round pot (2,000 USDC)."),
        `Error message mismatch: got "${err.message}"`
      );
    }
    assert(rejected === true, "Input '2' USDC must be rejected");
    console.log("  ✔ Input '2' USDC rejected with exact message: 'Bid amount must be at least 50% of the round pot (2,000 USDC).'");
  }

  // 2. Test Input Rejection for 1,500 USDC (< 2,000 USDC floor)
  {
    console.log("\n[Test 2] Input 1,500 USDC below 50% floor rejection...");
    let rejected = false;
    try {
      await commitSecretBid({
        circleId,
        memberWallet: "0x1111111111111111111111111111111111111111",
        memberUsername: "asharao01",
        bidAmountUSDC: "1500",
      });
    } catch (err: any) {
      rejected = true;
      assert(
        err.message.includes("Bid amount must be at least 50% of the round pot (2,000 USDC)."),
        `Error message mismatch: got "${err.message}"`
      );
    }
    assert(rejected === true, "Input 1,500 USDC must be rejected");
    console.log("  ✔ 1,500 USDC floor rejection verified.");
  }

  // 3. Test Floor Acceptance for 2,000 USDC (exact floor) on a temp circle
  {
    console.log("\n[Test 3] Floor acceptance for exact 2,000 USDC...");
    const tempCircleId = "temp-floor-circle";
    resetAuctionState(tempCircleId);
    const bid2000 = await commitSecretBid({
      circleId: tempCircleId,
      memberWallet: "0x1111111111111111111111111111111111111111",
      memberUsername: "asharao01",
      bidAmountUSDC: "2000",
    });
    assert(bid2000.commitment.startsWith("0x"), "2,000 USDC must be accepted");
    console.log("  ✔ 2,000 USDC accepted at exact 50% floor.");
  }

  // 4. Test 4 Demo Participants Committing Bids
  {
    console.log("\n[Test 4] Committing 4 secret bids for Asha (3,900), Vikram (3,800), Meera (3,850), Rohan (3,950)...");
    
    // Asha Rao: 3,900 USDC
    await commitSecretBid({
      circleId,
      memberWallet: "0x1111111111111111111111111111111111111111",
      memberUsername: "asharao01",
      bidAmountUSDC: "3900",
    });

    // Vikram Nair: 3,800 USDC (Lowest)
    await commitSecretBid({
      circleId,
      memberWallet: "0x2222222222222222222222222222222222222222",
      memberUsername: "vikramnair02",
      bidAmountUSDC: "3800",
    });

    // Meera Joshi: 3,850 USDC
    await commitSecretBid({
      circleId,
      memberWallet: "0x3333333333333333333333333333333333333333",
      memberUsername: "meerajoshi03",
      bidAmountUSDC: "3850",
    });

    // Rohan Das: 3,950 USDC
    await commitSecretBid({
      circleId,
      memberWallet: "0x4444444444444444444444444444444444444444",
      memberUsername: "rohandas04",
      bidAmountUSDC: "3950",
    });

    console.log("  ✔ All 4 bids committed successfully.");
  }

  // 5. Test Confidentiality & Phase Transition to Reveal
  {
    console.log("\n[Test 5] Confidentiality check: Unrevealed bids masked in public view...");
    const publicState = await getBiddingAuctionState(circleId, "0x9999999999999999999999999999999999999999");
    assert(publicState.phase === "Reveal", "State must automatically transition to Reveal when 4 members commit");
    assert(publicState.bids.length === 4, "Must have 4 bids");
    
    // Verify no plaintext amount is disclosed to other observers
    for (const b of publicState.bids) {
      assert(b.amount === undefined, "Unrevealed amount must NOT be exposed to public");
      assert(b.salt === undefined, "Unrevealed salt must NOT be exposed to public");
      assert(b.revealed === false, "Revealed flag must be false");
      assert(b.commitment.startsWith("0x"), "Commitment hash must be present");
    }
    console.log("  ✔ Confidentiality verified: amounts and salts are masked in public state.");
    console.log("  ✔ Phase transition to 'Reveal' verified.");
  }

  // 6. Test Mismatched Salt / Tampered Bid Rejection
  {
    console.log("\n[Test 6] Tampered salt/amount rejection during reveal...");
    let tamperedCaught = false;
    try {
      await revealSecretBid({
        circleId,
        memberWallet: "0x1111111111111111111111111111111111111111",
        bidAmountBaseUnits: "3900000000",
        salt: "0x0000000000000000000000000000000000000000000000000000000000000001", // Fake salt
      });
    } catch (err: any) {
      tamperedCaught = true;
      assert(err.message.includes("hash mismatch"), "Must reject mismatched commitment");
    }
    assert(tamperedCaught === true, "Tampered reveal must be rejected");
    console.log("  ✔ Tampered salt/amount successfully rejected.");
  }

  // 7. Test 1-Click Reveal for All 4 Members
  {
    console.log("\n[Test 7] 1-Click Reveal for all 4 participants...");
    const members = [
      { w: "0x1111111111111111111111111111111111111111" as `0x${string}`, amt: "3900000000" },
      { w: "0x2222222222222222222222222222222222222222" as `0x${string}`, amt: "3800000000" },
      { w: "0x3333333333333333333333333333333333333333" as `0x${string}`, amt: "3850000000" },
      { w: "0x4444444444444444444444444444444444444444" as `0x${string}`, amt: "3950000000" },
    ];

    for (const m of members) {
      const salt = deriveDemoSalt(circleId, 1, m.w);
      const revealed = await revealSecretBid({
        circleId,
        memberWallet: m.w,
        bidAmountBaseUnits: m.amt,
        salt,
      });
      assert(revealed.revealed === true, "Bid must be marked revealed");
      assert(revealed.amount === m.amt, "Revealed amount must match original bid");
    }
    console.log("  ✔ All 4 bids revealed and verified onchain.");
  }

  // 8. Settle Auction and Verify Winner
  {
    console.log("\n[Test 8] Settling auction: lowest bid (@vikramnair02 at 3,800 USDC) wins...");
    const settled = await settleAuction(circleId);
    assert(settled.phase === "Settled", "Auction phase must be Settled");
    assert(settled.winner !== null, "Winner must not be null");
    assert(settled.winner?.username === "vikramnair02", "Vikram Nair must win with lowest bid of 3,800 USDC");
    assert(settled.winner?.amount === "3800000000", "Winning pot must be 3,800 USDC (base units)");
    assert(settled.winner?.dividend === "200000000", "Dividend carry must be 200 USDC (4,000 - 3,800)");
    console.log("  ✔ Winner @vikramnair02 awarded 3,800 USDC pot.");
    console.log("  ✔ Dividend carry of +200 USDC computed for Month 2.");
  }

  console.log("\n🎉 ALL CONFIDENTIAL SEALED AUCTION TESTS PASSED 100% SUCCESSFULLY!");
}

runBiddingTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
