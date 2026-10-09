export type UserProfile = {
  username: string; // unique, lowercase, contains the real name
  walletAddress: `0x${string}`; // smart account address (the on-chain identity)
  displayName: string; // the real name as entered
  privyUserId?: string;
  createdAt?: string | Date;
};
