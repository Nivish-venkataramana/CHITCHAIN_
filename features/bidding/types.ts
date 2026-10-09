export type BidPhase = "Closed" | "Commit" | "Reveal" | "Settled";

export interface BidView {
  member: `0x${string}` | string;
  amount: string; // base units or formatted string
  revealed: boolean;
  committedAt: number;
}

export interface BiddingCircleInfo {
  circleId: string;
  name: string;
  currentCycle: number;
  poolAmount: string; // e.g. "5000000000" (5000 USDC)
  monthlyAmount: string; // e.g. "1000000000" (1000 USDC)
  members: (`0x${string}` | string)[];
  durationMonths: number;
}

export interface BiddingState {
  circle: BiddingCircleInfo;
  phase: BidPhase;
  userAddress: `0x${string}` | string;
  hasWon: boolean;
  hasMissed: boolean;
  hasCommitted: boolean;
  hasRevealed: boolean;
  committedCount: number;
  totalMembers: number;
  userSavedBid?: string;
  userSavedSalt?: string;
  winner?: `0x${string}` | string;
  winningBid?: string;
  dividendCarried?: string;
  settleReason?: "LOWEST_BID" | "TIE_EARLIEST_COMMIT" | "ROLLOVER_NO_BIDS";
  bids: BidView[];
}
