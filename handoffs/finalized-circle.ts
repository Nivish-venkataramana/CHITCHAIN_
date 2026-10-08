export type FinalizedCircle = {
  circleId: string;
  name: string;
  members: `0x${string}`[]; // wallet addresses, includes the volunteer
  monthlyAmount: string; // base units, e.g. "1000000000"
  durationMonths: number;
  volunteer: `0x${string}`;
};
