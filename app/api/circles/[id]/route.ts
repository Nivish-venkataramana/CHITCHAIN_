import { NextRequest, NextResponse } from "next/server";
import { getCircleRecordById } from "@/lib/circles-store";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { circle, invites } = await getCircleRecordById(params.id);
    if (!circle) {
      return NextResponse.json({ error: "Circle not found" }, { status: 404 });
    }
    return NextResponse.json({ ...circle, invites });
  } catch (err: any) {
    console.error("Error fetching circle by id:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
