import { PrivyClient } from "@privy-io/server-auth";
import { NextRequest } from "next/server";
import { getUserByUsername, getUserByWallet, getSessionUser } from "./users";
import { UserProfile } from "@/handoffs/user-profile";

const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID || process.env.PRIVY_APP_ID;
const appSecret = process.env.PRIVY_APP_SECRET;

let privyClient: PrivyClient | null = null;

if (appId && appSecret) {
  try {
    privyClient = new PrivyClient(appId, appSecret);
  } catch (err) {
    console.warn("PrivyClient initialization skipped:", err);
  }
}

export interface VerifiedPrivySession {
  userId?: string;
  walletAddress?: string;
  user: UserProfile;
}

/**
 * Verifies the incoming request's Bearer JWT Access Token using Privy Server SDK.
 * Fallback to x-dev-user header for dev/test mode.
 */
export async function verifyPrivyAuth(
  req: NextRequest | Request | Headers
): Promise<VerifiedPrivySession> {
  let headers: Headers;
  if (req instanceof Request) {
    headers = req.headers;
  } else {
    headers = req;
  }

  const authHeader = headers.get("authorization") || headers.get("Authorization");
  const devUserHeader = headers.get("x-dev-user");

  // 1. Try cryptographic token verification if Bearer token and Privy secret are present
  if (authHeader && authHeader.startsWith("Bearer ") && privyClient) {
    const authToken = authHeader.replace(/^Bearer\s+/i, "").trim();
    try {
      const verifiedClaims = await privyClient.verifyAuthToken(authToken);
      const privyUserId = verifiedClaims.userId;

      // Lookup user in database/store by Privy DID or linked wallet
      const user = await privyClient.getUser(privyUserId);
      const primaryWallet =
        user?.wallet?.address ||
        user?.linkedAccounts?.find((a) => a.type === "wallet")?.address;

      if (primaryWallet) {
        const found = getUserByWallet(primaryWallet);
        if (found) {
          return { userId: privyUserId, walletAddress: primaryWallet, user: found };
        }

        // Return dynamically created profile for this verified wallet
        const dynamicUser: UserProfile = {
          username: `user_${primaryWallet.slice(2, 6).toLowerCase()}`,
          displayName: user.email?.address || `user_${primaryWallet.slice(2, 6).toLowerCase()}`,
          walletAddress: primaryWallet as `0x${string}`,
        };
        return { userId: privyUserId, walletAddress: primaryWallet, user: dynamicUser };
      }
    } catch (err) {
      console.warn("Privy token verification failed, checking dev session fallback:", err);
    }
  }

  // 2. Dev Session fallback (for local demo & test runner)
  const sessionUser = getSessionUser(headers);
  return {
    walletAddress: sessionUser.walletAddress,
    user: sessionUser,
  };
}
