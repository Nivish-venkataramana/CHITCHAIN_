import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/users";
import { createIssueRecord, getIssuesForCircle } from "@/lib/circles-store";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
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

    const { category, targetMemberWallet, comment } = body;

    const validCategories = ["PEOPLE_COUNT", "DURATION", "AMOUNT", "PEOPLE_JOINED"];
    if (!category || !validCategories.includes(category)) {
      return NextResponse.json(
        { error: "Invalid category. Must be PEOPLE_COUNT, DURATION, AMOUNT, or PEOPLE_JOINED" },
        { status: 400 }
      );
    }

    if (!comment || typeof comment !== "string" || comment.trim().length === 0) {
      return NextResponse.json(
        { error: "Comment is required for every issue" },
        { status: 400 }
      );
    }

    const issue = await createIssueRecord({
      circleId: params.id,
      authorWallet: walletAddress || "",
      authorUsername: username || undefined,
      category,
      targetMemberWallet,
      comment: comment.trim(),
    });

    return NextResponse.json(issue, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to raise issue" },
      { status: 400 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = await getIssuesForCircle(params.id);
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch issues" },
      { status: 500 }
    );
  }
}
