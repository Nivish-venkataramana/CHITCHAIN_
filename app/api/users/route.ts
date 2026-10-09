import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server/requireUser";
import { createUserAccount, getAllUserProfiles } from "@/lib/account-store";
import { validateUsername } from "@/lib/username-rule";
import { UserProfile } from "@/handoffs/user-profile";

export const dynamic = "force-dynamic";

export async function GET() {
  const users = await getAllUserProfiles();
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const verified = await requireUser(req);
  if (!verified) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { displayName, username } = body;

    if (!displayName || !username) {
      return NextResponse.json(
        { error: "displayName and username are required." },
        { status: 400 }
      );
    }

    // Live validation against username rule (§7.5)
    const validation = validateUsername(displayName, username);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Strictly bind account to server-verified wallet address.
    // Client-supplied wallet in body is strictly ignored.
    const createdUser = await createUserAccount({
      displayName: displayName.trim(),
      username: username.toLowerCase().trim(),
      walletAddress: verified.walletAddress,
    });

    const userProfile: UserProfile = {
      username: createdUser.username,
      walletAddress: createdUser.walletAddress,
      displayName: createdUser.displayName,
    };

    return NextResponse.json(userProfile, { status: 201 });
  } catch (err: any) {
    console.error("User creation error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create user account" },
      { status: 400 }
    );
  }
}
