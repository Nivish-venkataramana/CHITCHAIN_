import { NextRequest, NextResponse } from "next/server";
import { syncUserAccount } from "@/lib/users";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { privyUserId, username, walletAddress, displayName } = body;

    if (!username || !walletAddress) {
      return NextResponse.json(
        { error: "username and walletAddress are required" },
        { status: 400 }
      );
    }

    const user = syncUserAccount({
      privyUserId,
      username,
      walletAddress,
      displayName,
    });

    return NextResponse.json(user, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to sync user account" },
      { status: 400 }
    );
  }
}
