import { PrismaClient } from "@prisma/client";

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
    balanceAtCheck: "5000000000",
    createdAt: new Date(),
    respondedAt: new Date(),
  },
  {
    id: "inv-2",
    circleId: "sample-circle-4m-3mo",
    inviteeWallet: "0x2222222222222222222222222222222222222222",
    inviteeUsername: "vikramnair02",
    status: "ACCEPTED",
    balanceAtCheck: "4500000000",
    createdAt: new Date(),
    respondedAt: new Date(),
  },
  {
    id: "inv-3",
    circleId: "sample-circle-4m-3mo",
    inviteeWallet: "0x3333333333333333333333333333333333333333",
    inviteeUsername: "meerajoshi03",
    status: "ACCEPTED",
    balanceAtCheck: "3200000000",
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
  memoryInvites.push({
    id: `inv-${Date.now()}`,
    circleId: newCircle.id,
    inviteeWallet: data.volunteerWallet.toLowerCase(),
    inviteeUsername: data.volunteerUsername || "volunteer",
    status: "ACCEPTED",
    balanceAtCheck: "10000000000",
    createdAt: new Date(),
    respondedAt: new Date(),
  });

  return newCircle;
}

export async function getCirclesForUser(walletAddress: string): Promise<CircleRecord[]> {
  const normWallet = walletAddress.toLowerCase();
  // Find circles where user is volunteer or invited/member
  const userCircleIds = new Set<string>();

  memoryCircles.forEach((c) => {
    if (c.volunteerWallet.toLowerCase() === normWallet) {
      userCircleIds.add(c.id);
    }
  });

  memoryInvites.forEach((i) => {
    if (i.inviteeWallet.toLowerCase() === normWallet) {
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
