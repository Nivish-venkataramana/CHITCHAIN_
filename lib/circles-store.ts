import { fromBaseUnits } from "./validation";
import { getUserByUsername, getUserByWallet } from "./users";
import { FinalizedCircle } from "@/handoffs/finalized-circle";

export interface CircleRecord {
  id: string;
  name: string;
  volunteerWallet: string;
  volunteerUsername?: string;
  numPeople: number;
  monthlyAmount: string; // base units e.g. "1000000000"
  durationMonths: number;
  status: "INVITING" | "ISSUE_STAGE" | "FINALIZED";
  vaultAddress: string | null;
  createdAt: Date;
  finalizedAt: Date | null;
}

export interface InviteRecord {
  id: string;
  circleId: string;
  inviteeWallet: string;
  inviteeUsername: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  balanceAtCheck: string; // base units
  createdAt: Date;
  respondedAt: Date | null;
}

export interface IssueRecord {
  id: string;
  circleId: string;
  authorWallet: string;
  authorUsername: string;
  category: "PEOPLE_COUNT" | "DURATION" | "AMOUNT" | "PEOPLE_JOINED";
  targetMemberWallet: string | null;
  comment: string;
  status: "OPEN" | "RESOLVED";
  resolutionResponse: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
}

export interface NoIssueConfirmationRecord {
  circleId: string;
  memberWallet: string;
  confirmedAt: Date;
}

export interface NotificationRecord {
  id: string;
  userWallet: string;
  type: "JOIN_REQUEST" | "INVITE_ACCEPTED" | "INVITE_REJECTED" | "ISSUE_RAISED" | "ISSUE_RESOLVED" | "FINALIZED";
  circleId: string;
  inviteId?: string;
  circleName: string;
  volunteerName: string;
  body: string;
  readAt: Date | null;
  createdAt: Date;
}

// Simulated deterministic balances for fixture accounts
const simulatedBalances: Record<string, bigint> = {
  "0x1111111111111111111111111111111111111111": 10000_000000n, // Asha (10,000 USDC)
  "0x2222222222222222222222222222222222222222": 5000_000000n,  // Vikram (5,000 USDC)
  "0x3333333333333333333333333333333333333333": 4000_000000n,  // Meera (4,000 USDC)
  "0x4444444444444444444444444444444444444444": 3500_000000n,  // Rohan (3,500 USDC)
  "0x5555555555555555555555555555555555555555": 3000_000000n,  // Kavya (3,000 USDC)
  "0x6666666666666666666666666666666666666666": 400_000000n,   // Arjun (400 USDC -> Underfunded demo case)
};

// Global in-memory storage for dev & testing fallback
let memoryCircles: CircleRecord[] = [
  {
    id: "sample-circle-4m-3mo",
    name: "Alpha Friends Chit",
    volunteerWallet: "0x1111111111111111111111111111111111111111",
    volunteerUsername: "asharao01",
    numPeople: 4,
    monthlyAmount: "1000000000",
    durationMonths: 3,
    status: "FINALIZED",
    vaultAddress: null,
    createdAt: new Date(),
    finalizedAt: new Date(),
  },
  {
    id: "sample-circle-5m-4mo",
    name: "Beta Core Chit",
    volunteerWallet: "0x1111111111111111111111111111111111111111",
    volunteerUsername: "asharao01",
    numPeople: 5,
    monthlyAmount: "1000000000",
    durationMonths: 4,
    status: "ISSUE_STAGE",
    vaultAddress: null,
    createdAt: new Date(),
    finalizedAt: null,
  },
];

