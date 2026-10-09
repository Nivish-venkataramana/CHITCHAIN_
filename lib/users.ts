import usersFixture from "@/handoffs/fixtures/users.json";
import { UserProfile } from "@/handoffs/user-profile";
import { prisma } from "./prisma";

const isTestEnv = process.env.NODE_ENV === "test";

const g = globalThis as any;
if (!g.__chitchain_users__ || !isTestEnv) {
  g.__chitchain_users__ = isTestEnv ? [...(usersFixture as UserProfile[])] : [];
}

const users: UserProfile[] = g.__chitchain_users__;

// Hydrate from PostgreSQL database on startup
if (!isTestEnv) {
  prisma.user.findMany()
    .then((dbUsers) => {
      // Reset in-memory cache to strictly match database records
      users.length = 0;
      dbUsers.forEach((u) => {
        users.push({
          privyUserId: u.privyUserId || undefined,
          username: u.username,
          walletAddress: u.walletAddress as `0x${string}`,
          displayName: u.displayName,
          createdAt: u.createdAt.toISOString(),
        });
      });
    })
    .catch((err) => console.warn("Prisma user hydration notice:", err.message));
}

export function getFixtureUsers(): UserProfile[] {
  return users;
}

export async function searchUsers(q: string): Promise<UserProfile[]> {
  if (isTestEnv) {
    if (!q || !q.trim()) return users;
    const query = q.toLowerCase().trim().replace(/^@/, "");
    return users.filter(
      (u) =>
        u.username.toLowerCase().includes(query) ||
        u.displayName.toLowerCase().includes(query) ||
        u.walletAddress.toLowerCase().includes(query)
    );
  }

  try {
    const query = q ? q.toLowerCase().trim().replace(/^@/, "") : "";
    const dbUsers = await prisma.user.findMany({
      where: query
        ? {
            OR: [
              { username: { contains: query, mode: "insensitive" } },
              { displayName: { contains: query, mode: "insensitive" } },
              { walletAddress: { contains: query, mode: "insensitive" } },
            ],
          }
        : undefined,
      orderBy: { createdAt: "desc" },
    });

    return dbUsers.map((u) => ({
      privyUserId: u.privyUserId || undefined,
      username: u.username,
      walletAddress: u.walletAddress as `0x${string}`,
      displayName: u.displayName,
      createdAt: u.createdAt.toISOString(),
    }));
  } catch (err) {
    console.warn("Error searching users from database:", err);
    return users;
  }
}

export function getUserByUsername(username: string): UserProfile | undefined {
  const norm = username.toLowerCase().trim().replace(/^@/, "");
  return users.find((u) => u.username.toLowerCase() === norm);
}

export function getUserByWallet(address: string): UserProfile | undefined {
  const norm = address.toLowerCase().trim();
  return users.find((u) => u.walletAddress.toLowerCase() === norm);
}

