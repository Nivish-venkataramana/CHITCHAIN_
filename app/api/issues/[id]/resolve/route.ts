import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/users";
import { resolveIssueRecord } from "@/lib/circles-store";

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
    const { response } = body;

    if (!response || typeof response !== "string" || response.trim().length === 0) {
      return NextResponse.json(
        { error: "Resolution response text is required" },
        { status: 400 }
      );
    }

    const resolved = await resolveIssueRecord({
      issueId: params.id,
      volunteerWallet: user.walletAddress,
      response: response.trim(),
    });

    return NextResponse.json(resolved);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to resolve issue" },
      { status: 400 }
    );
  }
}
