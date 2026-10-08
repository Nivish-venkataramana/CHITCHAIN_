import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/users";

export async function GET(req: NextRequest) {
  const user = getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(user);
}
