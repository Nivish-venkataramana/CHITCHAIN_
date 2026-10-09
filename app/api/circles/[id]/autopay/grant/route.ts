import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/users";
import { grantAutopayMandate } from "@/lib/account-store";

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

    const consent = await grantAutopayMandate({
      circleId: params.id,
      memberWallet: user.walletAddress,
    });

    return NextResponse.json({
      success: true,
      consent,
      message: "Autopay SmartSession mandate signed and installed successfully.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to grant autopay mandate" },
      { status: 400 }
    );
  }
}
