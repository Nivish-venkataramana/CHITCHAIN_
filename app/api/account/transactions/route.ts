import { NextRequest, NextResponse } from "next/server";
import { findUserByUsername } from "@/lib/users";
import { getUserBalance } from "@/lib/account-store";

export interface TxItem {
  hash: string;
  from: string;
  to: string;
  value: string;
  tokenSymbol: string;
  timeStamp: number;
  isError: boolean;
  type: "IN" | "OUT" | "CONTRACT";
  blockNumber?: string;
  explorerUrl: string;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const addressParam = searchParams.get("address");
    const devUsername = req.headers.get("x-dev-user");

    let targetWallet = addressParam;

    if (!targetWallet && devUsername) {
      const user = await findUserByUsername(devUsername);
      if (user) {
        targetWallet = user.walletAddress;
      }
    }

    if (!targetWallet || !/^0x[a-f0-9]{40}$/i.test(targetWallet)) {
      return NextResponse.json({ transactions: [], message: "No wallet address provided" });
    }

    const cleanWallet = targetWallet.toLowerCase();
    const apiKey = process.env.BASESCAN_API_KEY || "";

    // Fetch real ERC20 token transfers and native transactions from BaseScan Sepolia
    const tokenUrl = `https://api-sepolia.basescan.org/api?module=account&action=tokentx&address=${cleanWallet}&startblock=0&endblock=99999999&sort=desc${apiKey ? `&apikey=${apiKey}` : ""}`;
    const txUrl = `https://api-sepolia.basescan.org/api?module=account&action=txlist&address=${cleanWallet}&startblock=0&endblock=99999999&sort=desc${apiKey ? `&apikey=${apiKey}` : ""}`;

    const [tokenRes, txRes] = await Promise.allSettled([
      fetch(tokenUrl, { next: { revalidate: 10 } }),
      fetch(txUrl, { next: { revalidate: 10 } }),
    ]);

    const txs: TxItem[] = [];

    // Parse token transfers (USDC, MockUSDC, etc.)
    if (tokenRes.status === "fulfilled" && tokenRes.value.ok) {
      const tokenData = await tokenRes.value.json();
      if (Array.isArray(tokenData?.result)) {
        for (const item of tokenData.result) {
          const decimals = Number(item.tokenDecimal || 6);
          const rawVal = BigInt(item.value || "0");
          const formattedVal = (Number(rawVal) / Math.pow(10, decimals)).toFixed(2);
          const isOut = item.from?.toLowerCase() === cleanWallet;

          txs.push({
            hash: item.hash,
            from: item.from,
            to: item.to,
            value: formattedVal,
            tokenSymbol: item.tokenSymbol || "USDC",
            timeStamp: Number(item.timeStamp) * 1000,
            isError: false,
            type: isOut ? "OUT" : "IN",
            blockNumber: item.blockNumber,
            explorerUrl: `https://sepolia.basescan.org/tx/${item.hash}`,
          });
        }
      }
    }

    // Parse normal ETH / contract calls
    if (txRes.status === "fulfilled" && txRes.value.ok) {
      const normalData = await txRes.value.json();
      if (Array.isArray(normalData?.result)) {
        for (const item of normalData.result) {
          // Avoid duplicate hashes from token transfers
          if (txs.some((t) => t.hash.toLowerCase() === item.hash?.toLowerCase())) {
            continue;
          }
          const rawVal = BigInt(item.value || "0");
          const formattedVal = (Number(rawVal) / 1e18).toFixed(4);
          const isOut = item.from?.toLowerCase() === cleanWallet;

          txs.push({
            hash: item.hash,
            from: item.from,
            to: item.to,
            value: formattedVal,
            tokenSymbol: "ETH",
            timeStamp: Number(item.timeStamp) * 1000,
            isError: item.isError === "1",
            type: isOut ? "OUT" : "IN",
            blockNumber: item.blockNumber,
            explorerUrl: `https://sepolia.basescan.org/tx/${item.hash}`,
          });
        }
      }
    }

    // Sort descending by timestamp
    txs.sort((a, b) => b.timeStamp - a.timeStamp);

    return NextResponse.json({
      walletAddress: cleanWallet,
      transactions: txs,
    });
  } catch (error: any) {
    console.error("Error fetching onchain transactions:", error);
    return NextResponse.json({ transactions: [], error: error.message }, { status: 500 });
  }
}
