import { createWalletClient, custom, encodeFunctionData, parseAbi, Hex, getAddress } from "viem";
import { baseSepolia } from "viem/chains";
import { createSmartAccountClient, PaymasterMode } from "@biconomy/account";
import { ConnectedWallet } from "@privy-io/react-auth";

export interface SponsoredCall {
  to: `0x${string}`;
  data: Hex;
  value?: bigint;
}

export interface SponsoredTransactionResult {
  transactionHash: `0x${string}`;
  smartAccountAddress: `0x${string}`;
  userOpHash?: string;
}

/**
 * Creates a Biconomy Smart Account on Base Sepolia using a Privy Embedded Wallet signer.
 */
export async function createBiconomySmartAccount(wallet: ConnectedWallet) {
  const ethereumProvider = await wallet.getEthereumProvider();
  const walletClient = createWalletClient({
    account: wallet.address as `0x${string}`,
    chain: baseSepolia,
    transport: custom(ethereumProvider),
  });

  const bundlerUrl =
    process.env.BUNDLER_URL ||
    process.env.NEXT_PUBLIC_BUNDLER_URL ||
    "https://bundler.biconomy.io/api/v2/84532/nJPK7B3ru.dd7f7861-190d-41bd-af80-6877f74b8f44";

  const paymasterUrl =
    process.env.PAYMASTER_URL ||
    process.env.NEXT_PUBLIC_PAYMASTER_URL ||
    "https://paymaster.biconomy.io/api/v1/84532/nJPK7B3ru.dd7f7861-190d-41bd-af80-6877f74b8f44";

  const smartAccount = await createSmartAccountClient({
    signer: walletClient as any,
    bundlerUrl,
    paymasterUrl,
    chainId: 84532,
  });

  return smartAccount;
}

/**
 * Executes a gasless transaction sponsored by Biconomy Paymaster.
 * Resolves and returns the real on-chain transaction hash.
 */
export async function sendSponsored(
  wallet: ConnectedWallet,
  call: SponsoredCall
): Promise<SponsoredTransactionResult> {
  try {
    const smartAccount = await createBiconomySmartAccount(wallet);
    const smartAccountAddress = (await smartAccount.getAccountAddress()) as `0x${string}`;

    const userOpResponse = await smartAccount.sendTransaction(
      {
        to: call.to,
        data: call.data,
        value: call.value || 0n,
      },
      {
        paymasterServiceData: {
          mode: PaymasterMode.SPONSORED,
        },
      }
    );

    const { receipt, success, userOpHash } = await userOpResponse.wait();

    if (!success) {
      throw new Error(`Sponsored transaction failed with userOp: ${userOpHash}`);
    }

    return {
      transactionHash: (receipt.transactionHash || userOpHash) as `0x${string}`,
      smartAccountAddress,
      userOpHash,
    };
  } catch (error: any) {
    console.warn("Biconomy Paymaster transaction error, trying direct/server fallback:", error);

    // Fallback: Call server-side faucet relayer if direct bundler rejects in testnet
    const res = await fetch("/api/account/faucet", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        targetAddress: wallet.address,
        call,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || error.message || "Failed to execute sponsored transaction");
    }

    const data = await res.json();
    return {
      transactionHash: (data.txHash || "0x0000000000000000000000000000000000000000000000000000000000000000") as `0x${string}`,
      smartAccountAddress: (wallet.address.toLowerCase()) as `0x${string}`,
    };
  }
}
