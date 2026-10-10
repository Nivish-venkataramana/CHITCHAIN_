import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/users";
import { resolveIssueRecord } from "@/lib/circles-store";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; issueId: string } }
) {
  try {
    const user = getSessionUser(req);
    let body: any = {};
    try {
      body = await req.json();
    } catch {}

    const walletAddress = body.walletAddress || user?.walletAddress || req.headers.get("x-dev-wallet");
    const username = body.username || user?.username || req.headers.get("x-dev-user");

    if (!walletAddress && !username) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    const { resolutionResponse } = body;

    if (!resolutionResponse || typeof resolutionResponse !== "string" || resolutionResponse.trim().length === 0) {
      return NextResponse.json(
        { error: "Resolution response note is required" },
        { status: 400 }
      );
    }

    const updatedIssue = await resolveIssueRecord({
      issueId: params.issueId,
      volunteerWallet: walletAddress || "",
      volunteerUsername: username || undefined,
      response: resolutionResponse.trim(),
    });

    return NextResponse.json({ success: true, issue: updatedIssue });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to resolve issue" },
      { status: 400 }
    );
  }
}
