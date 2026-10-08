import { validateUsername } from "../lib/username-rule";
import {
  createUserAccount,
  mintFaucetTokens,
  getUserBalance,
  createCircleVaultAddress,
  grantAutopayMandate,
  revokeAutopayMandate,
  getAutopayStatusForCircle,
  startCircleVault,
} from "../lib/account-store";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

async function runAccountAutopayTests() {
  console.log("▶ Running Unit Tests for Pruthvik's Wallet, Account & Autopay...");

  // 1. Username Rule Validation
  {
    console.log("\n[Test 1] Username validation rules...");
    const valid1 = validateUsername("Asha Rao", "asharao01");
    assert(valid1.valid === true, "asharao01 should be valid for Asha Rao");

    const valid2 = validateUsername("Vikram Nair", "vikramnair99");
    assert(valid2.valid === true, "vikramnair99 should be valid for Vikram Nair");

    const invalidNameMissing = validateUsername("Asha Rao", "ashok01");
    assert(invalidNameMissing.valid === false, "ashok01 should be rejected for Asha Rao");

    const invalidExactName = validateUsername("Asha Rao", "asharao");
    assert(invalidExactName.valid === false, "asharao (no suffix) should be rejected");

    const invalidEmpty = validateUsername("", "asharao01");
    assert(invalidEmpty.valid === false, "Empty real name should be rejected");
    console.log("  ✔ Username rules verified.");
  }

  // 2. Account Registration & Uniqueness
  {
    console.log("\n[Test 2] Account creation and duplicate prevention...");
    const newUser = await createUserAccount({
      displayName: "Test User",
      username: "testuser01",
      walletAddress: "0x7777777777777777777777777777777777777777",
    });
    assert(newUser.username === "testuser01", "User should be registered");

    let duplicateCaught = false;
    try {
      await createUserAccount({
        displayName: "Test User 2",
        username: "testuser01",
        walletAddress: "0x8888888888888888888888888888888888888888",
      });
    } catch {
      duplicateCaught = true;
    }
    assert(duplicateCaught === true, "Duplicate username must be rejected");
    console.log("  ✔ Account registration & uniqueness verified.");
  }

  // 3. Gasless Faucet Minting
  {
    console.log("\n[Test 3] Gasless faucet MockUSDC minting...");
    const initialBal = await getUserBalance("0x7777777777777777777777777777777777777777");
    const updatedBal = await mintFaucetTokens("0x7777777777777777777777777777777777777777", 1000);
    assert(updatedBal === initialBal + 1000_000000n, "Balance must increase by 1,000 MockUSDC (6 decimals)");
    console.log("  ✔ Faucet minting verified.");
  }

  // 4. Autopay Mandate & Vault Start Flow
  {
    console.log("\n[Test 4] Autopay EIP-712 Mandate & Vault Start lifecycle...");
    const circleId = "sample-circle-4m-3mo"; // 4 members: Asha, Vikram, Meera, Rohan

    // Deploy vault
    const vaultAddr = await createCircleVaultAddress(circleId, "0x1111111111111111111111111111111111111111");
    assert(vaultAddr.startsWith("0x"), "Vault address must be created");

    // Check status before mandates
    const initialStatus = await getAutopayStatusForCircle(circleId);
    assert(initialStatus.canStart === false, "Cannot start before all members grant permission");

    // Grant 3 mandates
    await grantAutopayMandate({ circleId, memberWallet: "0x1111111111111111111111111111111111111111" });
    await grantAutopayMandate({ circleId, memberWallet: "0x2222222222222222222222222222222222222222" });
    await grantAutopayMandate({ circleId, memberWallet: "0x3333333333333333333333333333333333333333" });

    const midStatus = await getAutopayStatusForCircle(circleId);
    assert(midStatus.canStart === false, "Cannot start at 3/4 members");

    // Grant 4th mandate
    await grantAutopayMandate({ circleId, memberWallet: "0x4444444444444444444444444444444444444444" });

    const readyStatus = await getAutopayStatusForCircle(circleId);
    assert(readyStatus.canStart === true, "Ready to start when 4/4 granted");

    // Start vault
    const started = await startCircleVault(circleId, "0x1111111111111111111111111111111111111111");
    assert(started === true, "Vault should start successfully");

    // Test revoke
    const revoked = await revokeAutopayMandate({ circleId, memberWallet: "0x4444444444444444444444444444444444444444" });
    assert(revoked.status === "REVOKED", "Mandate status should be REVOKED");
    console.log("  ✔ Autopay mandate grant, revoke & vault start verified.");
  }

  console.log("\n✔ ALL PRUTHVIK WALLET, ACCOUNT & AUTOPAY TESTS PASSED 100%!");
}

runAccountAutopayTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
