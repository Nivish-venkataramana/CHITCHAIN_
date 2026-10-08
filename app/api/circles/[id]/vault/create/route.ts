import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/users";
import { createCircleVaultAddress } from "@/lib/account-store";

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

    const vaultAddress = await createCircleVaultAddress(params.id, user.walletAddress);

    return NextResponse.json({
      success: true,
      vaultAddress,
      message: "Circle vault clone deployed on Base Sepolia.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to create circle vault" },
      { status: 400 }
    );
  }
}
