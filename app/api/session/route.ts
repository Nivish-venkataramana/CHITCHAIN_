import { NextRequest, NextResponse } from "next/server";
import { verifyPrivyAuth } from "@/lib/privy-server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await verifyPrivyAuth(req);
  if (!session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(session.user);
}
