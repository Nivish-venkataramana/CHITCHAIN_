export type UserProfile = {
  privyUserId?: string;
  username: string; // unique, lowercase, contains the real name
  walletAddress: `0x${string}`; // smart account address (the on-chain identity)
  displayName: string; // the real name as entered
  createdAt?: string | Date;
};
