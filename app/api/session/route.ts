import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server/requireUser";
import { getUserByWallet } from "@/lib/users";
import { UserProfile } from "@/handoffs/user-profile";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const verified = await requireUser(req);
  if (!verified) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = getUserByWallet(verified.walletAddress);
  if (profile) {
    return NextResponse.json(profile);
  }

  const userProfile: UserProfile = {
    username: verified.privyUserId?.replace("did:privy:", "") || `user_${verified.walletAddress.slice(2, 6)}`,
    walletAddress: verified.walletAddress,
    displayName: verified.privyUserId?.replace("did:privy:", "") || "User",
  };

  return NextResponse.json(userProfile);
}
