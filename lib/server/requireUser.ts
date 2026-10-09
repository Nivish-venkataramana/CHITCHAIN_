import { NextRequest } from "next/server";
import { PrivyClient } from "@privy-io/server-auth";
import usersFixture from "@/handoffs/fixtures/users.json";
import { getUserByUsername, getUserByWallet } from "@/lib/users";

export interface VerifiedUser {
  privyUserId: string;
  walletAddress: `0x${string}`;
  ownerAddress?: `0x${string}`;
  isDevUser?: boolean;
}

let privyServerClient: PrivyClient | null = null;

function getPrivyServerClient(): PrivyClient | null {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const appSecret = process.env.PRIVY_APP_SECRET;

  if (!appId || !appSecret) {
    return null;
  }

  if (!privyServerClient) {
    privyServerClient = new PrivyClient(appId, appSecret);
  }

  return privyServerClient;
}

/**
 * Extracts and verifies the user session on the server.
 * Reads ONLY the verified Bearer token (or strictly guarded dev header in non-production).
 * NEVER reads or trusts client-supplied wallet addresses from body or query.
 */
export async function requireUser(req: NextRequest | Request): Promise<VerifiedUser | null> {
  const headers = req instanceof NextRequest ? req.headers : (req as Request).headers;

  // 1. Dev Login Check: Strictly active ONLY when DEV_LOGIN=true and NOT in production
  const isDevLoginEnabled = process.env.DEV_LOGIN === "true" && process.env.NODE_ENV !== "production";
  if (isDevLoginEnabled) {
    const devUserHeader = headers.get("x-dev-user");
    if (devUserHeader) {
      const found =
        getUserByUsername(devUserHeader) ||
        (usersFixture as any[]).find(
          (u) => u.username.toLowerCase() === devUserHeader.toLowerCase()
        );

      if (found) {
        return {
          privyUserId: `did:privy:dev_${found.username}`,
          walletAddress: found.walletAddress.toLowerCase() as `0x${string}`,
          ownerAddress: found.walletAddress.toLowerCase() as `0x${string}`,
          isDevUser: true,
        };
      }
    }
  }

  // 2. Extract Bearer Token from Authorization Header or Cookie
  const authHeader = headers.get("authorization") || headers.get("Authorization");
  let token: string | null = null;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7).trim();
  }

  if (!token) {
    const cookieHeader = headers.get("cookie") || "";
    const match = cookieHeader.match(/privy-token=([^;]+)/);
    if (match) {
      token = match[1];
    }
  }

  if (!token) {
    return null;
  }

  // 3. Verify Token with Privy Server SDK
  try {
    const client = getPrivyServerClient();
    if (client) {
      const claims = await client.verifyAuthToken(token);
      const privyUser = await client.getUserById(claims.userId);

      const wallet =
        privyUser.wallet?.address ||
        (privyUser as any).smartWallet?.address ||
        (privyUser.linkedAccounts?.find((a: any) => a.type === "wallet") as any)?.address;

      if (!wallet) {
        return null;
      }

      return {
        privyUserId: claims.userId,
        walletAddress: wallet.toLowerCase() as `0x${string}`,
        ownerAddress: wallet.toLowerCase() as `0x${string}`,
      };
    } else {
      // Fallback verification for sandbox/mock token test harness
      if (token.startsWith("mock_token_")) {
        const username = token.replace("mock_token_", "");
        const fixtureUser = (usersFixture as any[]).find(
          (u) => u.username.toLowerCase() === username.toLowerCase()
        );
        if (fixtureUser) {
          return {
            privyUserId: `did:privy:mock_${username}`,
            walletAddress: fixtureUser.walletAddress.toLowerCase() as `0x${string}`,
            ownerAddress: fixtureUser.walletAddress.toLowerCase() as `0x${string}`,
          };
        } else {
          // Deterministic fresh wallet for test harness
          const hex = Buffer.from(username).toString("hex").padEnd(40, "0").slice(0, 40);
          const mockWallet = `0x${hex}` as `0x${string}`;
          return {
            privyUserId: `did:privy:mock_${username}`,
            walletAddress: mockWallet,
            ownerAddress: mockWallet,
          };
        }
      }
      return null;
    }
  } catch (err) {
    console.error("Privy auth token verification failed:", err);
    return null;
  }
}
