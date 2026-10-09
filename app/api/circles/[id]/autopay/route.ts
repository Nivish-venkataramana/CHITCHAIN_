import { NextRequest, NextResponse } from "next/server";
import { getAutopayStatusForCircle } from "@/lib/account-store";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const status = await getAutopayStatusForCircle(params.id);
    return NextResponse.json(status);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to retrieve autopay status" },
      { status: 500 }
    );
  }
}
