import { NextRequest, NextResponse } from "next/server";
import { getSchedulerState, advanceSchedulerState } from "@/scripts/pool/scheduler";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = getSchedulerState();
  return NextResponse.json(state);
}

export async function POST(req: NextRequest) {
  const updated = advanceSchedulerState();
  return NextResponse.json(updated);
}
