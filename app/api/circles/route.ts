import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/users";
import { validateCircleParams } from "@/lib/validation";
import { createCircleRecord, getAllCircles } from "@/lib/circles-store";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    const body = await req.json();
    const validation = validateCircleParams({
      name: body.name,
      numPeople: Number(body.numPeople),
      monthlyAmount: String(body.monthlyAmount),
      durationMonths: Number(body.durationMonths),
    });

    if (!validation.valid || !validation.baseUnitAmount) {
      return NextResponse.json(
        { error: validation.error || "Validation failed" },
        { status: 400 }
      );
    }

    const circle = await createCircleRecord({
      name: body.name.trim(),
      volunteerWallet: user.walletAddress,
      volunteerUsername: user.username,
      numPeople: Number(body.numPeople),
      monthlyAmount: validation.baseUnitAmount,
      durationMonths: Number(body.durationMonths),
    });

    return NextResponse.json(circle, { status: 201 });
  } catch (err: any) {
    console.error("Error creating circle:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const circles = await getAllCircles();
  return NextResponse.json(circles);
}
