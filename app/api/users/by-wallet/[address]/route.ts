import { NextRequest, NextResponse } from "next/server";
import { getUserByWallet } from "@/lib/users";

export async function GET(
  req: NextRequest,
  { params }: { params: { address: string } }
) {
  const user = getUserByWallet(params.address);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  return NextResponse.json(user);
}