let memoryInvites: InviteRecord[] = [
  {
    id: "inv-1",
    circleId: "sample-circle-4m-3mo",
    inviteeWallet: "0x1111111111111111111111111111111111111111",
    inviteeUsername: "asharao01",
    status: "ACCEPTED",
    balanceAtCheck: "10000000000",
    createdAt: new Date(),
    respondedAt: new Date(),
  },
  {
    id: "inv-2",
    circleId: "sample-circle-4m-3mo",
    inviteeWallet: "0x2222222222222222222222222222222222222222",
    inviteeUsername: "vikramnair02",
    status: "ACCEPTED",
    balanceAtCheck: "5000000000",
    createdAt: new Date(),
    respondedAt: new Date(),
  },
  {
    id: "inv-3",
    circleId: "sample-circle-4m-3mo",
    inviteeWallet: "0x3333333333333333333333333333333333333333",
    inviteeUsername: "meerajoshi03",
    status: "ACCEPTED",
    balanceAtCheck: "4000000000",
    createdAt: new Date(),
    respondedAt: new Date(),
  },
  {
    id: "inv-4",
    circleId: "sample-circle-4m-3mo",
    inviteeWallet: "0x4444444444444444444444444444444444444444",
    inviteeUsername: "rohandas04",
    status: "ACCEPTED",
    balanceAtCheck: "3500000000",
    createdAt: new Date(),
    respondedAt: new Date(),
  },
];

let memoryIssues: IssueRecord[] = [
  {
    id: "issue-1",
    circleId: "sample-circle-5m-4mo",
    authorWallet: "0x2222222222222222222222222222222222222222",
    authorUsername: "vikramnair02",
    category: "DURATION",
    targetMemberWallet: null,
    comment: "Can we confirm 4 months is agreed instead of 3 months?",
    status: "RESOLVED",
    resolutionResponse: "4 months verified and agreed for 5 members.",
    createdAt: new Date(),
    resolvedAt: new Date(),
  },
];

let memoryConfirmations: NoIssueConfirmationRecord[] = [];
let memoryNotifications: NotificationRecord[] = [];

export async function getMemberBalance(walletAddress: string): Promise<bigint> {
  const norm = walletAddress.toLowerCase();
  return simulatedBalances[norm] ?? 5000_000000n;
}

