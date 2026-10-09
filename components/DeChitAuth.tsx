"use client";

import { useEffect, useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { createSmartAccountClient } from "@biconomy/account";
import { createWalletClient, custom } from "viem";
import { baseSepolia } from "viem/chains";

export default function DeChitAuth() {
  const { ready, authenticated, login, logout } = usePrivy();
  const { wallets } = useWallets();
  
  const [smartAccountAddress, setSmartAccountAddress] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  useEffect(() => {
    async function setupNexusSmartAccount() {
      setIsInitializing(true);
      try {
        // 1. Isolate the Privy embedded wallet
        const embeddedWallet = wallets.find((w) => w.walletClientType === "privy");
        if (!embeddedWallet) return;

        // 2. Extract provider and wrap with Viem for Base Sepolia
        const provider = await embeddedWallet.getEthereumProvider();
        const viemClient = createWalletClient({
          chain: baseSepolia,
          transport: custom(provider),
        });

        // 3. Initialize the Biconomy Nexus Smart Account
        const nexusAccount = await createSmartAccountClient({
          signer: viemClient,
          bundlerUrl: `https://bundler.biconomy.io/api/v3/84532/n?key=${process.env.NEXT_PUBLIC_BICONOMY_API_KEY || "mee_Pd1pRe53oeH6TqsMkQEw3j"}`,
          biconomyPaymasterApiKey: (process.env.NEXT_PUBLIC_BICONOMY_API_KEY || "mee_Pd1pRe53oeH6TqsMkQEw3j") as string,
        });

        // 4. Retrieve and set the final gasless Smart Account address
        const scaAddress = await nexusAccount.getAccountAddress();
        setSmartAccountAddress(scaAddress);
        console.log("Nexus Smart Account successfully initialized at:", scaAddress);

      } catch (error) {
        console.error("Failed to initialize Nexus account:", error);
      } finally {
        setIsInitializing(false);
      }
    }

    // Only run if user is logged in and Privy has finished generating the wallet
    if (authenticated && wallets.length > 0) {
      setupNexusSmartAccount();
    } else {
      setSmartAccountAddress(null);
    }
  }, [authenticated, wallets]);

  // Prevent UI rendering flashes before Privy loads
  if (!ready) {
    return (
      <div className="flex items-center justify-center p-8 text-neutral-500 font-mono text-xs">
        Loading De-Chit platform...
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-neutral-950 rounded-2xl shadow-2xl border border-neutral-800 text-white font-sans">
      <h2 className="text-2xl font-bold text-white mb-6 text-center">
        De-Chit Savings
      </h2>

      {!authenticated ? (
        <div className="flex flex-col items-center">
          <p className="text-neutral-400 mb-6 text-center text-sm">
            Log in with your email to access your automated Base Sepolia savings circle.
          </p>
          <button
            onClick={login}
            className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg shadow-orange-950/40"
          >
            Sign In / Create Account
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center space-y-4">
          <div className="w-full p-4 bg-neutral-900 rounded-xl border border-neutral-800">
            <p className="text-xs text-emerald-400 font-mono font-medium mb-1">Status: Authenticated</p>
            
            {isInitializing && !smartAccountAddress ? (
              <p className="text-xs text-neutral-400 animate-pulse mt-2 font-mono">
                Deploying gasless Nexus Smart Account...
              </p>
            ) : smartAccountAddress ? (
              <div className="mt-2 space-y-1">
                <p className="text-[10px] uppercase font-mono tracking-wider text-neutral-500">Your Smart Account Address:</p>
                <code className="block p-2.5 bg-black rounded-lg text-[11px] break-all text-neutral-300 font-mono border border-neutral-800 select-all">
                  {smartAccountAddress}
                </code>
              </div>
            ) : null}
          </div>

          <button
            onClick={logout}
            className="w-full py-2.5 px-4 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white font-medium text-xs rounded-xl transition-all cursor-pointer mt-4"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
