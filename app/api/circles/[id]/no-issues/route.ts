import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/users";
import { submitNoIssuesConfirmation } from "@/lib/circles-store";

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

    const result = await submitNoIssuesConfirmation({
      circleId: params.id,
      memberWallet: user.walletAddress,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to submit 'No issues'" },
      { status: 400 }
    );
  }
}
