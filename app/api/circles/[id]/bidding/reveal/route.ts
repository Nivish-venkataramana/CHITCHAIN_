import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/users";
import { revealSecretBid } from "@/lib/bidding-store";

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

    const body = await req.json();
    const { amountBaseUnits, salt } = body;

    const bid = await revealSecretBid({
      circleId: params.id,
      memberWallet: user.walletAddress,
      bidAmountBaseUnits: String(amountBaseUnits),
      salt,
    });

    return NextResponse.json({
      success: true,
      bid,
      message: "Bid revealed successfully and published to public auction board.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to reveal bid" },
      { status: 400 }
    );
  }
}
