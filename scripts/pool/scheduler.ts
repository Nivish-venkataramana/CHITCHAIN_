/**
 * Nivish: Node scheduler for ChitChain cycle clock and demo HOLD/Continue control.
 * Watches vault state and calls: collect() -> openReveal() -> settle() -> vault.settle()
 */

export interface SchedulerState {
  circleId: string;
  cycle: number;
  phase: "Collect" | "Commit" | "Reveal" | "Settle" | "Completed";
  isHolding: boolean;
  waitingFor: string;
  poolAmount: string;
  carriedDividend: string;
}

let schedulerState: SchedulerState = {
  circleId: "sample-circle-4m-3mo",
  cycle: 1,
  phase: "Collect",
  isHolding: true,
  waitingFor: "Admin Continue to transition Collect -> Commit",
  poolAmount: "4000000000",
  carriedDividend: "0",
};

export function getSchedulerState(): SchedulerState {
  return schedulerState;
}

export function advanceSchedulerState(): SchedulerState {
  if (schedulerState.phase === "Collect") {
    schedulerState.phase = "Commit";
    schedulerState.waitingFor = "Members to commit secret bids -> Admin Continue to open reveal";
  } else if (schedulerState.phase === "Commit") {
    schedulerState.phase = "Reveal";
    schedulerState.waitingFor = "Members to reveal bids -> Admin Continue to settle pot";
  } else if (schedulerState.phase === "Reveal") {
    schedulerState.phase = "Settle";
    schedulerState.waitingFor = "Admin Continue to advance to next cycle";
  } else if (schedulerState.phase === "Settle") {
    if (schedulerState.cycle >= 3) {
      schedulerState.phase = "Completed";
      schedulerState.waitingFor = "Circle completed. All cycles settled.";
    } else {
      schedulerState.cycle += 1;
      schedulerState.phase = "Collect";
      schedulerState.carriedDividend = "200000000"; // 200 USDC carry example
      schedulerState.poolAmount = "4200000000";
      schedulerState.waitingFor = `Month ${schedulerState.cycle} contributions -> Admin Continue to start bidding`;
    }
  }

  return schedulerState;
}