export async function createCircleRecord(data: {
  name: string;
  volunteerWallet: string;
  volunteerUsername?: string;
  numPeople: number;
  monthlyAmount: string;
  durationMonths: number;
}): Promise<CircleRecord> {
  const newCircle: CircleRecord = {
    id: `circle-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: data.name,
    volunteerWallet: data.volunteerWallet.toLowerCase(),
    volunteerUsername: data.volunteerUsername,
    numPeople: data.numPeople,
    monthlyAmount: data.monthlyAmount,
    durationMonths: data.durationMonths,
    status: "INVITING",
    vaultAddress: null,
    createdAt: new Date(),
    finalizedAt: null,
  };

  memoryCircles.unshift(newCircle);

  // Automatically add volunteer as the first accepted invitee (DEFAULT D1)
  const volBalance = await getMemberBalance(data.volunteerWallet);
  memoryInvites.push({
    id: `inv-${Date.now()}`,
    circleId: newCircle.id,
    inviteeWallet: data.volunteerWallet.toLowerCase(),
    inviteeUsername: data.volunteerUsername || "volunteer",
    status: "ACCEPTED",
    balanceAtCheck: volBalance.toString(),
    createdAt: new Date(),
    respondedAt: new Date(),
  });

  return newCircle;
}

export async function createInviteRecord(params: {
  circleId: string;
  username: string;
  callerWallet: string;
}): Promise<{ invite: InviteRecord; circle: CircleRecord }> {
  const circle = memoryCircles.find((c) => c.id === params.circleId);
  if (!circle) throw new Error("Circle not found");

  if (circle.status !== "INVITING") {
    throw new Error("Cannot add members: Circle is not in INVITING stage");
  }

  if (circle.volunteerWallet.toLowerCase() !== params.callerWallet.toLowerCase()) {
    throw new Error("Only the volunteer organizer can send invites");
  }

  const candidate = getUserByUsername(params.username);
  if (!candidate) throw new Error(`User @${params.username} not found`);

  const existing = memoryInvites.find(
    (i) =>
      i.circleId === circle.id &&
      i.inviteeWallet.toLowerCase() === candidate.walletAddress.toLowerCase() &&
      i.status !== "REJECTED"
  );
  if (existing) {
    throw new Error(`@${candidate.username} is already invited or in the circle`);
  }

  const acceptedCount = memoryInvites.filter(
    (i) => i.circleId === circle.id && i.status === "ACCEPTED"
  ).length;
  if (acceptedCount >= circle.numPeople) {
    throw new Error("Circle is already full");
  }

  const monthlyBigInt = BigInt(circle.monthlyAmount);
  const requiredBalance = monthlyBigInt * 3n;
  const currentBalance = await getMemberBalance(candidate.walletAddress);

  if (currentBalance < requiredBalance) {
    const holdsUSDC = fromBaseUnits(currentBalance.toString());
    const needsUSDC = fromBaseUnits(requiredBalance.toString());
    throw new Error(
      `[${candidate.username}] holds ${holdsUSDC} USDC; needs at least ${needsUSDC} USDC (3 x monthly amount). Invite not sent.`
    );
  }

  const newInvite: InviteRecord = {
    id: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    circleId: circle.id,
    inviteeWallet: candidate.walletAddress.toLowerCase(),
    inviteeUsername: candidate.username,
    status: "PENDING",
    balanceAtCheck: currentBalance.toString(),
    createdAt: new Date(),
    respondedAt: null,
  };

  memoryInvites.push(newInvite);

  const volunteer = getUserByWallet(circle.volunteerWallet);
  const volunteerName = volunteer?.displayName || circle.volunteerUsername || "Volunteer Organizer";
  
  const notificationBody = `You were added to ${circle.name} by ${volunteerName}. Verify whether you want to join.`;
  memoryNotifications.unshift({
    id: `notif-${Date.now()}`,
    userWallet: candidate.walletAddress.toLowerCase(),
    type: "JOIN_REQUEST",
    circleId: circle.id,
    inviteId: newInvite.id,
    circleName: circle.name,
    volunteerName,
    body: notificationBody,
    readAt: null,
    createdAt: new Date(),
  });

  return { invite: newInvite, circle };
}

export async function respondToInvite(params: {
  inviteId: string;
  accept: boolean;
  userWallet: string;
}): Promise<{ invite: InviteRecord; circle: CircleRecord }> {
  const invite = memoryInvites.find((i) => i.id === params.inviteId);
  if (!invite) throw new Error("Invite not found");

  if (invite.inviteeWallet.toLowerCase() !== params.userWallet.toLowerCase()) {
    throw new Error("Unauthorized to respond to this invite");
  }

  if (invite.status !== "PENDING") {
    throw new Error(`Invite is already ${invite.status}`);
  }

  const circle = memoryCircles.find((c) => c.id === invite.circleId);
  if (!circle) throw new Error("Circle not found");

  invite.status = params.accept ? "ACCEPTED" : "REJECTED";
  invite.respondedAt = new Date();

  if (params.accept) {
    const acceptedCount = memoryInvites.filter(
      (i) => i.circleId === circle.id && i.status === "ACCEPTED"
    ).length;

    if (acceptedCount >= circle.numPeople) {
      circle.status = "ISSUE_STAGE";
      
      const allMembers = memoryInvites.filter(
        (i) => i.circleId === circle.id && i.status === "ACCEPTED"
      );
      allMembers.forEach((m) => {
        memoryNotifications.unshift({
          id: `notif-${Date.now()}-${m.inviteeUsername}`,
          userWallet: m.inviteeWallet.toLowerCase(),
          type: "ISSUE_RAISED",
          circleId: circle.id,
          circleName: circle.name,
          volunteerName: circle.volunteerUsername || "Volunteer",
          body: `All ${circle.numPeople} members joined "${circle.name}". Circle has entered the Issue Stage. Review terms now.`,
          readAt: null,
          createdAt: new Date(),
        });
      });
    }
  }

  return { invite, circle };
}

// ----------------------------------------------------------------------------
// Ujwal P4: Issues, Resolution & Finalization
// ----------------------------------------------------------------------------

export async function createIssueRecord(params: {
  circleId: string;
  authorWallet: string;
  category: "PEOPLE_COUNT" | "DURATION" | "AMOUNT" | "PEOPLE_JOINED";
  targetMemberWallet?: string | null;
  comment: string;
}): Promise<IssueRecord> {
  const circle = memoryCircles.find((c) => c.id === params.circleId);
  if (!circle) throw new Error("Circle not found");

  if (circle.status !== "ISSUE_STAGE") {
    throw new Error("Issues can only be raised during the ISSUE_STAGE");
  }

  if (!params.comment || params.comment.trim().length === 0) {
    throw new Error("A comment is required for every issue");
  }

  const author = getUserByWallet(params.authorWallet);
  const authorUsername = author?.username || "member";

  const newIssue: IssueRecord = {
    id: `issue-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    circleId: circle.id,
    authorWallet: params.authorWallet.toLowerCase(),
    authorUsername,
    category: params.category,
    targetMemberWallet: params.targetMemberWallet ? params.targetMemberWallet.toLowerCase() : null,
    comment: params.comment.trim(),
    status: "OPEN",
    resolutionResponse: null,
    createdAt: new Date(),
    resolvedAt: null,
  };

  memoryIssues.push(newIssue);

  // DEFAULT D10: A new issue clears all previous "No issues" confirmations!
  memoryConfirmations = memoryConfirmations.filter((c) => c.circleId !== circle.id);

  // Notify volunteer
  memoryNotifications.unshift({
    id: `notif-${Date.now()}`,
    userWallet: circle.volunteerWallet.toLowerCase(),
    type: "ISSUE_RAISED",
    circleId: circle.id,
    circleName: circle.name,
    volunteerName: circle.volunteerUsername || "Volunteer",
    body: `@${authorUsername} raised an issue on ${params.category}: "${params.comment.trim()}". Resolution required.`,
    readAt: null,
    createdAt: new Date(),
  });

  return newIssue;
}