export function deriveDeterministicAddress(seed: string): `0x${string}` {
  let hash = 0x811c9dc5;
  const cleanSeed = (seed || "chitchain_user").toLowerCase();
  for (let i = 0; i < cleanSeed.length; i++) {
    hash ^= cleanSeed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  let hex = "";
  let currentSeed = Math.abs(hash);
  for (let i = 0; i < 40; i++) {
    currentSeed = (currentSeed * 9301 + 49297) % 233280;
    hex += Math.floor((currentSeed / 233280) * 16).toString(16);
  }
  return `0x${hex}` as `0x${string}`;
}

export function syncUserAccount(params: {
  privyUserId?: string;
  username: string;
  walletAddress?: string;
  displayName?: string;
}): UserProfile {
  const cleanUsername = params.username.toLowerCase().trim().replace(/^@/, "");
  const rawWallet = (params.walletAddress || "").toLowerCase().trim();
  const isValidIncomingWallet = /^0x[a-f0-9]{40}$/i.test(rawWallet);
  const privyUserId = params.privyUserId?.trim();

  // 1. Search by privyUserId
  let user: UserProfile | undefined;
  if (privyUserId) {
    user = users.find((u) => u.privyUserId === privyUserId);
  }

  // 2. Search by username
  if (!user) {
    user = getUserByUsername(cleanUsername);
  }

  // 3. Search by walletAddress if incoming wallet is valid
  if (!user && isValidIncomingWallet) {
    user = getUserByWallet(rawWallet);
  }

  if (user) {
    if (privyUserId) user.privyUserId = privyUserId;
    if (cleanUsername) user.username = cleanUsername;
    // Only update wallet if incoming is a valid 40-hex wallet address
    if (isValidIncomingWallet) {
      user.walletAddress = rawWallet as `0x${string}`;
    }
    if (params.displayName) user.displayName = params.displayName;

    const finalWallet = user.walletAddress;

    // Synchronize pending invites and notifications for this user
    if (g.__chitchain_invites__) {
      g.__chitchain_invites__.forEach((inv: any) => {
        if (inv.inviteeUsername?.toLowerCase() === cleanUsername) {
          inv.inviteeWallet = finalWallet;
        }
      });
    }

    // Persist permanently in Neon PostgreSQL
    if (!isTestEnv && /^0x[a-f0-9]{40}$/i.test(finalWallet)) {
      prisma.user.upsert({
        where: { username: cleanUsername },
        update: {
          walletAddress: finalWallet,
          displayName: params.displayName || user.displayName || cleanUsername,
          privyUserId: privyUserId || user.privyUserId || undefined,
        },
        create: {
          username: cleanUsername,
          walletAddress: finalWallet,
          displayName: params.displayName || user.displayName || cleanUsername,
          privyUserId: privyUserId || undefined,
        },
      }).catch((err) => console.warn("Prisma user sync notice:", err.message));
    }

    return user;
  }

  // New User
  const finalWallet = (
    isValidIncomingWallet ? rawWallet : deriveDeterministicAddress(cleanUsername || privyUserId || "chitchain")
  ) as `0x${string}`;

  const newUser: UserProfile = {
    privyUserId,
    username: cleanUsername,
    walletAddress: finalWallet,
    displayName: params.displayName || cleanUsername,
    createdAt: new Date().toISOString(),
  };
  addUser(newUser);

  if (g.__chitchain_invites__) {
    g.__chitchain_invites__.forEach((inv: any) => {
      if (inv.inviteeUsername?.toLowerCase() === cleanUsername) {
        inv.inviteeWallet = finalWallet;
      }
    });
  }

  // Persist permanently in Neon PostgreSQL
  if (!isTestEnv && /^0x[a-f0-9]{40}$/i.test(finalWallet)) {
    prisma.user.upsert({
      where: { username: cleanUsername },
      update: {
        walletAddress: finalWallet,
        displayName: params.displayName || cleanUsername,
        privyUserId: privyUserId || undefined,
      },
      create: {
        username: cleanUsername,
        walletAddress: finalWallet,
        displayName: params.displayName || cleanUsername,
        privyUserId: privyUserId || undefined,
      },
    }).catch((err) => console.warn("Prisma user create notice:", err.message));
  }

  return newUser;
}

export function addUser(user: UserProfile) {
  const norm = user.username.toLowerCase().trim();
  const exists = users.some((u) => u.username.toLowerCase() === norm);
  if (!exists) {
    users.push(user);
  }

  if (!isTestEnv && /^0x[a-f0-9]{40}$/i.test(user.walletAddress)) {
    prisma.user.upsert({
      where: { username: norm },
      update: {
        walletAddress: user.walletAddress,
        displayName: user.displayName,
        privyUserId: user.privyUserId || undefined,
      },
      create: {
        username: norm,
        walletAddress: user.walletAddress,
        displayName: user.displayName,
        privyUserId: user.privyUserId || undefined,
      },
    }).catch((err) => console.warn("Prisma addUser notice:", err.message));
  }
}

export function getSessionUser(reqOrHeaders?: Headers | Request): UserProfile {
  let devUserHeader: string | null = null;
  let devWalletHeader: string | null = null;

  if (reqOrHeaders instanceof Request) {
    devUserHeader = reqOrHeaders.headers.get("x-dev-user");
    devWalletHeader = reqOrHeaders.headers.get("x-dev-wallet");
  } else if (reqOrHeaders) {
    devUserHeader = reqOrHeaders.get("x-dev-user");
    devWalletHeader = reqOrHeaders.get("x-dev-wallet");
  }

  if (devUserHeader) {
    let user = getUserByUsername(devUserHeader);
    if (user) {
      if (devWalletHeader && /^0x[a-f0-9]{40}$/i.test(devWalletHeader)) {
        user.walletAddress = devWalletHeader.toLowerCase() as `0x${string}`;
      }
      return user;
    }

    // Register dynamic Privy/embedded wallet user with deterministic address fallback
    const fallbackWallet = (
      devWalletHeader && /^0x[a-f0-9]{40}$/i.test(devWalletHeader)
        ? devWalletHeader
        : deriveDeterministicAddress(devUserHeader)
    ).toLowerCase() as `0x${string}`;

    const newUser: UserProfile = {
      username: devUserHeader.toLowerCase().trim(),
      walletAddress: fallbackWallet,
      displayName: devUserHeader,
      createdAt: new Date().toISOString(),
    };
    addUser(newUser);
    return newUser;
  }

  if (devWalletHeader) {
    let user = getUserByWallet(devWalletHeader);
    if (user) return user;
  }

  // Default to the first fixture user if no session header provided
  return users[0];
}

export const findUserByUsername = getUserByUsername;
export const addUserProfile = addUser;


