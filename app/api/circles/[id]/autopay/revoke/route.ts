import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/users";
import { revokeAutopayMandate } from "@/lib/account-store";

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

    const consent = await revokeAutopayMandate({
      circleId: params.id,
      memberWallet: user.walletAddress,
    });

    return NextResponse.json({
      success: true,
      consent,
      message: "Autopay mandate revoked.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to revoke autopay mandate" },
      { status: 400 }
    );
  }
}
