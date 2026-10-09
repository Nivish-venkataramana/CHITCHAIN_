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
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const userProfile: UserProfile = {
    username: profile.username,
    walletAddress: profile.walletAddress,
    displayName: profile.displayName,
  };

  return NextResponse.json(userProfile);
}
