// ChitChain Yield & Aave Types and Configuration

export type YieldOperatingMode = "LIVE" | "SIMULATION";

export type YieldIntegrationStatus =
  | "UNCONFIGURED"
  | "NETWORK_MISMATCH"
  | "TOKEN_UNVERIFIED"
  | "RESERVE_UNSUPPORTED"
  | "RESERVE_PAUSED"
  | "RESERVE_FROZEN"
  | "READ_ONLY"
  | "READY"
  | "TEMPORARILY_UNAVAILABLE";

export interface AaveMarketConfig {
  chainId: number;
  networkName: string;
  poolAddress: `0x${string}`;
  poolDataProviderAddress?: `0x${string}`;
  usdcAddress: `0x${string}`;
  aTokenAddress?: `0x${string}`;
  decimals: number;
  explorerBaseUrl: string;
  isTestnet: boolean;
}

export const AAVE_CONFIG_BASE_SEPOLIA: AaveMarketConfig = {
  chainId: 84532,
  networkName: "Base Sepolia",
  poolAddress: "0x07eA79F68B2B3df564D0A34F8e19D9B1e339814b",
  usdcAddress: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // Official Base Sepolia Circle USDC
  aTokenAddress: "0x1b41C313b28b7654E41E66B4084F5c0a0c4C0a0E", // aBasSepUSDC
  decimals: 6,
  explorerBaseUrl: "https://sepolia.basescan.org",
  isTestnet: true,
};

export const AAVE_CONFIG_BASE_MAINNET: AaveMarketConfig = {
  chainId: 8453,
  networkName: "Base Mainnet",
  poolAddress: "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5",
  usdcAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Native USDC on Base
  aTokenAddress: "0x4e65fE4DbA92Fc6Ba3818CE37678523c9fbcBf10", // aBasUSDC
  decimals: 6,
  explorerBaseUrl: "https://basescan.org",
  isTestnet: false,
};

export interface LiveYieldState {
  mode: "LIVE";
  status: YieldIntegrationStatus;
  statusReason?: string;
  chainId: number;
  walletAddress: string | null;
  vaultAddress: string | null;
  strategyAddress: string | null;
  tokenAddress: string;
  aTokenAddress: string | null;
  poolAddress: string;
  decimals: number;
  // Actual onchain balances in base units (string) and formatted (number)
  idleVaultBalanceBase: string;
  idleVaultBalanceFormatted: number;
  strategyUnderlyingBalanceBase: string;
  strategyUnderlyingBalanceFormatted: number;
  aavePositionValueBase: string;
  aavePositionValueFormatted: number;
  totalStrategyValueFormatted: number;
  // Liquidity & Obligations
  protectedObligationsFormatted: number;
  requiredLiquidityBufferFormatted: number;
  investableSurplusFormatted: number;
  // Reconciled Strategy Accounting
  cumulativeSuppliesBase: string;
  cumulativeSuppliesFormatted: number;
  cumulativeWithdrawalsBase: string;
  cumulativeWithdrawalsFormatted: number;
  netStrategyGainFormatted: number;
  recognizedYieldFormatted: number;
  distributedYieldFormatted: number;
  undistributedYieldFormatted: number;
  // Live Aave Market Rate
  currentSupplyAPY: number | null;
  rateType: "VARIABLE_APY" | "FIXED" | "UNAVAILABLE";
  rateLastUpdated: string | null;
  rateFreshness: "LIVE" | "STALE" | "UNAVAILABLE";
  lastReconciliationTimestamp: string;
}

export interface SimulationScenarioConfig {
  monthlyContribution: number; // e.g. 10000 USDC
  durationMonths: number; // e.g. 24
  hypotheticalAPR: number; // e.g. 0.0808 (8.08%)
  compoundingFrequency: "DAILY" | "MONTHLY";
  depositTiming: "END_OF_MONTH" | "BEGINNING_OF_MONTH";
  withdrawals?: Array<{ month: number; amount: number }>;
}

export interface SimulationMonthRecord {
  month: number;
  virtualDate: string;
  openingBalance: number;
  newContribution: number;
  simulatedInterest: number;
  withdrawal: number;
  closingBalance: number;
  cumulativeContributions: number;
  cumulativeInterest: number;
}

export interface SimulationResult {
  mode: "SIMULATION";
  scenario: SimulationScenarioConfig;
  totalContributions: number;
  projectedFinalValue: number;
  projectedTotalInterest: number;
  effectiveAnnualYield: number;
  currentVirtualMonth: number;
  monthlyLedger: SimulationMonthRecord[];
  disclaimer: string;
}
