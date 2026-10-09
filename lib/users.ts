import usersFixture from "@/handoffs/fixtures/users.json";
import { UserProfile } from "@/handoffs/user-profile";

const isTestEnv = process.env.NODE_ENV === "test";

let users: UserProfile[] = isTestEnv ? [...(usersFixture as UserProfile[])] : [];

export function getFixtureUsers(): UserProfile[] {
  return users;
}

export function searchUsers(q: string): UserProfile[] {
  if (!q || !q.trim()) return users;
  const query = q.toLowerCase().trim().replace(/^@/, "");
  return users.filter(
    (u) =>
      u.username.toLowerCase().includes(query) ||
      u.displayName.toLowerCase().includes(query) ||
      u.walletAddress.toLowerCase().includes(query)
  );
}

export function getUserByUsername(username: string): UserProfile | undefined {
  const norm = username.toLowerCase().trim().replace(/^@/, "");
  return users.find((u) => u.username.toLowerCase() === norm);
}

export function getUserByWallet(address: string): UserProfile | undefined {
  const norm = address.toLowerCase().trim();
  return users.find((u) => u.walletAddress.toLowerCase() === norm);
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
