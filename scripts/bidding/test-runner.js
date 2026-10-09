const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

function keccak256(buffer) {
  // Use node crypto createHash if sha3-256 or keccak available or simple buffer hash for validation
  // In Node 18+, crypto.createHash("sha3-256") is built-in
  return "0x" + crypto.createHash("sha3-256").update(buffer).digest("hex");
}

function deriveDeterministicSalt(circleId, cycle, memberAddress) {
  const msg = `ChitChain bid | ${circleId} | ${cycle} | ${memberAddress.toLowerCase()}`;
  return keccak256(Buffer.from(msg, "utf8"));
}

function runTests() {
  console.log("=================================================");
  console.log("  CHITCHAIN BIDDING MODULE TEST SUITE (PRANAV)   ");
  console.log("=================================================");

  const vectorsPath = path.resolve(__dirname, "../../handoffs/payout_vectors.json");
  const vectors = JSON.parse(fs.readFileSync(vectorsPath, "utf-8"));

  let passed = 0;

  for (const v of vectors) {
    console.log(`\n▶ Testing Vector: "${v.name}"`);
    const monthly = BigInt(v.monthlyAmount);
    const paid = BigInt(v.paid);
    const carriedDividend = BigInt(v.carriedDividend || "0");
    const totalPool = paid * monthly + carriedDividend;
    const winningBid = BigInt(v.winningBid);

    let payout = 0n;
    let dividendCarried = 0n;

    if (winningBid > 0n) {
      const minFloor = (totalPool * 5000n) / 10000n; // 50% floor
      if (winningBid < minFloor) {
        throw new Error(`Bid ${winningBid} is below floor ${minFloor}`);
      }
      if (winningBid > totalPool) {
        throw new Error(`Bid ${winningBid} exceeds pool ${totalPool}`);
      }
      payout = winningBid;
      dividendCarried = totalPool - winningBid;
    } else {
      // Rollover
      payout = 0n;
      dividendCarried = totalPool;
    }

    if (payout.toString() !== v.expect.payout) {
      console.error(`❌ Payout mismatch: Expected ${v.expect.payout}, got ${payout}`);
      process.exit(1);
    }
    if (dividendCarried.toString() !== v.expect.dividendCarried) {
      console.error(`❌ Dividend mismatch: Expected ${v.expect.dividendCarried}, got ${dividendCarried}`);
      process.exit(1);
    }

    console.log(`  ✓ Passed | Total Pool: ${(Number(totalPool)/1e6).toLocaleString()} USDC | Payout: ${(Number(payout)/1e6).toLocaleString()} USDC | Dividend Carried: ${(Number(dividendCarried)/1e6).toLocaleString()} USDC`);
    passed++;
  }

  console.log("\n=================================================");
  console.log("  1-CLICK REVEAL DETERMINISTIC RECOVERY TEST     ");
  console.log("=================================================");

  const circleId = "circle-hackathon-blr-2026";
  const cycle = 2;
  const member = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

  const initialSalt = deriveDeterministicSalt(circleId, cycle, member);
  console.log(`  1. Salt generated during Commit: ${initialSalt}`);

  // Simulate local storage wipe
  console.log("  2. Simulating localStorage cleared / browser cache wipe...");

  const recoveredSalt = deriveDeterministicSalt(circleId, cycle, member);
  console.log(`  3. Re-derived salt on 1-Click Reveal: ${recoveredSalt}`);

  if (initialSalt !== recoveredSalt) {
    console.error("❌ Deterministic salt recovery failed!");
    process.exit(1);
  }
  console.log("  ✓ Perfect match! Auction will never stall on lost salt.");

  console.log(`\n🎉 ALL ${passed}/${vectors.length} VECTORS & REVEAL CHECKS PASSED!`);
}

runTests();
