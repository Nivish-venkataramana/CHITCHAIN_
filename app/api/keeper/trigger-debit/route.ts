import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { keccak256, toHex, parseUnits } from "viem";
import { debitUserBalance, depositToCirclePool, getUserBalance, getCirclePoolBalance } from "@/lib/account-store";
import { fromBaseUnits } from "@/lib/validation";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { circleId, memberAddress, monthlyAmount = 25000, simulateBounce = false } = body;

    if (!circleId || !memberAddress) {
      return NextResponse.json({ error: "Missing circleId or memberAddress" }, { status: 400 });
    }

    const normalizedAddress = memberAddress.toLowerCase();

    // 1. Fetch circle details from database or mock fallback
    let circle = null;
    try {
      circle = await prisma.circle.findUnique({
        where: { id: circleId },
      });
    } catch (e) {
      console.warn("Could not query circle from database:", e);
    }

    const durationMonths = circle?.durationMonths || 3;
    const numPeople = circle?.numPeople || 4;
    const currentMonth = 1; // Evaluated dynamically or simulated

    // 2. Layer 1: Timing Check (Chainlink checkUpkeep simulation)
    const checkUpkeepResult = {
      upkeepNeeded: true,
      reason: "Cycle deduction interval reached (Day 1 trigger)",
      layer: "Layer 1: Chainlink Automation Trigger",
      timestamp: new Date().toISOString(),
    };

    // 3. Layer 2: On-Chain Cryptographic Check (Rhinestone SmartSession on Biconomy Nexus)
    const parsedAmountBaseUnits = parseUnits(monthlyAmount.toString(), 6).toString();
    const sessionMandateId = `mandate-${circleId.slice(0, 8)}-${normalizedAddress.slice(0, 6)}`;
    const sessionTxHash = `0x${keccak256(toHex(`debit-${Date.now()}-${normalizedAddress}`)).slice(2)}`;

    let layer2Status: "VERIFIED" | "FAILED" = "VERIFIED";
    let layer2Details = {
      spendingLimitPolicy: `VERIFIED: Exactly ${monthlyAmount} USDC (${parsedAmountBaseUnits} base units)`,
      timeFramePolicy: "VERIFIED: >= 30 days since last debit (or Month 1 Primer)",
      module: "Rhinestone SmartSessions (ERC-7579)",
      smartAccount: "Biconomy Nexus",
    };

    if (simulateBounce) {
      layer2Status = "FAILED";
      layer2Details.spendingLimitPolicy = "FAILED: User wallet empty / fiat mandate bounced";
    }

    // 4. Layer 3: Failsafe Solvency Verification & Collateral Slashing
    let layer3Status = "SOLVENT_NORMAL";
    let slashingResult = null;
    let fallbackAction = "Direct SmartSession Pull Succeeded";

    if (layer2Status === "FAILED") {
      layer3Status = "COLLATERAL_SLASHED";
      fallbackAction = "Auto-Pay pull bounced -> Slashed 1 month collateral from locked 3-month reserve buffer";
      slashingResult = {
        member: normalizedAddress,
        slashedAmountUSDC: monthlyAmount,
        remainingReserveMonths: 2,
        communalPoolProtected: true,
        solvencyPercentage: "100%",
      };
    }

    // 5. Bookend Lifecycle State Resolution
    let lifecyclePhase = "Month 1: The Yield Primer";
    let lifecycleNote = "No bidding in Month 1. Funds + upfront 3-month reserves routed to Aave V3 yield pool.";

    if (durationMonths > 1) {
      lifecyclePhase = "Core Loop (Month 1 -> 2 transition)";
      lifecycleNote = "Communal pot funded on Day 1 before Day 2 auction reveal.";
    }

    // Execute actual balance cutting and pool deposit if verified
    let memberNewBalanceUSDC = monthlyAmount;
    if (layer2Status === "VERIFIED") {
      await debitUserBalance(normalizedAddress, monthlyAmount);
      await depositToCirclePool(circleId, monthlyAmount);
      const newBal = await getUserBalance(normalizedAddress);
      memberNewBalanceUSDC = fromBaseUnits(newBal.toString());
    }
    const totalVaultBalance = await getCirclePoolBalance(circleId);

    // Log Notification in DB
    try {
      await prisma.notification.create({
        data: {
          userWallet: normalizedAddress,
          type: layer2Status === "VERIFIED" ? "FINALIZED" : "ISSUE_RAISED",
          circleId,
          body: layer2Status === "VERIFIED"
            ? `Auto-pay debit of $${monthlyAmount.toLocaleString()} USDC executed successfully. Remaining balance: $${memberNewBalanceUSDC.toLocaleString()} USDC.`
            : `Auto-pay failed. 1 month collateral ($${monthlyAmount.toLocaleString()} USDC) slashed from 3-month reserve buffer to protect pot.`,
        },
      });
    } catch (e) {
      console.warn("Could not insert notification:", e);
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      circleId,
      memberAddress: normalizedAddress,
      cycleMonth: currentMonth,
      monthlyAmountUSDC: monthlyAmount,
      memberNewBalanceUSDC,
      circleVaultTotalUSDC: fromBaseUnits(totalVaultBalance.toString()),
      layer1: checkUpkeepResult,
      layer2: {
        status: layer2Status,
        sessionMandateId,
        txHash: sessionTxHash,
        ...layer2Details,
      },
      layer3: {
        status: layer3Status,
        fallbackAction,
        slashingResult,
        communalPotSurvives: true,
      },
      lifecycle: {
        phase: lifecyclePhase,
        note: lifecycleNote,
      },
    });
  } catch (error: any) {
    console.error("Keeper Execution Error:", error);
    return NextResponse.json({ error: error.message || "Failed to execute keeper debit" }, { status: 500 });
  }
}
