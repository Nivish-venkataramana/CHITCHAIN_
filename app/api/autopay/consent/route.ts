import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const circleId = searchParams.get("circleId");
    const memberAddress = searchParams.get("memberAddress")?.toLowerCase();

    if (!circleId) {
      return NextResponse.json({ error: "Missing circleId" }, { status: 400 });
    }

    if (memberAddress) {
      const consent = await prisma.autopayConsent.findUnique({
        where: {
          circleId_memberAddress: {
            circleId,
            memberAddress,
          },
        },
      });
      return NextResponse.json({ success: true, consent });
    }

    const allConsents = await prisma.autopayConsent.findMany({
      where: { circleId },
    });

    return NextResponse.json({ success: true, consents: allConsents });
  } catch (error: any) {
    console.error("GET /api/autopay/consent error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch consent" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { circleId, memberAddress, status, sessionId, txHash } = body;

    if (!circleId || !memberAddress) {
      return NextResponse.json({ error: "Missing circleId or memberAddress" }, { status: 400 });
    }

    const normalizedAddress = memberAddress.toLowerCase();

    const consent = await prisma.autopayConsent.upsert({
      where: {
        circleId_memberAddress: {
          circleId,
          memberAddress: normalizedAddress,
        },
      },
      update: {
        status: status || "GIVEN",
        sessionId: sessionId || `ss-${Date.now()}`,
        txHash: txHash || `0x${Date.now().toString(16)}`,
        grantedAt: new Date(),
      },
      create: {
        circleId,
        memberAddress: normalizedAddress,
        status: status || "GIVEN",
        sessionId: sessionId || `ss-${Date.now()}`,
        txHash: txHash || `0x${Date.now().toString(16)}`,
        grantedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, consent });
  } catch (error: any) {
    console.error("POST /api/autopay/consent error:", error);
    return NextResponse.json({ error: error.message || "Failed to update consent" }, { status: 500 });
  }
}
