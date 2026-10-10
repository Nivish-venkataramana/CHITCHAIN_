import { NextRequest, NextResponse } from "next/server";
import { getLiveYieldState } from "@/lib/yield/live-service";
import { getCircleRecordById } from "@/lib/circles-store";
import {
  getYieldStrategy,
  saveYieldStrategy,
  recordYieldTransaction,
  getYieldTransactions,
} from "@/lib/yield/db-store";
import { toTokenBaseUnits, fromTokenBaseUnits } from "@/lib/yield/reconciliation";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const circleId = params.id;
  const { circle } = await getCircleRecordById(circleId);

  const walletHeader = req.headers.get("x-dev-wallet") || null;
  const vaultAddress = circle?.vaultAddress || null;

  const state = await getLiveYieldState(circleId, vaultAddress, walletHeader);
  const transactions = getYieldTransactions(circleId);

  return NextResponse.json({
    state,
    transactions,
    circleName: circle?.name || "Wealth Circle",
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const circleId = params.id;
  const { circle } = await getCircleRecordById(circleId);


  try {
    const body = await req.json();
    const { action, amount, txHash } = body;

    if (!action || !amount || Number(amount) <= 0) {
      return NextResponse.json(
        { error: "Invalid action or amount provided." },
        { status: 400 }
      );
    }

    const numAmount = Number(amount);
    let strategy = getYieldStrategy(circleId);

    if (!strategy) {
      strategy = {
        circleId,
        chainId: 84532,
        vaultAddress: circle?.vaultAddress?.toLowerCase() || "0x1111111111111111111111111111111111111111",
        strategyAddress: "0x2222222222222222222222222222222222222222",
        tokenAddress: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
        aavePoolAddress: "0x07eA79F68B2B3df564D0A34F8e19D9B1e339814b",
        aTokenAddress: "0x1b41C313b28b7654E41E66B4084F5c0a0c4C0a0E",
        cumulativeSupplies: "0",
        cumulativeWithdrawals: "0",
        currentPositionValue: "0",
        lastUpdated: new Date(),
      };
    }

    const currentSupplies = fromTokenBaseUnits(strategy.cumulativeSupplies);
    const currentWithdrawals = fromTokenBaseUnits(strategy.cumulativeWithdrawals);
    const currentPos = fromTokenBaseUnits(strategy.currentPositionValue);

    if (action === "SUPPLY") {
      const newSupplies = currentSupplies + numAmount;
      const newPos = currentPos + numAmount;

      strategy.cumulativeSupplies = toTokenBaseUnits(newSupplies);
      strategy.currentPositionValue = toTokenBaseUnits(newPos);
      saveYieldStrategy(strategy);

      recordYieldTransaction({
        id: `ytx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        circleId,
        chainId: 84532,
        txHash: txHash || `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`,
        blockNumber: 12345678,
        operationType: "SUPPLY",
        amountBaseUnits: toTokenBaseUnits(numAmount),
        tokenAddress: strategy.tokenAddress,
        status: "CONFIRMED",
        timestamp: new Date(),
      });

      return NextResponse.json({ success: true, message: `Successfully supplied ${numAmount} USDC to Aave.` });
    } else if (action === "WITHDRAW") {
      if (numAmount > currentPos) {
        return NextResponse.json(
          { error: `Insufficient Aave position to withdraw (${currentPos} USDC available).` },
          { status: 400 }
        );
      }

      const newWithdrawals = currentWithdrawals + numAmount;
      const newPos = Math.max(0, currentPos - numAmount);

      strategy.cumulativeWithdrawals = toTokenBaseUnits(newWithdrawals);
      strategy.currentPositionValue = toTokenBaseUnits(newPos);
      saveYieldStrategy(strategy);

      recordYieldTransaction({
        id: `ytx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        circleId,
        chainId: 84532,
        txHash: txHash || `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`,
        blockNumber: 12345679,
        operationType: "WITHDRAW",
        amountBaseUnits: toTokenBaseUnits(numAmount),
        tokenAddress: strategy.tokenAddress,
        status: "CONFIRMED",
        timestamp: new Date(),
      });

      return NextResponse.json({ success: true, message: `Successfully withdrew ${numAmount} USDC from Aave to vault.` });
    }

    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to process yield transaction." }, { status: 500 });
  }
}
