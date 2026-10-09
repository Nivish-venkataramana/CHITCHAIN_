import usersFixture from "@/handoffs/fixtures/users.json";
import { UserProfile } from "@/handoffs/user-profile";
import { validateUsername, norm } from "./username-rule";
import { addUserProfile } from "./users";
import { getFinalizedCircle, getMemberBalance } from "./circles-store";
import { addUser } from "./users";

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

const isTestEnv = process.env.NODE_ENV === "test";

const g = globalThis as any;

if (!g.__chitchain_users_db__) {
  g.__chitchain_users_db__ = isTestEnv
    ? (usersFixture as UserProfile[]).map((u, i) => ({
        ...u,
        id: `user-${i + 1}`,
        createdAt: new Date(),
      }))
    : [];
}

if (!g.__chitchain_autopay__) {
  g.__chitchain_autopay__ = [];
}

if (!g.__chitchain_vaults__) {
  g.__chitchain_vaults__ = isTestEnv
    ? {
        "sample-circle-4m-3mo": {
          vaultAddress: "0x8888888888888888888888888888888888888888",
          isStarted: false,
        },
      }
    : {};
}

if (!g.__chitchain_balances__ || !isTestEnv) {
  g.__chitchain_balances__ = isTestEnv
    ? {
        "0x1111111111111111111111111111111111111111": 10000_000000n,
        "0x2222222222222222222222222222222222222222": 5000_000000n,
        "0x3333333333333333333333333333333333333333": 4000_000000n,
        "0x4444444444444444444444444444444444444444": 3500_000000n,
        "0x5555555555555555555555555555555555555555": 3000_000000n,
        "0x6666666666666666666666666666666666666666": 400_000000n,
      }
    : {};
}

const usersDb: UserRecord[] = g.__chitchain_users_db__;
const autopayConsents: AutopayConsentRecord[] = g.__chitchain_autopay__;
const circleVaults: Record<string, { vaultAddress: string; isStarted: boolean }> = g.__chitchain_vaults__;
const userBalances: Record<string, bigint> = g.__chitchain_balances__;

export async function createUserAccount(params: {
  displayName?: string;
  username: string;
  walletAddress: `0x${string}`;
}): Promise<UserRecord> {
  const cleanUser = params.username.toLowerCase().trim();
  const cleanWallet = params.walletAddress.toLowerCase().trim();

  if (!cleanUser || cleanUser.length < 3) {
    throw new Error("Username must be at least 3 characters long.");
  }

  if (!/^0x[a-f0-9]{40}$/i.test(cleanWallet)) {
    throw new Error("Invalid public key address. Must be a valid 42-character hex address (0x...).");
  }

  // Server uniqueness check on username
  const existingUsername = usersDb.find((u) => u.username.toLowerCase() === cleanUser);
  if (existingUsername) {
    throw new Error(`Username @${cleanUser} is already taken. Please choose another.`);
  }

  // Check if wallet already bound to an account
  const existingWallet = usersDb.find((u) => u.walletAddress.toLowerCase() === cleanWallet);
  if (existingWallet) {
    throw new Error(`Public key ${cleanWallet} is already bound to account @${existingWallet.username}.`);
  }

  const newUser: UserRecord = {
    id: `user-${Date.now()}`,
    displayName: params.displayName?.trim() || cleanUser,
    username: cleanUser,
    walletAddress: params.walletAddress,
    createdAt: new Date(),
  };

  usersDb.push(newUser);
  addUser(newUser);
  if (isTestEnv) {
    userBalances[cleanWallet] = 1000_000000n; // Only in unit test env
  }

  return newUser;
}

import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http("https://sepolia.base.org", {
    timeout: 1500,
    retryCount: 1,
  }),
});

const BASE_SEPOLIA_USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

const ERC20_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

// In-Memory RPC Cache to avoid blocking network calls and lag
const balanceCache: Record<string, { usdc: bigint; eth: string; expiry: number }> = {};

export async function mintFaucetTokens(walletAddress: string, amountUSDC = 1000): Promise<bigint> {
  const cleanWallet = walletAddress.toLowerCase().trim();
  const mintBaseUnits = BigInt(amountUSDC) * 1_000_000n;
  const current = userBalances[cleanWallet] || 0n;
  const updated = current + mintBaseUnits;
  userBalances[cleanWallet] = updated;

  // Invalidate cache on mint
  delete balanceCache[cleanWallet];

  return getUserBalance(walletAddress);
}

export async function getUserBalance(walletAddress: string): Promise<bigint> {
  const cleanWallet = walletAddress.toLowerCase().trim() as `0x${string}`;
  const now = Date.now();

  if (userBalances[cleanWallet] === undefined) {
    userBalances[cleanWallet] = isTestEnv ? 10000_000000n : 0n;
  }

  const cached = balanceCache[cleanWallet];
  const localMinted = isTestEnv ? (userBalances[cleanWallet] ?? 0n) : 0n;

  if (cached && now < cached.expiry) {
    return cached.usdc + localMinted;
  }

  let onChainUsdc = 0n;
  try {
    if (/^0x[a-f0-9]{40}$/i.test(cleanWallet)) {
      onChainUsdc = (await publicClient.readContract({
        address: BASE_SEPOLIA_USDC,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [cleanWallet],
      })) as bigint;
    }
  } catch {
    // Fallback on network timeout
    if (cached) return cached.usdc + localMinted;
  }

  if (!balanceCache[cleanWallet]) {
    balanceCache[cleanWallet] = { usdc: onChainUsdc, eth: "0.0000", expiry: now + 30000 };
  } else {
    balanceCache[cleanWallet].usdc = onChainUsdc;
    balanceCache[cleanWallet].expiry = now + 30000;
  }

  return onChainUsdc + localMinted;
}

export async function getLiveEthBalance(walletAddress: string): Promise<string> {
  const cleanWallet = walletAddress.toLowerCase().trim() as `0x${string}`;
  const now = Date.now();

  const cached = balanceCache[cleanWallet];
  if (cached && now < cached.expiry && cached.eth !== "0.0000") {
    return cached.eth;
  }

  try {
    if (/^0x[a-f0-9]{40}$/i.test(cleanWallet)) {
      const eth = await publicClient.getBalance({ address: cleanWallet });
      const formatted = (Number(eth) / 1e18).toFixed(4);
      if (!balanceCache[cleanWallet]) {
        balanceCache[cleanWallet] = { usdc: 0n, eth: formatted, expiry: now + 30000 };
      } else {
        balanceCache[cleanWallet].eth = formatted;
        balanceCache[cleanWallet].expiry = now + 30000;
      }
      return formatted;
    }
  } catch {
    if (cached) return cached.eth;
  }
  return "0.0000";
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
    throw new Error("Only the volunteer can deploy the circle vault.");
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
    throw new Error("Only the volunteer can start the vault.");
  }

  const status = await getAutopayStatusForCircle(circleId);
  if (!status.members.every((m) => m.status === "GIVEN")) {
    throw new Error("Cannot call start(): All members must grant autopay permissions first.");
  }

  vaultInfo.isStarted = true;
  return true;
}