export async function resolveIssueRecord(params: {
  issueId: string;
  volunteerWallet: string;
  response: string;
}): Promise<IssueRecord> {
  const issue = memoryIssues.find((i) => i.id === params.issueId);
  if (!issue) throw new Error("Issue not found");

  const circle = memoryCircles.find((c) => c.id === issue.circleId);
  if (!circle) throw new Error("Circle not found");

  if (circle.volunteerWallet.toLowerCase() !== params.volunteerWallet.toLowerCase()) {
    throw new Error("Only the volunteer organizer can resolve issues");
  }

  if (!params.response || params.response.trim().length === 0) {
    throw new Error("Resolution response is required");
  }

  issue.status = "RESOLVED";
  issue.resolutionResponse = params.response.trim();
  issue.resolvedAt = new Date();

  // Notify the issue author
  memoryNotifications.unshift({
    id: `notif-${Date.now()}`,
    userWallet: issue.authorWallet.toLowerCase(),
    type: "ISSUE_RESOLVED",
    circleId: circle.id,
    circleName: circle.name,
    volunteerName: circle.volunteerUsername || "Volunteer",
    body: `Your issue on ${issue.category} in "${circle.name}" was resolved: "${params.response.trim()}".`,
    readAt: null,
    createdAt: new Date(),
  });

  return issue;
}

