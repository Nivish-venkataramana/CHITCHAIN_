import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const g = globalThis as any;
if (!g.__chitchain_autopay__) {
  g.__chitchain_autopay__ = [];
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const circleId = searchParams.get("circleId");
    const memberAddress = searchParams.get("memberAddress")?.toLowerCase();

    if (!circleId) {
      return NextResponse.json({ error: "Missing circleId" }, { status: 400 });
    }

    const memoryConsents = (g.__chitchain_autopay__ || []).filter((c: any) => c.circleId === circleId);

    if (memberAddress) {
      let consent: any = null;
      try {
        consent = await prisma.autopayConsent.findUnique({
          where: {
            circleId_memberAddress: {
              circleId,
              memberAddress,
            },
          },
        });
      } catch {}

      if (!consent) {
        consent = memoryConsents.find((c: any) => c.memberAddress.toLowerCase() === memberAddress) || null;
      }

      return NextResponse.json({ success: true, consent });
    }

    let allConsents: any[] = [];
    try {
      allConsents = await prisma.autopayConsent.findMany({
        where: { circleId },
      });
    } catch {}

    // Merge with in-memory consents
    const map = new Map<string, any>();
    allConsents.forEach((c) => map.set(c.memberAddress.toLowerCase(), c));
    memoryConsents.forEach((c: any) => {
      const k = c.memberAddress.toLowerCase();
      if (!map.has(k)) {
        map.set(k, c);
      }
    });

    return NextResponse.json({ success: true, consents: Array.from(map.values()) });
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
    const now = new Date();
    const consentRecord = {
      id: `consent-${Date.now()}`,
      circleId,
      memberAddress: normalizedAddress,
      status: status || "GIVEN",
      sessionId: sessionId || `ss-${Date.now()}`,
      txHash: txHash || `0x${Date.now().toString(16)}`,
      grantedAt: now,
      revokedAt: null,
    };

    // Update in-memory
    const existingIdx = (g.__chitchain_autopay__ || []).findIndex(
      (c: any) => c.circleId === circleId && c.memberAddress.toLowerCase() === normalizedAddress
    );
    if (existingIdx !== -1) {
      g.__chitchain_autopay__[existingIdx] = {
        ...g.__chitchain_autopay__[existingIdx],
        ...consentRecord,
      };
    } else {
      g.__chitchain_autopay__.push(consentRecord);
    }

    let consent: any = consentRecord;
    try {
      consent = await prisma.autopayConsent.upsert({
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
          grantedAt: now,
        },
        create: {
          circleId,
          memberAddress: normalizedAddress,
          status: status || "GIVEN",
          sessionId: sessionId || `ss-${Date.now()}`,
          txHash: txHash || `0x${Date.now().toString(16)}`,
          grantedAt: now,
        },
      });
    } catch (err) {
      console.warn("Prisma consent upsert notice:", err);
    }

    return NextResponse.json({ success: true, consent });
  } catch (error: any) {
    console.error("POST /api/autopay/consent error:", error);
    return NextResponse.json({ error: error.message || "Failed to update consent" }, { status: 500 });
  }
}
