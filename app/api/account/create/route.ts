import { NextRequest, NextResponse } from "next/server";
import { createUserAccount } from "@/lib/account-store";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { displayName, username, walletAddress } = body;

    if (!displayName || !username || !walletAddress) {
      return NextResponse.json(
        { error: "displayName, username, and walletAddress are required" },
        { status: 400 }
      );
    }

    const newUser = await createUserAccount({
      displayName,
      username,
      walletAddress,
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to create account" },
      { status: 400 }
    );
  }
}
