import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/users";
import { createInviteRecord } from "@/lib/circles-store";

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
    const { username } = body;
    if (!username || typeof username !== "string") {
      return NextResponse.json(
        { error: "Username is required to invite candidate" },
        { status: 400 }
      );
    }

    const result = await createInviteRecord({
      circleId: params.id,
      username: username.trim(),
      callerWallet: user.walletAddress,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to send invite" },
      { status: 400 }
    );
  }
}