export async function submitNoIssuesConfirmation(params: {
  circleId: string;
  memberWallet: string;
}): Promise<{ circle: CircleRecord; allConfirmed: boolean }> {
  const circle = memoryCircles.find((c) => c.id === params.circleId);
  if (!circle) throw new Error("Circle not found");

  if (circle.status !== "ISSUE_STAGE") {
    throw new Error("Can only submit 'No issues' during ISSUE_STAGE");
  }

  // Check if any OPEN issues exist in this circle
  const openIssues = memoryIssues.filter(
    (i) => i.circleId === circle.id && i.status === "OPEN"
  );
  if (openIssues.length > 0) {
    throw new Error("Cannot confirm 'No issues' while open issues remain unresolved");
  }

  const normMember = params.memberWallet.toLowerCase();
  
  // Record confirmation
  const existingConf = memoryConfirmations.find(
    (c) => c.circleId === circle.id && c.memberWallet.toLowerCase() === normMember
  );
  if (!existingConf) {
    memoryConfirmations.push({
      circleId: circle.id,
      memberWallet: normMember,
      confirmedAt: new Date(),
    });
  }

  // Check if ALL N members have confirmed
  const acceptedMembers = memoryInvites.filter(
    (i) => i.circleId === circle.id && i.status === "ACCEPTED"
  );
  const currentConfirmations = memoryConfirmations.filter((c) => c.circleId === circle.id);

  const allConfirmed = currentConfirmations.length >= acceptedMembers.length;

  if (allConfirmed) {
    circle.status = "FINALIZED";
    circle.finalizedAt = new Date();

    // Send FINALIZED notification to all members
    acceptedMembers.forEach((m) => {
      memoryNotifications.unshift({
        id: `notif-${Date.now()}-${m.inviteeUsername}`,
        userWallet: m.inviteeWallet.toLowerCase(),
        type: "FINALIZED",
        circleId: circle.id,
        circleName: circle.name,
        volunteerName: circle.volunteerUsername || "Volunteer",
        body: `"${circle.name}" terms are FINALIZED by all members! Proceed to Autopay setup.`,
        readAt: null,
        createdAt: new Date(),
      });
    });
  }

  return { circle, allConfirmed };
}

export async function getIssuesForCircle(circleId: string): Promise<{
  issues: IssueRecord[];
  confirmations: NoIssueConfirmationRecord[];
}> {
  const issues = memoryIssues.filter((i) => i.circleId === circleId);
  const confirmations = memoryConfirmations.filter((c) => c.circleId === circleId);
  return { issues, confirmations };
}

export async function getFinalizedCircle(circleId: string): Promise<FinalizedCircle | null> {
  const circle = memoryCircles.find((c) => c.id === circleId);
  if (!circle || circle.status !== "FINALIZED") {
    return null;
  }

  const acceptedMembers = memoryInvites
    .filter((i) => i.circleId === circle.id && i.status === "ACCEPTED")
    .map((i) => i.inviteeWallet as `0x${string}`);

  return {
    circleId: circle.id,
    name: circle.name,
    members: acceptedMembers,
    monthlyAmount: circle.monthlyAmount,
    durationMonths: circle.durationMonths,
    volunteer: circle.volunteerWallet as `0x${string}`,
  };
}

export async function getNotificationsForUser(walletAddress: string): Promise<NotificationRecord[]> {
  const norm = walletAddress.toLowerCase();
  return memoryNotifications.filter((n) => n.userWallet.toLowerCase() === norm);
}

export async function markNotificationRead(id: string, walletAddress: string): Promise<boolean> {
  const notif = memoryNotifications.find(
    (n) => n.id === id && n.userWallet.toLowerCase() === walletAddress.toLowerCase()
  );
  if (notif) {
    notif.readAt = new Date();
    return true;
  }
  return false;
}

export async function getCirclesForUser(walletAddress: string): Promise<CircleRecord[]> {
  const normWallet = walletAddress.toLowerCase();
  const userCircleIds = new Set<string>();

  memoryCircles.forEach((c) => {
    if (c.volunteerWallet.toLowerCase() === normWallet) {
      userCircleIds.add(c.id);
    }
  });

  memoryInvites.forEach((i) => {
    if (i.inviteeWallet.toLowerCase() === normWallet && i.status !== "REJECTED") {
      userCircleIds.add(i.circleId);
    }
  });

  return memoryCircles.filter((c) => userCircleIds.has(c.id));
}

export async function getCircleRecordById(id: string): Promise<{
  circle: CircleRecord | null;
  invites: InviteRecord[];
}> {
  const circle = memoryCircles.find((c) => c.id === id) || null;
  const invites = memoryInvites.filter((i) => i.circleId === id);
  return { circle, invites };
}

export async function getAllCircles(): Promise<CircleRecord[]> {
  return memoryCircles;
}
