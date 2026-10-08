import { NextRequest, NextResponse } from "next/server";
import { getFinalizedCircle } from "@/lib/circles-store";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const finalized = await getFinalizedCircle(params.id);
    if (!finalized) {
      return NextResponse.json(
        { error: "Circle is not finalized or does not exist" },
        { status: 404 }
      );
    }

    return NextResponse.json(finalized);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to retrieve finalized circle" },
      { status: 500 }
    );
  }
}
