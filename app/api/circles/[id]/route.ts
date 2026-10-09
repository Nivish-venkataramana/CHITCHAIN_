import { NextRequest, NextResponse } from "next/server";
import { getCircleRecordById, updateCircleRecord, deleteCircleRecord } from "@/lib/circles-store";
import { getUserByUsername } from "@/lib/users";

function resolveCallerWallet(req: NextRequest): string {
  const headerWallet = req.headers.get("x-dev-wallet");
  if (headerWallet) return headerWallet.toLowerCase();

  const headerUser = req.headers.get("x-dev-user");
  if (headerUser) {
    const user = getUserByUsername(headerUser.replace(/^@/, ""));
    if (user?.walletAddress) {
      return user.walletAddress.toLowerCase();
    }
  }
  return "0x1111111111111111111111111111111111111111";
}

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

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const callerWallet = resolveCallerWallet(req);
    const body = await req.json();

    const updatedCircle = await updateCircleRecord({
      circleId: params.id,
      callerWallet,
      name: body.name,
      numPeople: body.numPeople !== undefined ? Number(body.numPeople) : undefined,
      monthlyAmount: body.monthlyAmount !== undefined ? String(body.monthlyAmount) : undefined,
      durationMonths: body.durationMonths !== undefined ? Number(body.durationMonths) : undefined,
    });

    return NextResponse.json({ success: true, circle: updatedCircle });
  } catch (err: any) {
    console.error("Error updating circle:", err);
    return NextResponse.json(
      { error: err.message || "Failed to update circle" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const callerWallet = resolveCallerWallet(req);

    const success = await deleteCircleRecord({
      circleId: params.id,
      callerWallet,
    });

    return NextResponse.json({ success: true, message: "Circle deleted successfully" });
  } catch (err: any) {
    console.error("Error deleting circle:", err);
    return NextResponse.json(
      { error: err.message || "Failed to delete circle" },
      { status: 400 }
    );
  }
}
