import { NextRequest, NextResponse } from "next/server";
import { searchUsers, syncUserAccount } from "@/lib/users";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";

  try {
    const dbUsers = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
    });

    dbUsers.forEach((u) => {
      syncUserAccount({
        privyUserId: u.privyUserId || undefined,
        username: u.username,
        walletAddress: u.walletAddress,
        displayName: u.displayName,
      });
    });
  } catch (err: any) {
    console.warn("User search DB fetch notice:", err.message);
  }

  const results = searchUsers(q);
  return NextResponse.json(results);
}
