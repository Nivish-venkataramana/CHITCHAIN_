export type PoolPhase = "NotStarted" | "Collect" | "Bidding" | "Settle" | "Completed";

export interface PoolMember {
  address: `0x${string}`;
  username?: string;
  displayName?: string;
  hasPaid: boolean;
  hasMissed: boolean;
  hasWon: boolean;
  amountContributed: bigint;
}

export interface CycleSchedule {
  cycleNumber: number;
  collectionDate: string;
  biddingDate: string;
  isCurrent: boolean;
  isPast: boolean;
  isUpcoming: boolean;
  status: "Completed" | "Active" | "Upcoming";
  poolAmount?: bigint;
  winningBid?: bigint;
  winnerAddress?: `0x${string}`;
}

export interface PoolVaultState {
  vaultAddress: `0x${string}`;
  circleId: string;
  name: string;
  volunteer: `0x${string}`;
  monthlyAmount: bigint;
  durationMonths: number;
  currentCycle: number;
  phase: PoolPhase;
  poolAmount: bigint;
  carriedDividend: bigint;
  members: PoolMember[];
  tokenAddress: `0x${string}`;
  tokenSymbol: string;
  tokenDecimals: number;
  isDemoMode: boolean;
}

export interface SchedulerState {
  isDemoMode: boolean;
  vaultAddress: string;
  currentCycle: number;
  phase: string;
  isWaiting: boolean;
  holdReason: string | null;
  lastAction: string | null;
  poolAmount: string;
}
