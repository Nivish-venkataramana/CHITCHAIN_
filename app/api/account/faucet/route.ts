import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/users";
import { mintFaucetTokens, getUserBalance } from "@/lib/account-store";
import { fromBaseUnits } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    let mintAmount = 10000;
    try {
      const body = await req.json();
      if (body?.amount && Number(body.amount) > 0) {
        mintAmount = Number(body.amount);
      }
    } catch {
      // no body passed, use default 10,000
    }

    const updatedBalance = await mintFaucetTokens(user.walletAddress, mintAmount);

    return NextResponse.json({
      success: true,
      balanceBaseUnits: updatedBalance.toString(),
      balanceUSDC: fromBaseUnits(updatedBalance.toString()),
      message: `Minted ${mintAmount.toLocaleString()} MockUSDC to smart account via gasless paymaster`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to mint from faucet" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    const balance = await getUserBalance(user.walletAddress);

    return NextResponse.json({
      balanceBaseUnits: balance.toString(),
      balanceUSDC: fromBaseUnits(balance.toString()),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch balance" },
      { status: 500 }
    );
  }
}
