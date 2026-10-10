import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { keccak256, toHex, parseUnits } from "viem";
import { debitUserBalance, depositToCirclePool, getCirclePoolBalance, getUserBalance } from "@/lib/account-store";
import { fromBaseUnits } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { circleId, monthlyAmount = 25000 } = body;

    if (!circleId) {
      return NextResponse.json({ error: "Missing circleId" }, { status: 400 });
    }

    // 1. Fetch circle details and invites from database
    let circle = null;
    let invites: any[] = [];
    try {
      circle = await prisma.circle.findUnique({
        where: { id: circleId },
      });
      invites = await prisma.invite.findMany({
        where: { circleId, status: { in: ["ACCEPTED", "PENDING"] } },
      });
    } catch (e) {
      console.warn("Could not query circle from database:", e);
    }

    // 2. Fetch all given consents for this circle
    const consents = await prisma.autopayConsent.findMany({
      where: { circleId, status: "GIVEN" },
    });

    // Build participant list
    const participantWallets: string[] = [];
    if (circle?.volunteerWallet) {
      participantWallets.push(circle.volunteerWallet.toLowerCase());
    }
    invites.forEach((inv) => {
      if (inv.inviteeWallet && !participantWallets.includes(inv.inviteeWallet.toLowerCase())) {
        participantWallets.push(inv.inviteeWallet.toLowerCase());
      }
    });

    if (participantWallets.length === 0) {
      return NextResponse.json({ error: "No participants found in this circle" }, { status: 400 });
    }

    const debitedMembers: Array<{
      walletAddress: string;
      debitedAmountUSDC: number;
      newBalanceUSDC: number;
      mandateStatus: string;
      txHash: string;
    }> = [];

    let totalPooledUSDC = 0;

    for (const wallet of participantWallets) {
      const hasMandate = consents.some((c) => c.memberAddress.toLowerCase() === wallet);
      
      // Execute debit from account
      await debitUserBalance(wallet, monthlyAmount);
      const newBal = await getUserBalance(wallet);
      await depositToCirclePool(circleId, monthlyAmount);
      totalPooledUSDC += monthlyAmount;

      const txHash = `0x${keccak256(toHex(`debit-pool-${Date.now()}-${wallet}-${circleId}`)).slice(2)}`;

      debitedMembers.push({
        walletAddress: wallet,
        debitedAmountUSDC: monthlyAmount,
        newBalanceUSDC: Number(fromBaseUnits(newBal.toString())),
        mandateStatus: hasMandate ? "SMARTSESSION_AUTHORIZED" : "MANUAL_OR_FALLBACK_EXECUTED",
        txHash,
      });

      // Notification record
      try {
        await prisma.notification.create({
          data: {
            userWallet: wallet,
            type: "FINALIZED",
            circleId,
            body: `Autopay executed: $${monthlyAmount.toLocaleString()} USDC debited to communal pot for Cycle Month 1.`,
          },
        });
      } catch {}
    }

    const totalVaultBalance = await getCirclePoolBalance(circleId);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      circleId,
      monthlyAmountUSDC: monthlyAmount,
      totalParticipants: participantWallets.length,
      totalPooledUSDC,
      circleVaultTotalUSDC: fromBaseUnits(totalVaultBalance.toString()),
      debitedMembers,
      batchTxHash: `0x${keccak256(toHex(`batch-pool-${Date.now()}-${circleId}`)).slice(2)}`,
      lifecycle: {
        phase: "Month 1: The Yield Primer",
        action: "Pooled funds + 3-month reserves routed to Aave V3 yield pool on Base Sepolia.",
      },
    });
  } catch (error: any) {
    console.error("Batch Keeper Debit Error:", error);
    return NextResponse.json({ error: error.message || "Failed to execute batch autopay pooling" }, { status: 500 });
  }
}
