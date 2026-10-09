import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/users";
import { markNotificationRead } from "@/lib/circles-store";

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

    const success = await markNotificationRead(params.id, user.walletAddress);
    return NextResponse.json({ success });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to mark notification read" },
      { status: 500 }
    );
  }
}
