import { NextRequest, NextResponse } from "next/server";
import { getBiddingAuctionState } from "@/lib/bidding-store";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const state = await getBiddingAuctionState(params.id);
    return NextResponse.json(state);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch bidding state" },
      { status: 500 }
    );
  }
}
