import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/users";
import { commitSecretBid } from "@/lib/bidding-store";

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
    const { amount, salt } = body;

    if (amount === undefined || amount === null || String(amount).trim() === "") {
      return NextResponse.json({ error: "Bid amount is required" }, { status: 400 });
    }

    const bid = await commitSecretBid({
      circleId: params.id,
      memberWallet: user.walletAddress,
      memberUsername: user.username,
      bidAmountUSDC: String(amount),
      salt,
    });

    return NextResponse.json({
      success: true,
      bid: {
        memberWallet: bid.memberWallet,
        memberUsername: bid.memberUsername,
        commitment: bid.commitment,
        revealed: false,
      },
      message: "Secret bid hashed and committed. Amount will stay sealed until reveal.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to commit bid" },
      { status: 400 }
    );
  }
}
