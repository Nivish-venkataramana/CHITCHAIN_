import { NextRequest, NextResponse } from "next/server";
import { searchUsers } from "@/lib/users";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const results = searchUsers(q);
  return NextResponse.json(results);
}
