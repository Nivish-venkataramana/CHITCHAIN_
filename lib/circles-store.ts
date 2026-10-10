import { fromBaseUnits, toBaseUnits, validateCircleParams } from "./validation";
import { getUserByUsername, getUserByWallet, addUser } from "./users";
import { FinalizedCircle } from "@/handoffs/finalized-circle";
import { prisma } from "./prisma";
import { getUserBalance } from "@/lib/account-store";

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
  type: "JOIN_REQUEST" | "INVITE_ACCEPTED" | "INVITE_REJECTED" | "ISSUE_RAISED" | "ISSUE_RESOLVED" | "FINALIZED" | "INVITE_RECEIVED";
  circleId: string;
  inviteId?: string;
  circleName: string;
  volunteerName: string;
  body: string;
  readAt: Date | null;
  createdAt: Date;
}

const isTestEnv = process.env.NODE_ENV === "test";
const g = globalThis as any;

// Simulated deterministic balances (only populated in test environment)
const simulatedBalances: Record<string, bigint> = isTestEnv
  ? {
      "0x1111111111111111111111111111111111111111": 10000_000000n, // Asha (10,000 USDC)
      "0x2222222222222222222222222222222222222222": 5000_000000n,  // Vikram (5,000 USDC)
      "0x3333333333333333333333333333333333333333": 4000_000000n,  // Meera (4,000 USDC)
      "0x4444444444444444444444444444444444444444": 3500_000000n,  // Rohan (3,500 USDC)
      "0x5555555555555555555555555555555555555555": 3000_000000n,  // Kavya (3,000 USDC)
      "0x6666666666666666666666666666666666666666": 400_000000n,   // Arjun (400 USDC -> Underfunded demo case)
    }
  : {};

// Global persistent storage across Next.js hot-reloads
if (!g.__chitchain_circles__) {
  g.__chitchain_circles__ = isTestEnv
    ? [
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
      ]
    : [];
}

if (!g.__chitchain_invites__) {
  g.__chitchain_invites__ = isTestEnv
    ? [
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
      ]
    : [];
}

if (!g.__chitchain_issues__) {
  g.__chitchain_issues__ = isTestEnv
    ? [
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
      ]
    : [];
}

if (!g.__chitchain_confirmations__) {
  g.__chitchain_confirmations__ = [];
}

if (!g.__chitchain_notifications__) {
  g.__chitchain_notifications__ = [];
}

const memoryCircles: CircleRecord[] = g.__chitchain_circles__;
const memoryInvites: InviteRecord[] = g.__chitchain_invites__;
const memoryIssues: IssueRecord[] = g.__chitchain_issues__;
const memoryConfirmations: NoIssueConfirmationRecord[] = g.__chitchain_confirmations__;
const memoryNotifications: NotificationRecord[] = g.__chitchain_notifications__;

// Helper to ensure a circle and its invites are synchronized from DB
async function ensureCircleLoaded(id: string): Promise<CircleRecord | null> {
  let circle = memoryCircles.find((c) => c.id === id);

  if (!isTestEnv) {
    try {
      const dbCircle = await prisma.circle.findUnique({ where: { id } });
      if (dbCircle) {
        const volUser = getUserByWallet(dbCircle.volunteerWallet);
        circle = {
          id: dbCircle.id,
          name: dbCircle.name,
          volunteerWallet: dbCircle.volunteerWallet,
          volunteerUsername: volUser?.username,
          numPeople: dbCircle.numPeople,
          monthlyAmount: dbCircle.monthlyAmount,
          durationMonths: dbCircle.durationMonths,
          status: dbCircle.status as any,
          vaultAddress: dbCircle.vaultAddress,
          createdAt: dbCircle.createdAt,
          finalizedAt: dbCircle.finalizedAt,
        };
        const existingIdx = memoryCircles.findIndex((c) => c.id === circle!.id);
        if (existingIdx !== -1) {
          memoryCircles[existingIdx] = circle;
        } else {
          memoryCircles.unshift(circle);
        }

        // Also sync invites for this circle from DB
        const dbInvites = await prisma.invite.findMany({ where: { circleId: id } });
        dbInvites.forEach((inv) => {
          const invIdx = memoryInvites.findIndex((i) => i.id === inv.id);
          const formatted: InviteRecord = {
            id: inv.id,
            circleId: inv.circleId,
            inviteeWallet: inv.inviteeWallet,
            inviteeUsername: inv.inviteeUsername,
            status: inv.status as any,
            balanceAtCheck: inv.balanceAtCheck,
            createdAt: inv.createdAt,
            respondedAt: inv.respondedAt,
          };
          if (invIdx !== -1) {
            memoryInvites[invIdx] = formatted;
          } else {
            memoryInvites.push(formatted);
          }
        });
      }
    } catch (err) {
      console.warn("ensureCircleLoaded DB lookup notice:", err);
    }
  }

  return circle || null;
}

