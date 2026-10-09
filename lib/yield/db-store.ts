import { LiveYieldState, YieldIntegrationStatus, AAVE_CONFIG_BASE_SEPOLIA } from "./types";
import { fromTokenBaseUnits, toTokenBaseUnits } from "./reconciliation";

export interface StoredYieldStrategy {
  circleId: string;
  chainId: number;
  vaultAddress: string;
  strategyAddress: string;
  tokenAddress: string;
  aavePoolAddress: string;
  aTokenAddress: string;
  cumulativeSupplies: string;
  cumulativeWithdrawals: string;
  currentPositionValue: string;
  lastUpdated: Date;
}

export interface StoredYieldTransaction {
  id: string;
  circleId: string;
  chainId: number;
  txHash: string;
  blockNumber: number;
  operationType: "SUPPLY" | "WITHDRAW" | "DISTRIBUTE";
  amountBaseUnits: string;
  tokenAddress: string;
  status: "CONFIRMED" | "PENDING" | "REVERTED";
  timestamp: Date;
}

const g = globalThis as any;

if (!g.__chitchain_yield_strategies__) {
  g.__chitchain_yield_strategies__ = new Map<string, StoredYieldStrategy>();
}

if (!g.__chitchain_yield_txs__) {
  g.__chitchain_yield_txs__ = [];
}

const strategies: Map<string, StoredYieldStrategy> = g.__chitchain_yield_strategies__;
const transactions: StoredYieldTransaction[] = g.__chitchain_yield_txs__;

export function getYieldStrategy(circleId: string): StoredYieldStrategy | undefined {
  return strategies.get(circleId);
}

export function saveYieldStrategy(strategy: StoredYieldStrategy): void {
  strategies.set(strategy.circleId, { ...strategy, lastUpdated: new Date() });
}

export function recordYieldTransaction(tx: StoredYieldTransaction): void {
  transactions.unshift(tx);
}

export function getYieldTransactions(circleId: string): StoredYieldTransaction[] {
  return transactions.filter((t) => t.circleId === circleId);
}

export function resetLiveYieldStore(): void {
  strategies.clear();
  transactions.length = 0;
}

export interface LiveYieldActionParams {
  circleId: string;
  type: "SUPPLY" | "WITHDRAW" | "DISTRIBUTE";
  amount: number;
  txHash: string;
  userAddress: string;
}

export function recordLiveYieldAction(params: LiveYieldActionParams) {
  const { circleId, type, amount, txHash } = params;
  const config = AAVE_CONFIG_BASE_SEPOLIA;
  const amountBase = toTokenBaseUnits(amount, config.decimals);

  let strategy = getYieldStrategy(circleId);
  if (!strategy) {
    strategy = {
      circleId,
      chainId: config.chainId,
      vaultAddress: "0x1111111111111111111111111111111111111111",
      strategyAddress: "0x2222222222222222222222222222222222222222",
      tokenAddress: config.usdcAddress,
      aavePoolAddress: config.poolAddress,
      aTokenAddress: config.aTokenAddress || "",
      cumulativeSupplies: "0",
      cumulativeWithdrawals: "0",
      currentPositionValue: "0",
      lastUpdated: new Date(),
    };
  }

  const currentSupplies = fromTokenBaseUnits(strategy.cumulativeSupplies, config.decimals);
  const currentWithdrawals = fromTokenBaseUnits(strategy.cumulativeWithdrawals, config.decimals);
  const currentPos = fromTokenBaseUnits(strategy.currentPositionValue, config.decimals);

  if (type === "SUPPLY") {
    const newSupplied = currentSupplies + amount;
    const newPos = currentPos + amount;
    strategy.cumulativeSupplies = toTokenBaseUnits(newSupplied, config.decimals);
    strategy.currentPositionValue = toTokenBaseUnits(newPos, config.decimals);
  } else if (type === "WITHDRAW") {
    const newWithdrawn = currentWithdrawals + amount;
    const newPos = Math.max(0, currentPos - amount);
    strategy.cumulativeWithdrawals = toTokenBaseUnits(newWithdrawn, config.decimals);
    strategy.currentPositionValue = toTokenBaseUnits(newPos, config.decimals);
  }

  saveYieldStrategy(strategy);

  const txRecord: StoredYieldTransaction = {
    id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    circleId,
    chainId: config.chainId,
    txHash,
    blockNumber: 1234567,
    operationType: type,
    amountBaseUnits: amountBase,
    tokenAddress: config.usdcAddress,
    status: "CONFIRMED",
    timestamp: new Date(),
  };

  recordYieldTransaction(txRecord);

  return getLiveYieldState(circleId);
}

export function getLiveYieldState(circleId: string) {
  const config = AAVE_CONFIG_BASE_SEPOLIA;
  const strategy = getYieldStrategy(circleId);
  const txs = getYieldTransactions(circleId);

  const cumulativeSupplied = strategy ? fromTokenBaseUnits(strategy.cumulativeSupplies, config.decimals) : 0;
  const cumulativeWithdrawn = strategy ? fromTokenBaseUnits(strategy.cumulativeWithdrawals, config.decimals) : 0;
  const currentStrategyValue = strategy ? fromTokenBaseUnits(strategy.currentPositionValue, config.decimals) : 0;

  return {
    circleId,
    status: "ACTIVE",
    cumulativeSupplied,
    cumulativeWithdrawn,
    currentStrategyValue,
    recentTransactions: txs.map((t) => ({
      id: t.id,
      type: t.operationType,
      amount: fromTokenBaseUnits(t.amountBaseUnits, config.decimals),
      txHash: t.txHash,
      timestamp: t.timestamp,
    })),
  };
}

