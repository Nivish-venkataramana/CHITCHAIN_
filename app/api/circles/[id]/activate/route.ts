import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/users";
import { activateCircleRecord } from "@/lib/circles-store";

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

    const circle = await activateCircleRecord({
      circleId: params.id,
      volunteerWallet: user.walletAddress,
    });

    return NextResponse.json({ success: true, circle });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to activate circle" },
      { status: 400 }
    );
  }
}