export async function getMemberBalance(walletAddress?: string | null): Promise<bigint> {
  if (!walletAddress) {
    return 0n;
  }
  const norm = String(walletAddress).toLowerCase().trim();
  if (isTestEnv && simulatedBalances[norm] !== undefined) {
    return BigInt(simulatedBalances[norm]);
  }
  try {
    const bal = await getUserBalance(norm);
    if (typeof bal === "bigint") {
      return bal;
    }
    if (bal !== undefined && bal !== null) {
      return BigInt(bal);
    }
  } catch (err) {
    console.warn("getUserBalance lookup notice:", err);
  }
  return 20_000000n;
}

export async function createCircleRecord(data: {
  name: string;
  volunteerWallet: string;
  volunteerUsername?: string;
  numPeople: number;
  monthlyAmount: string;
  durationMonths: number;
}): Promise<CircleRecord> {
  const safeWallet = (data.volunteerWallet || "0x1111111111111111111111111111111111111111").toLowerCase();
  const safeUsername = data.volunteerUsername || "volunteer";
  const safeMonthlyAmount = data.monthlyAmount ? String(data.monthlyAmount) : "1000000000";

  const volBalance = await getMemberBalance(safeWallet);
  const monthlyBigInt = BigInt(safeMonthlyAmount);
  const requiredBalance = monthlyBigInt * 3n;

  if (volBalance < requiredBalance) {
    const holdsUSDC = fromBaseUnits((volBalance ?? 0n).toString());
    const needsUSDC = fromBaseUnits(requiredBalance.toString());
    throw new Error(
      `Creator [${safeUsername}] holds ${holdsUSDC} USDC; needs at least ${needsUSDC} USDC (3 x monthly amount). Circle creation blocked.`
    );
  }

  const newCircle: CircleRecord = {
    id: `circle-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: data.name || "Wealth Circle",
    volunteerWallet: safeWallet,
    volunteerUsername: safeUsername,
    numPeople: data.numPeople,
    monthlyAmount: safeMonthlyAmount,
    durationMonths: data.durationMonths,
    status: "INVITING",
    vaultAddress: null,
    createdAt: new Date(),
    finalizedAt: null,
  };

  memoryCircles.unshift(newCircle);

  // Automatically add volunteer as the first accepted invitee (DEFAULT D1)
  const volInvite: InviteRecord = {
    id: `inv-${Date.now()}`,
    circleId: newCircle.id,
    inviteeWallet: safeWallet,
    inviteeUsername: safeUsername,
    status: "ACCEPTED",
    balanceAtCheck: (volBalance ?? 0n).toString(),
    createdAt: new Date(),
    respondedAt: new Date(),
  };
  memoryInvites.push(volInvite);

  // Persist permanently in Neon PostgreSQL
  if (!isTestEnv) {
    try {
      await prisma.circle.create({
        data: {
          id: newCircle.id,
          name: newCircle.name,
          volunteerWallet: newCircle.volunteerWallet,
          numPeople: newCircle.numPeople,
          monthlyAmount: newCircle.monthlyAmount,
          durationMonths: newCircle.durationMonths,
          status: newCircle.status,
          vaultAddress: newCircle.vaultAddress,
          createdAt: newCircle.createdAt,
        },
      });

      await prisma.invite.create({
        data: {
          id: volInvite.id,
          circleId: volInvite.circleId,
          inviteeWallet: volInvite.inviteeWallet,
          inviteeUsername: volInvite.inviteeUsername,
          status: volInvite.status,
          balanceAtCheck: volInvite.balanceAtCheck,
          createdAt: volInvite.createdAt,
          respondedAt: volInvite.respondedAt,
        },
      });
    } catch (err: any) {
      console.warn("Prisma circle create notice:", err.message);
    }
  }

  return newCircle;
}

export async function updateCircleRecord(params: {
  circleId: string;
  callerWallet: string;
  name?: string;
  numPeople?: number;
  monthlyAmount?: string;
  durationMonths?: number;
}): Promise<CircleRecord> {
  const circle = await ensureCircleLoaded(params.circleId);
  if (!circle) throw new Error("Circle not found");

  if (circle.status === "FINALIZED") {
    throw new Error("Cannot edit a finalized circle");
  }

  if (circle.volunteerWallet.toLowerCase() !== params.callerWallet.toLowerCase()) {
    throw new Error("Only the volunteer can edit this circle");
  }

  const updatedName = params.name !== undefined ? params.name.trim() : circle.name;
  const updatedNumPeople = params.numPeople !== undefined ? Number(params.numPeople) : circle.numPeople;
  const updatedDurationMonths = params.durationMonths !== undefined ? Number(params.durationMonths) : circle.durationMonths;
  
  let updatedMonthlyAmount = circle.monthlyAmount;
  if (params.monthlyAmount !== undefined) {
    try {
      updatedMonthlyAmount = toBaseUnits(params.monthlyAmount);
    } catch {
      updatedMonthlyAmount = String(params.monthlyAmount);
    }
  }

  const validation = validateCircleParams({
    name: updatedName,
    numPeople: updatedNumPeople,
    monthlyAmount: fromBaseUnits(updatedMonthlyAmount),
    durationMonths: updatedDurationMonths,
  });

  if (!validation.valid) {
    throw new Error(validation.error || "Invalid circle parameters");
  }

  // Check that capacity is not reduced below accepted members
  const acceptedInvites = memoryInvites.filter(
    (i) => i.circleId === circle.id && i.status === "ACCEPTED"
  );
  if (updatedNumPeople < acceptedInvites.length) {
    throw new Error(
      `Cannot reduce capacity to ${updatedNumPeople}. There are already ${acceptedInvites.length} accepted members.`
    );
  }

  // Check 3x balance for volunteer if monthly amount increased
  const volBalance = await getMemberBalance(circle.volunteerWallet);
  const requiredBalance = BigInt(validation.baseUnitAmount || updatedMonthlyAmount) * 3n;
  if (volBalance < requiredBalance) {
    const holdsUSDC = fromBaseUnits(volBalance.toString());
    const needsUSDC = fromBaseUnits(requiredBalance.toString());
    throw new Error(
      `Volunteer holds ${holdsUSDC} USDC; needs at least ${needsUSDC} USDC for the updated monthly amount.`
    );
  }

  circle.name = updatedName;
  circle.numPeople = updatedNumPeople;
  circle.monthlyAmount = validation.baseUnitAmount || updatedMonthlyAmount;
  circle.durationMonths = updatedDurationMonths;

  // If accepted members now equals or exceeds new capacity, transition to ISSUE_STAGE if in INVITING
  if (circle.status === "INVITING" && acceptedInvites.length >= updatedNumPeople) {
    circle.status = "ISSUE_STAGE";
  }

  // Persist permanently in Neon PostgreSQL
  if (!isTestEnv) {
    try {
      await prisma.circle.update({
        where: { id: circle.id },
        data: {
          name: circle.name,
          numPeople: circle.numPeople,
          monthlyAmount: circle.monthlyAmount,
          durationMonths: circle.durationMonths,
          status: circle.status,
        },
      });
    } catch (err: any) {
      console.warn("Prisma circle update notice:", err.message);
    }
  }

  return circle;
}

export async function deleteCircleRecord(params: {
  circleId: string;
  callerWallet: string;
}): Promise<boolean> {
  const circle = await ensureCircleLoaded(params.circleId);
  if (!circle) throw new Error("Circle not found");

  if (circle.status === "FINALIZED") {
    throw new Error("Cannot delete a finalized circle");
  }

  if (circle.volunteerWallet.toLowerCase() !== params.callerWallet.toLowerCase()) {
    throw new Error("Only the volunteer can delete this circle");
  }

  const circleIndex = memoryCircles.findIndex((c) => c.id === params.circleId);
  if (circleIndex !== -1) {
    memoryCircles.splice(circleIndex, 1);
  }

  // Remove associated records from memory
  const remainingInvites = memoryInvites.filter((i) => i.circleId !== params.circleId);
  memoryInvites.splice(0, memoryInvites.length, ...remainingInvites);

  const remainingIssues = memoryIssues.filter((i) => i.circleId !== params.circleId);
  memoryIssues.splice(0, memoryIssues.length, ...remainingIssues);

  const remainingConfirmations = memoryConfirmations.filter((c) => c.circleId !== params.circleId);
  memoryConfirmations.splice(0, memoryConfirmations.length, ...remainingConfirmations);

  const remainingNotifs = memoryNotifications.filter((n) => n.circleId !== params.circleId);
  memoryNotifications.splice(0, memoryNotifications.length, ...remainingNotifs);

  // Persist permanently in Neon PostgreSQL
  if (!isTestEnv) {
    try {
      await prisma.circle.delete({ where: { id: params.circleId } });
      await prisma.invite.deleteMany({ where: { circleId: params.circleId } });
      await prisma.issue.deleteMany({ where: { circleId: params.circleId } });
      await prisma.noIssueConfirmation.deleteMany({ where: { circleId: params.circleId } });
      await prisma.notification.deleteMany({ where: { circleId: params.circleId } });
    } catch (err: any) {
      console.warn("Prisma circle delete notice:", err.message);
    }
  }

  return true;
}

export async function createInviteRecord(params: {
  circleId: string;
  username: string;
  callerWallet: string;
}): Promise<{ invite: InviteRecord; circle: CircleRecord }> {
  const circle = await ensureCircleLoaded(params.circleId);
  if (!circle) throw new Error("Circle not found");

  if (circle.status !== "INVITING") {
    throw new Error("Cannot add members: Circle is not in INVITING stage");
  }

  if (circle.volunteerWallet.toLowerCase() !== params.callerWallet.toLowerCase()) {
    throw new Error("Only the volunteer can send invites");
  }

  const cleanNorm = params.username.toLowerCase().trim().replace(/^@/, "");
  let candidate = getUserByUsername(cleanNorm);

  if (!candidate && !isTestEnv) {
    try {
      const dbUser = await prisma.user.findUnique({
        where: { username: cleanNorm },
      });
      if (dbUser) {
        candidate = {
          privyUserId: dbUser.privyUserId || undefined,
          username: dbUser.username,
          walletAddress: dbUser.walletAddress as `0x${string}`,
          displayName: dbUser.displayName,
          createdAt: dbUser.createdAt.toISOString(),
        };
        addUser(candidate);
      }
    } catch {}
  }

  if (!candidate) {
    throw new Error(`Account @${cleanNorm} does not exist in the database. Only registered accounts can be invited.`);
  }

  const existing = memoryInvites.find(
    (i) =>
      i.circleId === circle.id &&
      i.inviteeWallet.toLowerCase() === candidate!.walletAddress.toLowerCase() &&
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
      `Invitation failed due to insufficient balance: [${candidate.username}] holds ${holdsUSDC} USDC; needs at least ${needsUSDC} USDC (3 x monthly amount). Invite not sent.`
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
  const volunteerName = volunteer?.displayName || circle.volunteerUsername || "Volunteer";
  
  const notificationBody = `You were added to ${circle.name} by ${volunteerName}. Verify whether you want to join.`;
  const newNotif: NotificationRecord = {
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
  };
  memoryNotifications.unshift(newNotif);

  // Persist permanently in Neon PostgreSQL
  if (!isTestEnv) {
    try {
      await prisma.invite.upsert({
        where: { circleId_inviteeWallet: { circleId: circle.id, inviteeWallet: candidate.walletAddress.toLowerCase() } },
        update: {
          status: "PENDING",
          balanceAtCheck: currentBalance.toString(),
        },
        create: {
          id: newInvite.id,
          circleId: circle.id,
          inviteeWallet: candidate.walletAddress.toLowerCase(),
          inviteeUsername: candidate.username,
          status: "PENDING",
          balanceAtCheck: currentBalance.toString(),
        },
      });

      await prisma.notification.create({
        data: {
          id: newNotif.id,
          userWallet: newNotif.userWallet,
          type: newNotif.type,
          circleId: newNotif.circleId,
          body: newNotif.body,
        },
      });
    } catch (err: any) {
      console.warn("Prisma invite create notice:", err.message);
    }
  }

  return { invite: newInvite, circle };
}

export async function removeInviteRecord(params: {
  circleId: string;
  inviteId: string;
  callerWallet: string;
}): Promise<{ success: boolean; circle: CircleRecord }> {
  const circle = await ensureCircleLoaded(params.circleId);
  if (!circle) throw new Error("Circle not found");

  if (circle.status === "FINALIZED") {
    throw new Error("Cannot remove members from an activated / finalized circle");
  }

  if (circle.volunteerWallet.toLowerCase() !== params.callerWallet.toLowerCase()) {
    throw new Error("Only the volunteer can remove members");
  }

  const inviteIndex = memoryInvites.findIndex(
    (i) => i.id === params.inviteId && i.circleId === params.circleId
  );
  if (inviteIndex === -1) {
    throw new Error("Invite not found for this circle");
  }

  const invite = memoryInvites[inviteIndex];
  if (invite.inviteeWallet.toLowerCase() === circle.volunteerWallet.toLowerCase()) {
    throw new Error("Volunteer cannot remove themselves from the circle");
  }

  // Remove the invite
  memoryInvites.splice(inviteIndex, 1);

  // If circle was in ISSUE_STAGE and now accepted count < numPeople, revert to INVITING
  const remainingAccepted = memoryInvites.filter(
    (i) => i.circleId === circle.id && i.status === "ACCEPTED"
  ).length;

  if (circle.status === "ISSUE_STAGE" && remainingAccepted < circle.numPeople) {
    circle.status = "INVITING";
  }

  // Clean up any confirmations or issues by this removed member
  const remainingConfirmations = memoryConfirmations.filter(
    (c) => !(c.circleId === circle.id && c.memberWallet.toLowerCase() === invite.inviteeWallet.toLowerCase())
  );
  memoryConfirmations.splice(0, memoryConfirmations.length, ...remainingConfirmations);

  // Clean up notifications for this invite
  const remainingNotifs = memoryNotifications.filter(
    (n) => !(n.circleId === circle.id && n.userWallet.toLowerCase() === invite.inviteeWallet.toLowerCase() && n.type === "INVITE_RECEIVED")
  );
  memoryNotifications.splice(0, memoryNotifications.length, ...remainingNotifs);

  if (!isTestEnv) {
    try {
      await prisma.invite.delete({ where: { id: invite.id } });
      if (circle.status === "INVITING") {
        await prisma.circle.update({
          where: { id: circle.id },
          data: { status: "INVITING" },
        });
      }
    } catch (err: any) {
      console.warn("Prisma invite delete notice:", err.message);
    }
  }

  return { success: true, circle };
}

export async function respondToInvite(params: {
  inviteId: string;
  accept: boolean;
  userWallet: string;
}): Promise<{ invite: InviteRecord; circle: CircleRecord }> {
  let invite = memoryInvites.find((i) => i.id === params.inviteId);
  if (!invite && !isTestEnv) {
    try {
      const dbInv = await prisma.invite.findUnique({ where: { id: params.inviteId } });
      if (dbInv) {
        invite = {
          id: dbInv.id,
          circleId: dbInv.circleId,
          inviteeWallet: dbInv.inviteeWallet,
          inviteeUsername: dbInv.inviteeUsername,
          status: dbInv.status as any,
          balanceAtCheck: dbInv.balanceAtCheck,
          createdAt: dbInv.createdAt,
          respondedAt: dbInv.respondedAt,
        };
        memoryInvites.push(invite);
      }
    } catch {}
  }

  if (!invite) throw new Error("Invite not found");

  if (invite.inviteeWallet.toLowerCase() !== params.userWallet.toLowerCase()) {
    throw new Error("Unauthorized to respond to this invite");
  }

  if (invite.status !== "PENDING") {
    throw new Error(`Invite is already ${invite.status}`);
  }

  const circle = await ensureCircleLoaded(invite.circleId);
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
        const notif: NotificationRecord = {
          id: `notif-${Date.now()}-${m.inviteeUsername}`,
          userWallet: m.inviteeWallet.toLowerCase(),
          type: "ISSUE_RAISED",
          circleId: circle.id,
          circleName: circle.name,
          volunteerName: circle.volunteerUsername || "Volunteer",
          body: `All ${circle.numPeople} members joined "${circle.name}". Circle has entered the Issue Stage. Review terms now.`,
          readAt: null,
          createdAt: new Date(),
        };
        memoryNotifications.unshift(notif);

        if (!isTestEnv) {
          prisma.notification.create({
            data: {
              id: notif.id,
              userWallet: notif.userWallet,
              type: notif.type,
              circleId: notif.circleId,
              body: notif.body,
            },
          }).catch((err) => console.warn("Prisma notification create notice:", err.message));
        }
      });
    }
  }

  // Persist permanently in Neon PostgreSQL
  if (!isTestEnv) {
    try {
      await prisma.invite.update({
        where: { id: invite.id },
        data: {
          status: invite.status,
          respondedAt: invite.respondedAt,
        },
      });

      if (circle.status === "ISSUE_STAGE") {
        await prisma.circle.update({
          where: { id: circle.id },
          data: { status: "ISSUE_STAGE" },
        });
      }
    } catch (err: any) {
      console.warn("Prisma invite update notice:", err.message);
    }
  }

  return { invite, circle };
}

export async function createIssueRecord(params: {
  circleId: string;
  authorWallet: string;
  category: "PEOPLE_COUNT" | "DURATION" | "AMOUNT" | "PEOPLE_JOINED";
  targetMemberWallet?: string | null;
  comment: string;
}): Promise<IssueRecord> {
  const circle = await ensureCircleLoaded(params.circleId);
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
  const remainingConf = memoryConfirmations.filter((c) => c.circleId !== circle.id);
  memoryConfirmations.splice(0, memoryConfirmations.length, ...remainingConf);

  // Notify volunteer
  const notif: NotificationRecord = {
    id: `notif-${Date.now()}`,
    userWallet: circle.volunteerWallet.toLowerCase(),
    type: "ISSUE_RAISED",
    circleId: circle.id,
    circleName: circle.name,
    volunteerName: circle.volunteerUsername || "Volunteer",
    body: `@${authorUsername} raised an issue on ${params.category}: "${params.comment.trim()}". Resolution required.`,
    readAt: null,
    createdAt: new Date(),
  };
  memoryNotifications.unshift(notif);

  // Persist permanently in Neon PostgreSQL
  if (!isTestEnv) {
    try {
      await prisma.issue.create({
        data: {
          id: newIssue.id,
          circleId: newIssue.circleId,
          authorWallet: newIssue.authorWallet,
          category: newIssue.category,
          targetMemberWallet: newIssue.targetMemberWallet,
          comment: newIssue.comment,
          status: newIssue.status,
        },
      });

      await prisma.noIssueConfirmation.deleteMany({
        where: { circleId: circle.id },
      });

      await prisma.notification.create({
        data: {
          id: notif.id,
          userWallet: notif.userWallet,
          type: notif.type,
          circleId: notif.circleId,
          body: notif.body,
        },
      });
    } catch (err: any) {
      console.warn("Prisma issue create notice:", err.message);
    }
  }

  return newIssue;
}

export async function resolveIssueRecord(params: {
  issueId: string;
  volunteerWallet: string;
  response: string;
}): Promise<IssueRecord> {
  const issue = memoryIssues.find((i) => i.id === params.issueId);
  if (!issue) throw new Error("Issue not found");

  const circle = await ensureCircleLoaded(issue.circleId);
  if (!circle) throw new Error("Circle not found");

  if (circle.volunteerWallet.toLowerCase() !== params.volunteerWallet.toLowerCase()) {
    throw new Error("Only the volunteer can resolve issues");
  }

  if (!params.response || params.response.trim().length === 0) {
    throw new Error("Resolution response is required");
  }

  issue.status = "RESOLVED";
  issue.resolutionResponse = params.response.trim();
  issue.resolvedAt = new Date();

  // Notify the issue author
  const notif: NotificationRecord = {
    id: `notif-${Date.now()}`,
    userWallet: issue.authorWallet.toLowerCase(),
    type: "ISSUE_RESOLVED",
    circleId: circle.id,
    circleName: circle.name,
    volunteerName: circle.volunteerUsername || "Volunteer",
    body: `Your issue on ${issue.category} in "${circle.name}" was resolved: "${params.response.trim()}".`,
    readAt: null,
    createdAt: new Date(),
  };
  memoryNotifications.unshift(notif);

  // Persist permanently in Neon PostgreSQL
  if (!isTestEnv) {
    try {
      await prisma.issue.update({
        where: { id: issue.id },
        data: {
          status: "RESOLVED",
          resolutionResponse: issue.resolutionResponse,
          resolvedAt: issue.resolvedAt,
        },
      });

      await prisma.notification.create({
        data: {
          id: notif.id,
          userWallet: notif.userWallet,
          type: notif.type,
          circleId: notif.circleId,
          body: notif.body,
        },
      });
    } catch (err: any) {
      console.warn("Prisma issue resolve notice:", err.message);
    }
  }

  return issue;
}

export async function submitNoIssuesConfirmation(params: {
  circleId: string;
  memberWallet: string;
}): Promise<{ circle: CircleRecord; allConfirmed: boolean }> {
  const circle = await ensureCircleLoaded(params.circleId);
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

    // Send FINALIZED & Autopay mandate notification to all members
    acceptedMembers.forEach((m) => {
      const notif: NotificationRecord = {
        id: `notif-${Date.now()}-${m.inviteeUsername}`,
        userWallet: m.inviteeWallet.toLowerCase(),
        type: "FINALIZED",
        circleId: circle.id,
        circleName: circle.name,
        volunteerName: circle.volunteerUsername || "Volunteer",
        body: `"${circle.name}" has been activated! Please authorize your Autopay Mandate for monthly contributions starting 1st of next month.`,
        readAt: null,
        createdAt: new Date(),
      };
      memoryNotifications.unshift(notif);

      if (!isTestEnv) {
        prisma.notification.create({
          data: {
            id: notif.id,
            userWallet: notif.userWallet,
            type: notif.type,
            circleId: notif.circleId,
            body: notif.body,
          },
        }).catch((err) => console.warn("Prisma notification create notice:", err.message));
      }
    });
  }

  // Persist permanently in Neon PostgreSQL
  if (!isTestEnv) {
    try {
      await prisma.noIssueConfirmation.upsert({
        where: { circleId_memberWallet: { circleId: circle.id, memberWallet: normMember } },
        update: { confirmedAt: new Date() },
        create: { circleId: circle.id, memberWallet: normMember, confirmedAt: new Date() },
      });

      if (allConfirmed) {
        await prisma.circle.update({
          where: { id: circle.id },
          data: { status: "FINALIZED", finalizedAt: circle.finalizedAt },
        });
      }
    } catch (err: any) {
      console.warn("Prisma confirmation notice:", err.message);
    }
  }

  return { circle, allConfirmed };
}

export async function activateCircleRecord(params: {
  circleId: string;
  volunteerWallet: string;
}): Promise<CircleRecord> {
  const circle = await ensureCircleLoaded(params.circleId);
  if (!circle) throw new Error("Circle not found");

  if (circle.volunteerWallet.toLowerCase() !== params.volunteerWallet.toLowerCase()) {
    throw new Error("Only the volunteer can activate the circle");
  }

  if (circle.status === "FINALIZED") {
    return circle;
  }

  const openIssues = memoryIssues.filter(
    (i) => i.circleId === circle.id && i.status === "OPEN"
  );
  if (openIssues.length > 0) {
    throw new Error("Cannot activate circle while open issues remain unresolved");
  }

  const acceptedMembers = memoryInvites.filter(
    (i) => i.circleId === circle.id && i.status === "ACCEPTED"
  );

  // Volunteer confirms their own No issues automatically on activation
  const normVol = params.volunteerWallet.toLowerCase();
  if (!memoryConfirmations.some((c) => c.circleId === circle.id && c.memberWallet.toLowerCase() === normVol)) {
    memoryConfirmations.push({
      circleId: circle.id,
      memberWallet: normVol,
      confirmedAt: new Date(),
    });
  }

  const currentConfirmations = memoryConfirmations.filter((c) => c.circleId === circle.id);
  if (currentConfirmations.length < acceptedMembers.length) {
    throw new Error(
      `Cannot activate circle: Only ${currentConfirmations.length} of ${acceptedMembers.length} members have confirmed 'No issues'`
    );
  }

  circle.status = "FINALIZED";
  circle.finalizedAt = new Date();

  // Send Autopay Mandate notification to every member
  acceptedMembers.forEach((m) => {
    const notif: NotificationRecord = {
      id: `notif-${Date.now()}-${m.inviteeUsername}-autopay`,
      userWallet: m.inviteeWallet.toLowerCase(),
      type: "FINALIZED",
      circleId: circle.id,
      circleName: circle.name,
      volunteerName: circle.volunteerUsername || "Volunteer",
      body: `"${circle.name}" has been activated! Please authorize your Autopay Mandate for monthly contributions starting 1st of next month.`,
      readAt: null,
      createdAt: new Date(),
    };
    memoryNotifications.unshift(notif);

    if (!isTestEnv) {
      prisma.notification.create({
        data: {
          id: notif.id,
          userWallet: notif.userWallet,
          type: notif.type,
          circleId: notif.circleId,
          body: notif.body,
        },
      }).catch((err) => console.warn("Prisma notification create notice:", err.message));
    }
  });

  // Persist permanently in Neon PostgreSQL
  if (!isTestEnv) {
    try {
      await prisma.circle.update({
        where: { id: circle.id },
        data: { status: "FINALIZED", finalizedAt: circle.finalizedAt },
      });

      await prisma.noIssueConfirmation.upsert({
        where: { circleId_memberWallet: { circleId: circle.id, memberWallet: normVol } },
        update: { confirmedAt: new Date() },
        create: { circleId: circle.id, memberWallet: normVol, confirmedAt: new Date() },
      });
    } catch (err: any) {
      console.warn("Prisma activate circle notice:", err.message);
    }
  }

  return circle;
}

export async function getIssuesForCircle(circleId: string): Promise<{
  issues: IssueRecord[];
  confirmations: NoIssueConfirmationRecord[];
}> {
  await ensureCircleLoaded(circleId);

  if (!isTestEnv) {
    try {
      const [dbIssues, dbConfirmations] = await Promise.all([
        prisma.issue.findMany({ where: { circleId }, orderBy: { createdAt: "asc" } }),
        prisma.noIssueConfirmation.findMany({ where: { circleId } }),
      ]);

      dbIssues.forEach((iss) => {
        const author = getUserByWallet(iss.authorWallet);
        const idx = memoryIssues.findIndex((i) => i.id === iss.id);
        const item: IssueRecord = {
          id: iss.id,
          circleId: iss.circleId,
          authorWallet: iss.authorWallet,
          authorUsername: author?.username || "member",
          category: iss.category as any,
          targetMemberWallet: iss.targetMemberWallet,
          comment: iss.comment,
          status: iss.status as any,
          resolutionResponse: iss.resolutionResponse,
          createdAt: iss.createdAt,
          resolvedAt: iss.resolvedAt,
        };
        if (idx !== -1) memoryIssues[idx] = item;
        else memoryIssues.push(item);
      });

      dbConfirmations.forEach((conf) => {
        const idx = memoryConfirmations.findIndex(
          (c) => c.circleId === conf.circleId && c.memberWallet === conf.memberWallet
        );
        const item: NoIssueConfirmationRecord = {
          circleId: conf.circleId,
          memberWallet: conf.memberWallet,
          confirmedAt: conf.confirmedAt,
        };
        if (idx !== -1) memoryConfirmations[idx] = item;
        else memoryConfirmations.push(item);
      });
    } catch (err) {
      console.warn("getIssuesForCircle DB lookup notice:", err);
    }
  }

  const issues = memoryIssues.filter((i) => i.circleId === circleId);
  const confirmations = memoryConfirmations.filter((c) => c.circleId === circleId);
  return { issues, confirmations };
}

export async function getFinalizedCircle(circleId: string): Promise<FinalizedCircle | null> {
  const circle = await ensureCircleLoaded(circleId);
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

export async function getNotificationsForUser(walletAddress: string, username?: string): Promise<NotificationRecord[]> {
  const normWallet = (walletAddress || "").toLowerCase();
  const normUser = (username || "").toLowerCase().replace(/^@/, "");

  if (!isTestEnv && normWallet) {
    try {
      const dbNotifs = await prisma.notification.findMany({
        where: { userWallet: normWallet },
        orderBy: { createdAt: "desc" },
      });
      dbNotifs.forEach((n) => {
        const idx = memoryNotifications.findIndex((item) => item.id === n.id);
        const item: NotificationRecord = {
          id: n.id,
          userWallet: n.userWallet,
          type: n.type as any,
          circleId: n.circleId,
          circleName: "Circle",
          volunteerName: "Volunteer",
          body: n.body,
          readAt: n.readAt,
          createdAt: n.createdAt,
        };
        if (idx !== -1) memoryNotifications[idx] = item;
        else memoryNotifications.push(item);
      });
    } catch {}
  }

  const matchedWallets = new Set<string>();
  if (normWallet) matchedWallets.add(normWallet);
  if (normUser) {
    const u = getUserByUsername(normUser);
    if (u?.walletAddress) matchedWallets.add(u.walletAddress.toLowerCase());
  }

  return memoryNotifications.filter((n) => {
    return (
      matchedWallets.has(n.userWallet.toLowerCase()) ||
      (normUser && (n as any).inviteeUsername?.toLowerCase() === normUser)
    );
  });
}

export async function markNotificationRead(id: string, walletAddress: string): Promise<boolean> {
  const notif = memoryNotifications.find(
    (n) => n.id === id && n.userWallet.toLowerCase() === walletAddress.toLowerCase()
  );
  if (notif) {
    notif.readAt = new Date();
    if (!isTestEnv) {
      try {
        await prisma.notification.updateMany({
          where: { id: notif.id, userWallet: walletAddress.toLowerCase() },
          data: { readAt: notif.readAt },
        });
      } catch (err: any) {
        console.warn("Prisma mark notif read notice:", err.message);
      }
    }
    return true;
  }
  return false;
}

export async function getAllCircles(): Promise<CircleRecord[]> {
  if (!isTestEnv) {
    try {
      const dbCircles = await prisma.circle.findMany({ orderBy: { createdAt: "desc" } });
      dbCircles.forEach((c) => {
        const existingIdx = memoryCircles.findIndex((existing) => existing.id === c.id);
        const volUser = getUserByWallet(c.volunteerWallet);
        const item: CircleRecord = {
          id: c.id,
          name: c.name,
          volunteerWallet: c.volunteerWallet,
          volunteerUsername: volUser?.username,
          numPeople: c.numPeople,
          monthlyAmount: c.monthlyAmount,
          durationMonths: c.durationMonths,
          status: c.status as any,
          vaultAddress: c.vaultAddress,
          createdAt: c.createdAt,
          finalizedAt: c.finalizedAt,
        };
        if (existingIdx !== -1) {
          memoryCircles[existingIdx] = item;
        } else {
          memoryCircles.push(item);
        }
      });
    } catch (err) {
      console.warn("getAllCircles DB fetch notice:", err);
    }
  }
  return memoryCircles;
}

export async function getCirclesForUser(walletAddress: string, username?: string): Promise<CircleRecord[]> {
  await getAllCircles();

  const normWallet = (walletAddress || "").toLowerCase().trim();
  const normUser = (username || "").toLowerCase().trim().replace(/^@/, "");

  const matchedWallets = new Set<string>();
  if (normWallet) matchedWallets.add(normWallet);
  if (normUser) {
    const u = getUserByUsername(normUser);
    if (u?.walletAddress) matchedWallets.add(u.walletAddress.toLowerCase());
  }

  const userCircleIds = new Set<string>();

  memoryCircles.forEach((c) => {
    if (
      matchedWallets.has(c.volunteerWallet.toLowerCase()) ||
      (normUser && c.volunteerUsername?.toLowerCase() === normUser)
    ) {
      userCircleIds.add(c.id);
    }
  });

  memoryInvites.forEach((i) => {
    if (
      (matchedWallets.has(i.inviteeWallet.toLowerCase()) ||
        (normUser && i.inviteeUsername.toLowerCase() === normUser)) &&
      i.status !== "REJECTED"
    ) {
      userCircleIds.add(i.circleId);
    }
  });

  return memoryCircles.filter((c) => userCircleIds.has(c.id));
}

export async function getCircleRecordById(id: string): Promise<{
  circle: CircleRecord | null;
  invites: InviteRecord[];
}> {
  const circle = await ensureCircleLoaded(id);
  if (!circle) {
    return { circle: null, invites: [] };
  }
  const invites = memoryInvites.filter((i) => i.circleId === id);
  return { circle, invites };
}
