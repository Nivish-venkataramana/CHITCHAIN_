import {
  createCircleRecord,
  createInviteRecord,
  respondToInvite,
  getNotificationsForUser,
  getCircleRecordById,
} from "../lib/circles-store";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

async function runInviteTests() {
  console.log("▶ Running Unit Tests for Invite Flow & 3-Month Balance Check...");

  // 1. Setup a test circle with N=3, monthly=1000 USDC (base units: 1000000000)
  const circle = await createCircleRecord({
    name: "Invite Test Circle",
    volunteerWallet: "0x1111111111111111111111111111111111111111", // Asha Rao (10,000 USDC)
    volunteerUsername: "asharao01",
    numPeople: 3,
    monthlyAmount: "1000000000",
    durationMonths: 2,
  });

  assert(circle.status === "INVITING", "New circle should start in INVITING stage");

  // 2. Test inviting candidate with sufficient balance (Vikram Nair: 5,000 USDC >= 3,000 USDC)
  const { invite: invite1 } = await createInviteRecord({
    circleId: circle.id,
    username: "vikramnair02",
    callerWallet: "0x1111111111111111111111111111111111111111",
  });

  assert(invite1.status === "PENDING", "Created invite should have status PENDING");
  assert(invite1.inviteeUsername === "vikramnair02", "Invitee username must match");

  // Verify notification was sent with exact text
  const vikramNotifs = await getNotificationsForUser("0x2222222222222222222222222222222222222222");
  assert(vikramNotifs.length > 0, "Notification must be delivered to invitee");
  assert(
    vikramNotifs[0].body.includes("You were added to Invite Test Circle by Asha Rao. Verify whether you want to join."),
    "Notification body must contain the exact join verification copy"
  );

  // 3. Test inviting underfunded candidate (Arjun Patel: 400 USDC < 3,000 USDC)
  let underfundedBlocked = false;
  try {
    await createInviteRecord({
      circleId: circle.id,
      username: "arjunpatel06",
      callerWallet: "0x1111111111111111111111111111111111111111",
    });
  } catch (err: any) {
    underfundedBlocked = true;
    assert(
      err.message.includes("needs at least 3000 USDC (3 x monthly amount)"),
      "Error message must specify current balance and 3x requirement"
    );
  }
  assert(underfundedBlocked === true, "Underfunded invitee must be blocked from receiving invite");

  // 4. Test invite accept response and auto-flip to ISSUE_STAGE when N=3 full
  const { circle: updatedCircle1 } = await respondToInvite({
    inviteId: invite1.id,
    accept: true,
    userWallet: "0x2222222222222222222222222222222222222222",
  });
  // Volunteer (1) + Vikram (1) = 2 of 3 -> still INVITING
  assert(updatedCircle1.status === "INVITING", "Circle should still be INVITING at 2/3 members");

  // Invite 3rd member (Meera: 4,000 USDC)
  const { invite: invite2 } = await createInviteRecord({
    circleId: circle.id,
    username: "meerajoshi03",
    callerWallet: "0x1111111111111111111111111111111111111111",
  });

  // Meera accepts -> 3/3 reached -> auto-flips to ISSUE_STAGE
  const { circle: finalCircle } = await respondToInvite({
    inviteId: invite2.id,
    accept: true,
    userWallet: "0x3333333333333333333333333333333333333333",
  });

  assert(
    finalCircle.status === "ISSUE_STAGE",
    "Circle must automatically flip to ISSUE_STAGE once all N=3 members have joined"
  );

  console.log("✔ All Invite & Balance Check Unit Tests PASSED Successfully!");
}

runInviteTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
