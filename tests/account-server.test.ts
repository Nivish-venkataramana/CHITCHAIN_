import { validateUsername } from "../lib/username-rule";
import { requireUser } from "../lib/server/requireUser";
import { createUserAccount } from "../lib/account-store";
import { searchUsers, getUserByUsername, getUserByWallet } from "../lib/users";
import { POST as handleCreateUser, GET as handleGetUsers } from "../app/api/users/route";
import { GET as handleGetSession } from "../app/api/session/route";
import { NextRequest } from "next/server";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

process.env.DEV_LOGIN = "true";
process.env.NODE_ENV = "test";

async function runAccountServerTests() {
  console.log("▶ Running Stage 4 Server & Username Rule Tests...");

  // 1. Username Rule Validation Tests
  {
    console.log("\n[Test 1] Username validation rules according to README §7.5:");

    // Accepts "asharao01" for "Asha Rao"
    const testAccept = validateUsername("Asha Rao", "asharao01");
    assert(testAccept.valid === true, "Should accept 'asharao01' for 'Asha Rao'");

    // Rejects "ashok"
    const testRejectMissing = validateUsername("Asha Rao", "ashok");
    assert(testRejectMissing.valid === false, "Should reject 'ashok' for 'Asha Rao'");

    // Rejects exactly "asharao" (requires username longer than real name)
    const testRejectExact = validateUsername("Asha Rao", "asharao");
    assert(testRejectExact.valid === false, "Should reject exact 'asharao' without suffix");

    // Rejects empty inputs
    const testEmptyName = validateUsername("", "asharao01");
    assert(testEmptyName.valid === false, "Should reject empty real name");

    console.log("  ✔ Accepted 'asharao01' for 'Asha Rao'");
    console.log("  ✔ Rejected 'ashok' for 'Asha Rao'");
    console.log("  ✔ Rejected exact match 'asharao' (length check enforced)");
  }

  // 2. Duplicate Username Rejection
  {
    console.log("\n[Test 2] Duplicate username rejection:");
    const wallet1 = "0x9999999999999999999999999999999999999991" as `0x${string}`;
    const wallet2 = "0x9999999999999999999999999999999999999992" as `0x${string}`;

    await createUserAccount({
      displayName: "Unique User",
      username: "uniqueuser01",
      walletAddress: wallet1,
    });

    let caughtDuplicate = false;
    try {
      await createUserAccount({
        displayName: "Unique User",
        username: "uniqueuser01",
        walletAddress: wallet2,
      });
    } catch (e: any) {
      caughtDuplicate = true;
      assert(
        e.message.includes("already taken"),
        "Error message should mention username is already taken"
      );
    }
    assert(caughtDuplicate, "Server must reject duplicate username registration");
    console.log("  ✔ Duplicate username registration was properly rejected with friendly error.");
  }

  // 3. 401 Without Token & 401 With Tampered Token
  {
    console.log("\n[Test 3] Server token verification (401 without token & 401 with tampered token):");

    // Without token
    const reqWithoutToken = new NextRequest("http://localhost:3000/api/session", {
      headers: {},
    });
    const sessionResWithout = await handleGetSession(reqWithoutToken);
    assert(
      sessionResWithout.status === 401,
      "Expected 401 Unauthorized for request without auth token"
    );
    console.log("  ✔ GET /api/session returned 401 when token is missing");

    // With tampered / invalid token
    const reqWithTamperedToken = new NextRequest("http://localhost:3000/api/session", {
      headers: {
        authorization: "Bearer invalid.tampered.token.12345",
      },
    });
    const sessionResTampered = await handleGetSession(reqWithTamperedToken);
    assert(
      sessionResTampered.status === 401,
      "Expected 401 Unauthorized for tampered token"
    );
    console.log("  ✔ GET /api/session returned 401 for tampered auth token");
  }

  // 4. Request Body Wallet is Ignored (Server-Verified Wallet is Bound)
  {
    console.log("\n[Test 4] Server strictly binds server-verified wallet (body wallet is ignored):");

    const tokenUser = "freshuser99";
    const hex = Buffer.from(tokenUser).toString("hex").padEnd(40, "0").slice(0, 40);
    const verifiedWallet = `0x${hex}`;
    const maliciousSpoofedWallet = "0xdeaddeaddeaddeaddeaddeaddeaddeaddeaddead";

    // Request carries Bearer token for freshuser99,
    // but body maliciously attempts to inject 0xdead...
    const req = new NextRequest("http://localhost:3000/api/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer mock_token_${tokenUser}`,
      },
      body: JSON.stringify({
        displayName: "Fresh User",
        username: "freshuser99",
        walletAddress: maliciousSpoofedWallet, // Attacker trying to spoof wallet
      }),
    });

    const res = await handleCreateUser(req);
    assert(res.status === 201, `User creation should succeed with 201, got ${res.status}`);
    const data = await res.json();

    assert(
      data.walletAddress.toLowerCase() === verifiedWallet.toLowerCase(),
      `Wallet must be the server-verified wallet (${verifiedWallet}), not the spoofed wallet (${maliciousSpoofedWallet})`
    );
    assert(
      data.walletAddress.toLowerCase() !== maliciousSpoofedWallet.toLowerCase(),
      "Spoofed wallet in request body must be completely ignored"
    );
    console.log("  ✔ Verified that client body wallet was ignored; server-verified wallet was bound.");
  }

  // 5. Dynamic User Lookup & Search Integration
  {
    console.log("\n[Test 5] Dynamic search & lookup API verifies newly created user:");
    const searched = searchUsers("freshuser99");
    assert(searched.length > 0, "Search endpoint should find newly registered user");
    assert(
      searched[0].username === "freshuser99",
      "Found user should match registered username"
    );

    const byName = getUserByUsername("freshuser99");
    assert(byName !== undefined, "getUserByUsername should find newly registered user");

    console.log("  ✔ Ujwal's search endpoints immediately find dynamically registered users.");
  }

  console.log("\n✔ ALL STAGE 4 SERVER & USERNAME TESTS PASSED 100%!");
}

runAccountServerTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
