import usersFixture from "@/handoffs/fixtures/users.json";
import { UserProfile } from "@/handoffs/user-profile";

let users: UserProfile[] = [...(usersFixture as UserProfile[])];

export function getFixtureUsers(): UserProfile[] {
  return users;
}

export function searchUsers(q: string): UserProfile[] {
  if (!q) return [];
  const query = q.toLowerCase();
  return users.filter(
    (u) =>
      u.username.toLowerCase().includes(query) ||
      u.displayName.toLowerCase().includes(query) ||
      u.walletAddress.toLowerCase().includes(query)
  ).slice(0, 10);
}

export function getUserByUsername(username: string): UserProfile | undefined {
  const norm = username.toLowerCase().trim();
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
  if (reqOrHeaders instanceof Request) {
    devUserHeader = reqOrHeaders.headers.get("x-dev-user");
  } else if (reqOrHeaders) {
    devUserHeader = reqOrHeaders.get("x-dev-user");
  }
  if (devUserHeader) {
    const user = getUserByUsername(devUserHeader);
    if (user) return user;
  }
  // Default to the first fixture user (Asha Rao - volunteer)
  return users[0];
}
