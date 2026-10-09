import usersFixture from "@/handoffs/fixtures/users.json";
import { UserProfile } from "@/handoffs/user-profile";
import { validateUsername, norm } from "./username-rule";
import { addUserProfile } from "./users";
import { getFinalizedCircle, getMemberBalance } from "./circles-store";

export interface UserRecord extends UserProfile {
  id: string;
  privyUserId?: string;
  ownerAddress?: string;
  createdAt: Date;
}

export interface AutopayConsentRecord {
  id: string;
  circleId: string;
  memberAddress: string;
  memberUsername: string;
  status: "NOT_GIVEN" | "GIVEN" | "REVOKED";
  sessionId: string | null;
  txHash: string | null;
  grantedAt: Date | null;
  revokedAt: Date | null;
}

// Global user store seeded with deterministic fixtures
let usersDb: UserRecord[] = (usersFixture as UserProfile[]).map((u, i) => ({
  ...u,
  id: `user-${i + 1}`,
  createdAt: new Date(),
}));

// Global autopay consents store
let autopayConsents: AutopayConsentRecord[] = [];

// Vault addresses mapping
let circleVaults: Record<string, { vaultAddress: string; isStarted: boolean }> = {
  "sample-circle-4m-3mo": {
    vaultAddress: "0x8888888888888888888888888888888888888888",
    isStarted: false,
  },
};

// Simulated faucet balance tracking
let userBalances: Record<string, bigint> = {
  "0x1111111111111111111111111111111111111111": 10000_000000n,
  "0x2222222222222222222222222222222222222222": 5000_000000n,
  "0x3333333333333333333333333333333333333333": 4000_000000n,
  "0x4444444444444444444444444444444444444444": 3500_000000n,
  "0x5555555555555555555555555555555555555555": 3000_000000n,
  "0x6666666666666666666666666666666666666666": 400_000000n,
};

export async function createUserAccount(params: {
  displayName: string;
  username: string;
  walletAddress: `0x${string}`;
}): Promise<UserRecord> {
  const validation = validateUsername(params.displayName, params.username);
  if (!validation.valid) {
    throw new Error(validation.error || "Invalid username format");
  }

  const cleanUser = params.username.toLowerCase().trim();
  const cleanWallet = params.walletAddress.toLowerCase().trim();

  // Server uniqueness check on username
  const existingUsername = usersDb.find((u) => u.username.toLowerCase() === cleanUser);
  if (existingUsername) {
    throw new Error(`Username @${cleanUser} is already taken. Please choose another.`);
  }

  // Check if wallet already bound to an account
  const existingWallet = usersDb.find((u) => u.walletAddress.toLowerCase() === cleanWallet);
  if (existingWallet) {
    throw new Error(`Wallet address ${cleanWallet} is already bound to account @${existingWallet.username}.`);
  }

  const newUser: UserRecord = {
    id: `user-${Date.now()}`,
    displayName: params.displayName.trim(),
    username: cleanUser,
    walletAddress: params.walletAddress,
    createdAt: new Date(),
  };

  usersDb.push(newUser);
  addUserProfile({
    username: cleanUser,
    walletAddress: params.walletAddress,
    displayName: params.displayName.trim(),
  });
  userBalances[cleanWallet] = 1000_000000n; // Grant initial 1,000 test USDC

  return newUser;
}

export async function mintFaucetTokens(walletAddress: string, amountUSDC = 1000): Promise<bigint> {
  const cleanWallet = walletAddress.toLowerCase().trim();
  const mintBaseUnits = BigInt(amountUSDC) * 1_000_000n;
  const current = userBalances[cleanWallet] || 0n;
  const updated = current + mintBaseUnits;
  userBalances[cleanWallet] = updated;
  return updated;
}

export async function getUserBalance(walletAddress: string): Promise<bigint> {
  const cleanWallet = walletAddress.toLowerCase().trim();
  return userBalances[cleanWallet] ?? 5000_000000n;
}

export async function getAllUserProfiles(): Promise<UserProfile[]> {
  return usersDb.map(({ username, walletAddress, displayName }) => ({
    username,
    walletAddress,
    displayName,
  }));
}

// ----------------------------------------------------------------------------
// Autopay Session Mandate Management (README §7.4, §7.7)
// ----------------------------------------------------------------------------

