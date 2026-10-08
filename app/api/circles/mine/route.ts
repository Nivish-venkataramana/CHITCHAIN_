import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/users";
import { getCirclesForUser } from "@/lib/circles-store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    const circles = await getCirclesForUser(user.walletAddress);
    return NextResponse.json(circles);
  } catch (err: any) {
    console.error("Error fetching user circles:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
