import {
  createCircleRecord,
  createInviteRecord,
  respondToInvite,
  createIssueRecord,
  resolveIssueRecord,
  submitNoIssuesConfirmation,
  getFinalizedCircle,
  getCirclesForUser,
  getNotificationsForUser,
} from "../lib/circles-store";
import { validateCircleParams } from "../lib/validation";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

async function runEndToEndLifecycleTest() {
  console.log("==================================================================");
  console.log("▶ STARTING UJWAL END-TO-END CHITCHAIN CIRCLE LIFECYCLE TEST");
  console.log("==================================================================");

  // 1. Parameter Validation Gate
  console.log("\n[Step 1] Validating circle parameters for 4 members x 3 months x 1,000 USDC...");
  const validation = validateCircleParams({
    name: "E2E Super Circle",
    numPeople: 4,
    monthlyAmount: "1000",
    durationMonths: 3,
  });
  assert(validation.valid === true, "Validation should succeed for N=4, D=3");
  assert(validation.baseUnitAmount === "1000000000", "Base unit amount should be 1000000000");
  console.log("  ✔ Parameters validated successfully.");

  // 2. Create Circle as Volunteer (Asha Rao: 0x1111...)
  console.log("\n[Step 2] Creating circle by volunteer Asha Rao (@asharao01)...");
  const circle = await createCircleRecord({
    name: "E2E Super Circle",
    volunteerWallet: "0x1111111111111111111111111111111111111111",
    volunteerUsername: "asharao01",
    numPeople: 4,
    monthlyAmount: validation.baseUnitAmount!,
    durationMonths: 3,
  });
  assert(circle.status === "INVITING", "Circle should be in INVITING status");
  console.log(`  ✔ Circle created with ID: ${circle.id}`);

  // 3. Test 3x Balance Check Gate: Invite underfunded Arjun Patel (400 USDC)
  console.log("\n[Step 3] Testing 3x Balance Check: Inviting underfunded @arjunpatel06 (400 USDC)...");
  let underfundedRejected = false;
  try {
    await createInviteRecord({
      circleId: circle.id,
      username: "arjunpatel06",
      callerWallet: "0x1111111111111111111111111111111111111111",
    });
  } catch (err: any) {
    underfundedRejected = true;
    console.log(`  ✔ Underfunded invite blocked as expected: "${err.message}"`);
  }
  assert(underfundedRejected, "Candidate with < 3x balance must be blocked");

  // 4. Invite 3 Funded Members: Vikram, Meera, Rohan
  console.log("\n[Step 4] Inviting 3 funded members: @vikramnair02, @meerajoshi03, @rohandas04...");
  const { invite: inv1 } = await createInviteRecord({
    circleId: circle.id,
    username: "vikramnair02",
    callerWallet: "0x1111111111111111111111111111111111111111",
  });
  const { invite: inv2 } = await createInviteRecord({
    circleId: circle.id,
    username: "meerajoshi03",
    callerWallet: "0x1111111111111111111111111111111111111111",
  });
  const { invite: inv3 } = await createInviteRecord({
    circleId: circle.id,
    username: "rohandas04",
    callerWallet: "0x1111111111111111111111111111111111111111",
  });
  console.log("  ✔ All 3 invites dispatched.");

  // Verify notifications received
  const vikramNotifs = await getNotificationsForUser("0x2222222222222222222222222222222222222222");
  assert(
    vikramNotifs.some((n) => n.body.includes("You were added to E2E Super Circle by Asha Rao")),
    "Vikram should receive exact join notification copy"
  );
  console.log("  ✔ In-app notifications verified.");

  // 5. Members Respond (Accept) & Auto-flip to ISSUE_STAGE
  console.log("\n[Step 5] Members accepting join invites...");
  await respondToInvite({
    inviteId: inv1.id,
    accept: true,
    userWallet: "0x2222222222222222222222222222222222222222",
  });
  await respondToInvite({
    inviteId: inv2.id,
    accept: true,
    userWallet: "0x3333333333333333333333333333333333333333",
  });
  const { circle: filledCircle } = await respondToInvite({
    inviteId: inv3.id,
    accept: true,
    userWallet: "0x4444444444444444444444444444444444444444",
  });
  assert(
    filledCircle.status === "ISSUE_STAGE",
    "Circle should auto-transition to ISSUE_STAGE once all 4 members have joined"
  );
  console.log("  ✔ All 4 members joined. Circle automatically flipped to ISSUE_STAGE.");

  // 6. Raise Issue & Verify "No Issues" is Blocked
  console.log("\n[Step 6] Raising issue on DURATION...");
  const issue = await createIssueRecord({
    circleId: circle.id,
    authorWallet: "0x2222222222222222222222222222222222222222",
    category: "DURATION",
    comment: "Can we verify if 3 months is optimal for 4 people?",
  });
  assert(issue.status === "OPEN", "Issue should be OPEN");

  let noIssuesPrematureBlocked = false;
  try {
    await submitNoIssuesConfirmation({
      circleId: circle.id,
      memberWallet: "0x1111111111111111111111111111111111111111",
    });
  } catch {
    noIssuesPrematureBlocked = true;
  }
  assert(noIssuesPrematureBlocked, "Submitting No Issues while an issue is open must be blocked");
  console.log("  ✔ No Issues submission properly blocked while open issue exists.");

  // 7. Volunteer Resolves Issue
  console.log("\n[Step 7] Volunteer resolving the issue...");
  const resolvedIssue = await resolveIssueRecord({
    issueId: issue.id,
    volunteerWallet: "0x1111111111111111111111111111111111111111",
    response: "3 months ensures every cycle completes before final settlement.",
  });
  assert(resolvedIssue.status === "RESOLVED", "Issue must be RESOLVED");
  console.log("  ✔ Issue resolved with volunteer response.");

  // 8. All 4 Members Submit "No Issues"
  console.log("\n[Step 8] All 4 members submitting 'No issues' confirmations...");
  await submitNoIssuesConfirmation({
    circleId: circle.id,
    memberWallet: "0x1111111111111111111111111111111111111111", // Asha
  });
  await submitNoIssuesConfirmation({
    circleId: circle.id,
    memberWallet: "0x2222222222222222222222222222222222222222", // Vikram
  });
  await submitNoIssuesConfirmation({
    circleId: circle.id,
    memberWallet: "0x3333333333333333333333333333333333333333", // Meera
  });
  const { circle: finalizedCircle, allConfirmed } = await submitNoIssuesConfirmation({
    circleId: circle.id,
    memberWallet: "0x4444444444444444444444444444444444444444", // Rohan
  });
  assert(allConfirmed === true, "All 4 members should be confirmed");
  assert(finalizedCircle.status === "FINALIZED", "Circle should be FINALIZED");
  console.log("  ✔ All 4 members confirmed. Circle status is now FINALIZED.");

  // 9. Verify FinalizedCircle Hand-off Shape
  console.log("\n[Step 9] Verifying FinalizedCircle hand-off object for Pruthvik & Nivish...");
  const finalizedData = await getFinalizedCircle(circle.id);
  assert(finalizedData !== null, "Finalized circle object must exist");
  assert(finalizedData?.circleId === circle.id, "circleId must match");
  assert(finalizedData?.members.length === 4, "Must contain all 4 members (including volunteer)");
  assert(finalizedData?.monthlyAmount === "1000000000", "Monthly amount must be base units string");
  assert(finalizedData?.durationMonths === 3, "Duration months must be 3");
  assert(
    finalizedData?.volunteer === "0x1111111111111111111111111111111111111111",
    "Volunteer address must match"
  );
  console.log("  ✔ FinalizedCircle hand-off schema perfectly formatted and verified:");
  console.log(JSON.stringify(finalizedData, null, 2));

  console.log("\n==================================================================");
  console.log("🎉 ALL UJWAL LIFECYCLE TESTS PASSED 100% SUCCESSFULLY!");
  console.log("==================================================================");
}

runEndToEndLifecycleTest().catch((err) => {
  console.error("E2E Test Failed:", err);
  process.exit(1);
});
