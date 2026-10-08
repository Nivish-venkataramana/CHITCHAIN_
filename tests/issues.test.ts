import {
  createCircleRecord,
  createInviteRecord,
  respondToInvite,
  createIssueRecord,
  resolveIssueRecord,
  submitNoIssuesConfirmation,
  getFinalizedCircle,
} from "../lib/circles-store";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

async function runIssueTests() {
  console.log("▶ Running Unit Tests for Issues, Resolution, and Finalization...");

  // 1. Setup a test circle with N=2 (Asha volunteer + Vikram member)
  const circle = await createCircleRecord({
    name: "Finalize Test Circle",
    volunteerWallet: "0x1111111111111111111111111111111111111111",
    volunteerUsername: "asharao01",
    numPeople: 2,
    monthlyAmount: "1000000000",
    durationMonths: 1,
  });

  // Invite Vikram
  const { invite } = await createInviteRecord({
    circleId: circle.id,
    username: "vikramnair02",
    callerWallet: "0x1111111111111111111111111111111111111111",
  });

  // Vikram accepts -> circle transitions to ISSUE_STAGE
  await respondToInvite({
    inviteId: invite.id,
    accept: true,
    userWallet: "0x2222222222222222222222222222222222222222",
  });

  // Before finalization, GET finalized returns null
  const beforeFinalized = await getFinalizedCircle(circle.id);
  assert(beforeFinalized === null, "getFinalizedCircle must return null before circle is finalized");

  // 2. Test raising an issue without comment -> should throw
  let emptyCommentCaught = false;
  try {
    await createIssueRecord({
      circleId: circle.id,
      authorWallet: "0x2222222222222222222222222222222222222222",
      category: "DURATION",
      comment: "",
    });
  } catch {
    emptyCommentCaught = true;
  }
  assert(emptyCommentCaught === true, "Issue with empty comment must be rejected");

  // 3. Member raises valid issue
  const issue = await createIssueRecord({
    circleId: circle.id,
    authorWallet: "0x2222222222222222222222222222222222222222",
    category: "DURATION",
    comment: "Can we double check if 1 month tenure is sufficient?",
  });
  assert(issue.status === "OPEN", "New issue must have status OPEN");

  // 4. Test submitting 'No issues' while open issue exists -> should be blocked
  let noIssuesBlocked = false;
  try {
    await submitNoIssuesConfirmation({
      circleId: circle.id,
      memberWallet: "0x1111111111111111111111111111111111111111",
    });
  } catch (err: any) {
    noIssuesBlocked = true;
    assert(
      err.message.includes("Cannot confirm 'No issues' while open issues remain"),
      "Must throw error about unresolved open issues"
    );
  }
  assert(noIssuesBlocked === true, "Submit No Issues must be blocked while open issues exist");

  // 5. Volunteer resolves the issue
  const resolved = await resolveIssueRecord({
    issueId: issue.id,
    volunteerWallet: "0x1111111111111111111111111111111111111111",
    response: "Yes, 1 month duration for 2 members satisfies the N-1 condition perfectly.",
  });
  assert(resolved.status === "RESOLVED", "Issue must be RESOLVED");
  assert(resolved.resolutionResponse !== null, "Resolution response must be recorded");

  // 6. Test DEFAULT D10: Member confirms No issues, then a new issue is raised -> resets confirmations
  await submitNoIssuesConfirmation({
    circleId: circle.id,
    memberWallet: "0x1111111111111111111111111111111111111111",
  });

  // Raise 2nd issue
  const issue2 = await createIssueRecord({
    circleId: circle.id,
    authorWallet: "0x2222222222222222222222222222222222222222",
    category: "AMOUNT",
    comment: "Confirming 1000 USDC monthly.",
  });

  // Resolve 2nd issue
  await resolveIssueRecord({
    issueId: issue2.id,
    volunteerWallet: "0x1111111111111111111111111111111111111111",
    response: "Confirmed.",
  });

  // 7. Both members submit No issues
  const { allConfirmed: firstConf } = await submitNoIssuesConfirmation({
    circleId: circle.id,
    memberWallet: "0x1111111111111111111111111111111111111111", // Asha
  });
  assert(firstConf === false, "First confirmation (1 of 2) should not finalize");

  const { circle: finalCircle, allConfirmed: secondConf } = await submitNoIssuesConfirmation({
    circleId: circle.id,
    memberWallet: "0x2222222222222222222222222222222222222222", // Vikram
  });
  assert(secondConf === true, "Second confirmation (2 of 2) should finalize");
  assert(finalCircle.status === "FINALIZED", "Circle status must become FINALIZED");

  // 8. Test getFinalizedCircle endpoint handoff shape
  const finalized = await getFinalizedCircle(circle.id);
  assert(finalized !== null, "FinalizedCircle must not be null");
  assert(finalized?.circleId === circle.id, "circleId must match");
  assert(finalized?.members.length === 2, "members array must contain both volunteer and invitee");
  assert(finalized?.monthlyAmount === "1000000000", "monthlyAmount must be base units");
  assert(finalized?.durationMonths === 1, "durationMonths must match");
  assert(finalized?.volunteer === "0x1111111111111111111111111111111111111111", "volunteer wallet must match");

  console.log("✔ All Issues, Resolution & Finalization Unit Tests PASSED Successfully!");
}

runIssueTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
