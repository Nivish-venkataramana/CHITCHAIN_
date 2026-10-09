import { NextRequest, NextResponse } from "next/server";
import { runDeterministicSimulation } from "@/lib/yield/calculator";
import { SimulationScenarioConfig } from "@/lib/yield/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const config: SimulationScenarioConfig = {
      monthlyContribution: Number(body.monthlyContribution) || 10000,
      durationMonths: Number(body.durationMonths) || 24,
      hypotheticalAPR: Number(body.hypotheticalAPR) !== undefined ? Number(body.hypotheticalAPR) : 0.0808,
      compoundingFrequency: body.compoundingFrequency || "DAILY",
      depositTiming: body.depositTiming || "END_OF_MONTH",
      withdrawals: Array.isArray(body.withdrawals) ? body.withdrawals : [],
    };

    if (config.monthlyContribution < 0 || config.durationMonths < 1) {
      return NextResponse.json(
        { error: "Monthly contribution must be non-negative and duration at least 1 month." },
        { status: 400 }
      );
    }

    const result = runDeterministicSimulation(config);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to calculate simulation." },
      { status: 500 }
    );
  }
}
