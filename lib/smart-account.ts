import { createSmartAccountClient } from "@biconomy/account";
import { createWalletClient, custom } from "viem";
import { baseSepolia } from "viem/chains";
import type { ConnectedWallet, User as PrivyUser } from "@privy-io/react-auth";

export const BASE_SEPOLIA_CHAIN_ID = 84532;
export const BICONOMY_API_KEY = process.env.NEXT_PUBLIC_BICONOMY_API_KEY || "mee_Pd1pRe53oeH6TqsMkQEw3j";

/**
 * Deterministically initializes a Biconomy Nexus Smart Account for a Privy user.
 * 
 * Rules:
 * 1. Logs underlying Privy embedded signer address: console.log("Signer:", embeddedWallet.address)
 * 2. If Privy's native smart wallet is active (user?.smartWallet?.address), uses that as primary address.
 * 3. Otherwise, initializes Biconomy Nexus with fixed index: 0 and chainId: 84532 (Base Sepolia).
 */
export async function initDeterministicSmartAccount(params: {
  wallets: ConnectedWallet[];
  privyUser?: PrivyUser | null;
}): Promise<{ address: string; provider?: any }> {
  const { wallets, privyUser } = params;

  // 1. Isolate the Privy embedded signer wallet
  const embeddedWallet = wallets.find((w) => w.walletClientType === "privy") || wallets[0];
  if (!embeddedWallet) {
    throw new Error("No embedded or connected wallet found");
  }

  // 2. Log underlying Privy embedded signer address
  console.log("Signer:", embeddedWallet.address);

  // 3. If Privy's native smart wallet is active, use that as primary address
  const nativeSmartWallet = (privyUser as any)?.smartWallet?.address;
  if (nativeSmartWallet && /^0x[a-f0-9]{40}$/i.test(nativeSmartWallet)) {
    console.log("Using native Privy smart wallet:", nativeSmartWallet);
    const provider = await embeddedWallet.getEthereumProvider().catch(() => null);
    return { address: nativeSmartWallet.toLowerCase(), provider };
  }

  // 4. Otherwise, extract provider and wrap with Viem for Base Sepolia
  const provider = await embeddedWallet.getEthereumProvider();
  const viemClient = createWalletClient({
    chain: baseSepolia,
    transport: custom(provider),
  });

  try {
    // 5. Initialize Biconomy Nexus client with fixed index: 0 and chainId: 84532
    const nexusAccount = await createSmartAccountClient({
      signer: viemClient,
      chainId: BASE_SEPOLIA_CHAIN_ID,
      index: 0,
      bundlerUrl: `https://bundler.biconomy.io/api/v3/84532/n?key=${BICONOMY_API_KEY}`,
      biconomyPaymasterApiKey: BICONOMY_API_KEY,
    });

    const scaAddress = await nexusAccount.getAccountAddress();
    console.log("Deterministic Biconomy Smart Account address:", scaAddress);
    return { address: scaAddress.toLowerCase(), provider };
  } catch (err) {
    console.warn("Nexus SDK initialization fallback to signer address:", err);
    return { address: embeddedWallet.address.toLowerCase(), provider };
  }
}
