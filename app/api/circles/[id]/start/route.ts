import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/users";
import { startCircleVault } from "@/lib/account-store";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    const success = await startCircleVault(params.id, user.walletAddress);

    return NextResponse.json({
      success,
      message: "Circle vault started! Cycle 1 collection is now active.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to start circle vault" },
      { status: 400 }
    );
  }
}
