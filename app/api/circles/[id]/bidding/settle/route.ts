import { NextRequest, NextResponse } from "next/server";
import { settleAuction } from "@/lib/bidding-store";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const updated = await settleAuction(params.id);
    return NextResponse.json({
      success: true,
      state: updated,
      message: "Auction settled! Winner paid on-chain and dividend credited.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to settle auction" },
      { status: 500 }
    );
  }
}
