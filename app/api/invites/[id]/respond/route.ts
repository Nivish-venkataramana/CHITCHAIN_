import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/users";
import { respondToInvite } from "@/lib/circles-store";

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
    const { accept } = body;
    if (typeof accept !== "boolean") {
      return NextResponse.json(
        { error: "Field 'accept' must be boolean (true or false)" },
        { status: 400 }
      );
    }

    const result = await respondToInvite({
      inviteId: params.id,
      accept,
      userWallet: user.walletAddress,
      username: user.username,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to respond to invite" },
      { status: 400 }
    );
  }
}
