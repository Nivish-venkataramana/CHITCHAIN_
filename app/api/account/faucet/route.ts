import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/users";
import { mintFaucetTokens, getUserBalance } from "@/lib/account-store";
import { fromBaseUnits } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {}

    let wallet = body.walletAddress || body.wallet;
    if (!wallet) {
      const user = getSessionUser(req);
      if (user?.walletAddress) {
        wallet = user.walletAddress;
      }
    }

    if (!wallet) {
      return NextResponse.json({ error: "Missing wallet address or unauthorized session" }, { status: 400 });
    }

    const amountUSDC = body.amount ? Number(body.amount) : 25000;
    const updatedBalance = await mintFaucetTokens(wallet, amountUSDC);

    return NextResponse.json({
      success: true,
      walletAddress: wallet,
      balanceBaseUnits: updatedBalance.toString(),
      balanceUSDC: fromBaseUnits(updatedBalance.toString()),
      message: `Minted ${amountUSDC.toLocaleString()} MockUSDC to smart account via gasless paymaster`,
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
    const { searchParams } = new URL(req.url);
    let wallet = searchParams.get("wallet") || searchParams.get("walletAddress");
    if (!wallet) {
      const user = getSessionUser(req);
      if (user?.walletAddress) {
        wallet = user.walletAddress;
      }
    }

    if (!wallet) {
      return NextResponse.json({ error: "Missing wallet address or unauthorized session" }, { status: 400 });
    }

    const balance = await getUserBalance(wallet);

    return NextResponse.json({
      walletAddress: wallet,
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
