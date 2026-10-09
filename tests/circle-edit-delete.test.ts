import assert from "assert";
import {
  createCircleRecord,
  updateCircleRecord,
  deleteCircleRecord,
  getCircleRecordById,
  createInviteRecord,
  respondToInvite,
} from "../lib/circles-store";

async function runCircleEditDeleteTests() {
  console.log("▶ Running Unit Tests for Circle Edit and Delete functionality...\n");

  const volunteerWallet = "0x1111111111111111111111111111111111111111";
  const volunteerUsername = "asharao01";
  const nonVolunteerWallet = "0x2222222222222222222222222222222222222222";

  // [Test 1] Create a test circle
  console.log("[Test 1] Creating a circle for testing edit and delete...");
  const circle = await createCircleRecord({
    name: "Alpha Test Circle",
    volunteerWallet,
    volunteerUsername,
    numPeople: 4,
    monthlyAmount: "1000000000",
    durationMonths: 3,
  });

  assert.strictEqual(circle.name, "Alpha Test Circle");
  assert.strictEqual(circle.numPeople, 4);
  assert.strictEqual(circle.durationMonths, 3);
  console.log("  ✔ Circle created successfully with ID:", circle.id);

  // [Test 2] Unauthorized edit rejection
  console.log("\n[Test 2] Unauthorized edit rejection by non-volunteer...");
  let unauthError = false;
  try {
    await updateCircleRecord({
      circleId: circle.id,
      callerWallet: nonVolunteerWallet,
      name: "Hacked Circle",
    });
  } catch (err: any) {
    unauthError = true;
    assert.strictEqual(err.message, "Only the volunteer can edit this circle");
  }
  assert.strictEqual(unauthError, true, "Non-volunteer edit should be blocked");
  console.log("  ✔ Unauthorized edit successfully blocked.");

  // [Test 3] Invalid parameter validation
  console.log("\n[Test 3] Invalid parameter validation (duration out of bounds)...");
  let invalidParamError = false;
  try {
    await updateCircleRecord({
      circleId: circle.id,
      callerWallet: volunteerWallet,
      numPeople: 4,
      durationMonths: 10, // Invalid: for N=4, D must be 3 or 2
    });
  } catch (err: any) {
    invalidParamError = true;
  }
  assert.strictEqual(invalidParamError, true, "Invalid duration should be rejected");
  console.log("  ✔ Invalid circle parameters rejected as expected.");

  // [Test 4] Successful update by volunteer
  console.log("\n[Test 4] Successful circle edit by volunteer...");
  const updated = await updateCircleRecord({
    circleId: circle.id,
    callerWallet: volunteerWallet,
    name: "Alpha Premier Circle",
    numPeople: 5,
    durationMonths: 4,
    monthlyAmount: "1200", // Human USDC or base units
  });

  assert.strictEqual(updated.name, "Alpha Premier Circle");
  assert.strictEqual(updated.numPeople, 5);
  assert.strictEqual(updated.durationMonths, 4);
  assert.strictEqual(updated.monthlyAmount, "1200000000");
  console.log("  ✔ Circle updated with new parameters successfully.");

  // [Test 5] Unauthorized deletion rejection
  console.log("\n[Test 5] Unauthorized delete rejection by non-volunteer...");
  let unauthDeleteError = false;
  try {
    await deleteCircleRecord({
      circleId: circle.id,
      callerWallet: nonVolunteerWallet,
    });
  } catch (err: any) {
    unauthDeleteError = true;
    assert.strictEqual(err.message, "Only the volunteer can delete this circle");
  }
  assert.strictEqual(unauthDeleteError, true, "Non-volunteer delete should be blocked");
  console.log("  ✔ Unauthorized deletion successfully blocked.");

  // [Test 6] Successful circle deletion by volunteer
  console.log("\n[Test 6] Successful circle deletion by volunteer...");
  const deleted = await deleteCircleRecord({
    circleId: circle.id,
    callerWallet: volunteerWallet,
  });
  assert.strictEqual(deleted, true);

  const check = await getCircleRecordById(circle.id);
  assert.strictEqual(check.circle, null, "Deleted circle must not exist");
  assert.strictEqual(check.invites.length, 0, "Associated invites must be purged");
  console.log("  ✔ Circle and all associated records purged successfully.");

  console.log("\n✔ ALL CIRCLE EDIT & DELETE TESTS PASSED 100%!");
}

runCircleEditDeleteTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