export async function getAutopayStatusForCircle(circleId: string): Promise<{
  vaultAddress: string | null;
  isStarted: boolean;
  canStart: boolean;
  members: Array<{
    walletAddress: string;
    username: string;
    displayName: string;
    status: "NOT_GIVEN" | "GIVEN" | "REVOKED";
    grantedAt: Date | null;
  }>;
}> {
  const finalized = await getFinalizedCircle(circleId);
  const vaultInfo = circleVaults[circleId] || null;

  if (!finalized) {
    return {
      vaultAddress: vaultInfo?.vaultAddress || null,
      isStarted: vaultInfo?.isStarted || false,
      canStart: false,
      members: [],
    };
  }

  const memberStatuses = finalized.members.map((mWallet) => {
    const normW = mWallet.toLowerCase();
    const consent = autopayConsents.find(
      (c) => c.circleId === circleId && c.memberAddress.toLowerCase() === normW
    );
    const userProfile = usersDb.find((u) => u.walletAddress.toLowerCase() === normW);

    return {
      walletAddress: mWallet,
      username: userProfile?.username || "member",
      displayName: userProfile?.displayName || userProfile?.username || "Member",
      status: (consent?.status || "NOT_GIVEN") as "NOT_GIVEN" | "GIVEN" | "REVOKED",
      grantedAt: consent?.grantedAt || null,
    };
  });

  const allGiven = memberStatuses.length > 0 && memberStatuses.every((m) => m.status === "GIVEN");
  const canStart = allGiven && Boolean(vaultInfo?.vaultAddress) && !vaultInfo?.isStarted;

  return {
    vaultAddress: vaultInfo?.vaultAddress || null,
    isStarted: vaultInfo?.isStarted || false,
    canStart,
    members: memberStatuses,
  };
}

export async function createCircleVaultAddress(circleId: string, volunteerWallet: string): Promise<string> {
  const finalized = await getFinalizedCircle(circleId);
  if (!finalized) {
    throw new Error("Circle must be finalized before vault can be deployed.");
  }

  if (finalized.volunteer.toLowerCase() !== volunteerWallet.toLowerCase()) {
    throw new Error("Only the volunteer organizer can deploy the circle vault.");
  }

  const simulatedVault = `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`;
  circleVaults[circleId] = {
    vaultAddress: simulatedVault,
    isStarted: false,
  };

  return simulatedVault;
}

export async function grantAutopayMandate(params: {
  circleId: string;
  memberWallet: string;
  signature?: string;
}): Promise<AutopayConsentRecord> {
  const normW = params.memberWallet.toLowerCase().trim();
  const finalized = await getFinalizedCircle(params.circleId);
  if (!finalized) {
    throw new Error("Circle is not finalized.");
  }

  if (!finalized.members.some((m) => m.toLowerCase() === normW)) {
    throw new Error("You are not a member of this finalized circle.");
  }

  const userProfile = usersDb.find((u) => u.walletAddress.toLowerCase() === normW);

  let consent = autopayConsents.find(
    (c) => c.circleId === params.circleId && c.memberAddress.toLowerCase() === normW
  );

  if (!consent) {
    consent = {
      id: `consent-${Date.now()}`,
      circleId: params.circleId,
      memberAddress: normW,
      memberUsername: userProfile?.username || "member",
      status: "GIVEN",
      sessionId: `session-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      txHash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`,
      grantedAt: new Date(),
      revokedAt: null,
    };
    autopayConsents.push(consent);
  } else {
    consent.status = "GIVEN";
    consent.grantedAt = new Date();
    consent.revokedAt = null;
  }

  return consent;
}

export async function revokeAutopayMandate(params: {
  circleId: string;
  memberWallet: string;
}): Promise<AutopayConsentRecord> {
  const normW = params.memberWallet.toLowerCase().trim();
  const consent = autopayConsents.find(
    (c) => c.circleId === params.circleId && c.memberAddress.toLowerCase() === normW
  );

  if (!consent) {
    throw new Error("No autopay mandate found to revoke.");
  }

  consent.status = "REVOKED";
  consent.revokedAt = new Date();

  return consent;
}

export async function startCircleVault(circleId: string, volunteerWallet: string): Promise<boolean> {
  const vaultInfo = circleVaults[circleId];
  if (!vaultInfo || !vaultInfo.vaultAddress) {
    throw new Error("Vault not yet created for this circle.");
  }

  const finalized = await getFinalizedCircle(circleId);
  if (!finalized) {
    throw new Error("Circle is not finalized.");
  }

  if (finalized.volunteer.toLowerCase() !== volunteerWallet.toLowerCase()) {
    throw new Error("Only the volunteer organizer can start the vault.");
  }

  const status = await getAutopayStatusForCircle(circleId);
  if (!status.members.every((m) => m.status === "GIVEN")) {
    throw new Error("Cannot call start(): All members must grant autopay permissions first.");
  }

  vaultInfo.isStarted = true;
  return true;
}
