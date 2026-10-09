import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/users";
import { createInviteRecord, removeInviteRecord } from "@/lib/circles-store";

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

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    let inviteId = searchParams.get("inviteId");

    if (!inviteId) {
      try {
        const body = await req.json();
        inviteId = body.inviteId;
      } catch {}
    }

    if (!inviteId) {
      return NextResponse.json({ error: "inviteId is required" }, { status: 400 });
    }

    const result = await removeInviteRecord({
      circleId: params.id,
      inviteId,
      callerWallet: user.walletAddress,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to remove member" },
      { status: 400 }
    );
  }
}
