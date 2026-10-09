"use client";

import React, { useEffect, useState } from "react";
import { PrivyProvider } from "@privy-io/react-auth";
import { baseSepolia } from "viem/chains";

export interface AccountPrivyProviderProps {
  children: React.ReactNode;
}

export function AccountPrivyProvider({ children }: AccountPrivyProviderProps) {
  const appId =
    process.env.NEXT_PUBLIC_PRIVY_APP_ID || "cl00000000000000000000001";

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // During SSR or before mount, render children directly to prevent prerender errors
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        defaultChain: baseSepolia,
        supportedChains: [baseSepolia],
        embeddedWallets: {
          ethereum: {
            createOnLogin: "users-without-wallets",
          },
        },
        loginMethods: ["email", "sms", "wallet"],
        appearance: {
          theme: "dark",
          accentColor: "#ef4444", // Matching ChitChain red accent
          showWalletLoginFirst: false,
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
