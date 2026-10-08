import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/users";
import { getNotificationsForUser } from "@/lib/circles-store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    const notifs = await getNotificationsForUser(user.walletAddress);
    return NextResponse.json(notifs);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}
