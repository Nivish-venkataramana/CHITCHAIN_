import usersFixture from "@/handoffs/fixtures/users.json";
import { UserProfile } from "@/handoffs/user-profile";

const isTestEnv = process.env.NODE_ENV === "test";

const g = globalThis as any;
if (!g.__chitchain_users__) {
  g.__chitchain_users__ = isTestEnv ? [...(usersFixture as UserProfile[])] : [];
}

const users: UserProfile[] = g.__chitchain_users__;

export function getFixtureUsers(): UserProfile[] {
  return users;
}

export function addUserProfile(profile: UserProfile): void {
  const normUser = profile.username.toLowerCase().trim();
  const normWallet = profile.walletAddress.toLowerCase().trim();

  // Remove any existing user with same username or wallet
  const existingIndex = users.findIndex(
    (u) =>
      u.username.toLowerCase().trim() === normUser ||
      u.walletAddress.toLowerCase().trim() === normWallet
  );

  if (existingIndex !== -1) {
    users[existingIndex] = {
      ...users[existingIndex],
      ...profile,
      username: normUser,
      walletAddress: normWallet as `0x${string}`,
    };
  } else {
    users.push({
      username: normUser,
      walletAddress: normWallet as `0x${string}`,
      displayName: profile.displayName.trim(),
    });
  }
}

export function searchUsers(q: string): UserProfile[] {
  if (!q || !q.trim()) return users.slice(0, 10);
  const query = q.toLowerCase().trim().replace(/^@/, "");
  return users
    .filter(
      (u) =>
        u.username.toLowerCase().includes(query) ||
        u.displayName.toLowerCase().includes(query) ||
        u.walletAddress.toLowerCase().includes(query)
    )
    .slice(0, 10);
}

export function getUserByUsername(username: string): UserProfile | undefined {
  const norm = username.toLowerCase().trim().replace(/^@/, "");
  return users.find((u) => u.username.toLowerCase() === norm);
}

export const findUserByUsername = getUserByUsername;

export function getUserByWallet(address: string): UserProfile | undefined {
  const norm = address.toLowerCase().trim();
  return users.find((u) => u.walletAddress.toLowerCase() === norm);
}

export function syncUserAccount(params: {
  username: string;
  walletAddress: string;
  displayName?: string;
}): UserProfile {
  const cleanUsername = params.username.toLowerCase().trim().replace(/^@/, "");
  const cleanWallet = (params.walletAddress || "").toLowerCase().trim() as `0x${string}`;

  let user = getUserByUsername(cleanUsername);
  if (user) {
    if (/^0x[a-f0-9]{40}$/i.test(cleanWallet)) {
      user.walletAddress = cleanWallet;
    }
    if (params.displayName) user.displayName = params.displayName;
    return user;
  }

  if (/^0x[a-f0-9]{40}$/i.test(cleanWallet)) {
    user = getUserByWallet(cleanWallet);
    if (user) {
      user.username = cleanUsername;
      if (params.displayName) user.displayName = params.displayName;
      return user;
    }
  }

  const newUser: UserProfile = {
    username: cleanUsername,
    walletAddress: cleanWallet,
    displayName: params.displayName || cleanUsername,
    createdAt: new Date().toISOString(),
  };
  addUser(newUser);
  return newUser;
}

export function addUser(user: UserProfile) {
  const norm = user.username.toLowerCase().trim();
  const exists = users.some((u) => u.username.toLowerCase() === norm);
  if (!exists) {
    users.push(user);
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

    // Register dynamic Privy/embedded wallet user
    const fallbackWallet = (devWalletHeader || `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`).toLowerCase() as `0x${string}`;
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
