"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount, AccountState } from "./useAccount";

export interface RouteGuardOptions {
  requiredState?: AccountState;
  redirectTo?: string;
}

/**
 * Route guard helper:
 * - loggedOut -> redirects to /account/login
 * - needsProfile -> redirects to /account/create
 * - ready -> continues
 */
export function useRouteGuard(expectedState: "ready" | "needsProfile" | "loggedOut" = "ready") {
  const router = useRouter();
  const account = useAccount();

  useEffect(() => {
    if (account.state === "loading") return;

    if (account.state === "loggedOut" && expectedState !== "loggedOut") {
      router.push("/account/login");
    } else if (account.state === "needsProfile" && expectedState === "ready") {
      router.push("/account/create");
    } else if (account.state === "ready" && expectedState === "loggedOut") {
      router.push("/account/wallet");
    }
  }, [account.state, expectedState, router]);

  return account;
}
