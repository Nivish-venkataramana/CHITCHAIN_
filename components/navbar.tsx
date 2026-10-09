"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useDevUser } from "@/components/providers";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { createPublicClient, http, formatUnits, erc20Abi } from "viem";
import { baseSepolia } from "viem/chains";
import { Bell, Check, X, LogOut, User } from "lucide-react";

const BASE_SEPOLIA_USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org", {
    timeout: 3500,
    retryCount: 1,
  }),
});

interface NotificationItem {
  id: string;
  type: string;
  circleId: string;
  inviteId?: string;
  circleName: string;
  volunteerName: string;
  body: string;
  readAt: string | null;
  createdAt: string;
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, setUser } = useDevUser();
  const { user: privyUser, authenticated, logout } = usePrivy();
  const { wallets } = useWallets();

  const embeddedWallet = wallets.find((w) => w.walletClientType === "privy") || wallets[0];
  const activeWalletAddress = (
    user?.walletAddress ||
    (typeof window !== "undefined" ? localStorage.getItem("chitchain_smart_wallet_address") : "") ||
    (privyUser as any)?.smartWallet?.address ||
    embeddedWallet?.address ||
    privyUser?.wallet?.address ||
    ""
  ).toLowerCase();

  const userEmail = privyUser?.email?.address || "";
  const dynamicUsername = userEmail
    ? userEmail.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "").toLowerCase()
    : user?.username ||
      (activeWalletAddress ? `user_${activeWalletAddress.slice(2, 6).toLowerCase()}` : "member");

  const [mounted, setMounted] = useState(false);
  const [balance, setBalance] = useState<string | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchBalance = async () => {
    if (!activeWalletAddress || !/^0x[a-f0-9]{40}$/i.test(activeWalletAddress)) {
      setBalance("0.00");
      return;
    }
    try {
      const res = await fetch(`/api/account/faucet?walletAddress=${activeWalletAddress}`);
      if (res.ok) {
        const data = await res.json();
        if (data?.balanceUSDC !== undefined) {
          setBalance(Number(data.balanceUSDC).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
          return;
        }
      }
      const rawBalance = await publicClient.readContract({
        address: BASE_SEPOLIA_USDC,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [activeWalletAddress as `0x${string}`],
      });
      const formatted = Number(formatUnits(rawBalance, 6)).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      setBalance(formatted);
    } catch {
      setBalance("0.00");
    }
  };

  const fetchNotifications = () => {
    if (!dynamicUsername || pathname === "/" || pathname === "/login") return;
    fetch("/api/notifications", {
      headers: {
        "x-dev-user": dynamicUsername,
        "x-dev-wallet": activeWalletAddress,
      },
    })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setNotifications(data);
        }
      })
      .catch((err) => console.error("Error loading notifications:", err));
  };

  useEffect(() => {
    if (pathname === "/" || pathname === "/login") return;
    fetchBalance();
    fetchNotifications();
    const interval = setInterval(() => {
      fetchBalance();
      fetchNotifications();
    }, 15000);

    const handleBalanceEvent = () => fetchBalance();
    window.addEventListener("chitchain_balance_updated", handleBalanceEvent);

    return () => {
      clearInterval(interval);
      window.removeEventListener("chitchain_balance_updated", handleBalanceEvent);
    };
  }, [activeWalletAddress, dynamicUsername, pathname]);

  const handleRespond = async (inviteId: string, accept: boolean, notifId: string) => {
    if (!dynamicUsername) return;
    setRespondingId(inviteId);
    try {
      const res = await fetch(`/api/invites/${inviteId}/respond`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-dev-user": dynamicUsername,
        },
        body: JSON.stringify({ accept }),
      });
      if (res.ok) {
        await fetch(`/api/notifications/${notifId}/read`, {
          method: "POST",
          headers: { "x-dev-user": dynamicUsername },
        });
        fetchNotifications();
        fetchBalance();
      }
    } catch (err) {
      console.error("Error responding to invite:", err);
    } finally {
      setRespondingId(null);
    }
  };

  const handleLogout = async () => {
    try {
      if (logout) {
        await logout();
      }
    } catch (err) {
      console.warn("Logout error:", err);
    }
    setUser(null);
    router.push("/login");
  };

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  if (pathname === "/" || pathname === "/login") {
    return null;
  }

  const isUserAuthenticated = authenticated || Boolean(user?.username) || Boolean(activeWalletAddress);

  return (
    <header className="sticky top-0 z-50 w-full bg-black/90 backdrop-blur-md">
      <div className="w-full flex h-16 items-center justify-between px-6 sm:px-8">
        
        {/* Extreme Left: CHITCHAIN Logo (Lands on Dashboard) */}
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="font-mono text-base sm:text-lg font-bold tracking-[0.25em] text-white uppercase hover:text-neutral-300 transition-colors">
            CHITCHAIN
          </span>
        </Link>

        {/* Extreme Right: Order: 1. Notification -> 2. User Profile -> 3. Balance -> 4. Logout */}
        <div className="flex items-center gap-5 sm:gap-6 min-h-[2.5rem]">
          {!mounted ? (
            <div className="h-6 w-32" />
          ) : isUserAuthenticated ? (
            <>
              {/* 1. Notification Icon */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className="p-1 text-neutral-400 hover:text-white transition-colors relative flex items-center justify-center cursor-pointer"
                  title="Notifications"
                >
                  <Bell className="h-4.5 w-4.5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-red-500" />
                  )}
                </button>

                {notificationsOpen && (
                  <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-neutral-950 p-4 shadow-2xl border border-neutral-800 z-50 text-neutral-100">
                    <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5 mb-3">
                      <span className="font-semibold text-xs text-white">Notifications</span>
                      <button
                        onClick={() => setNotificationsOpen(false)}
                        className="text-[11px] text-neutral-500 hover:text-white"
                      >
                        Close
                      </button>
                    </div>

                    <div className="space-y-2.5 max-h-72 overflow-y-auto text-xs">
                      {notifications.length === 0 ? (
                        <p className="text-center py-6 text-neutral-500 text-xs">No notifications</p>
                      ) : (
                        notifications.map((notif) => (
                          <div
                            key={notif.id}
                            className={`p-3 rounded-xl border ${
                              notif.type === "JOIN_REQUEST" && notif.inviteId && !notif.readAt
                                ? "bg-neutral-900 border-neutral-700"
                                : "bg-neutral-950 border-neutral-800"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">
                                {notif.type.replace("_", " ")}
                              </span>
                              <span className="text-[10px] text-neutral-500 font-mono">
                                {new Date(notif.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                            <p className="text-neutral-300 text-xs leading-relaxed">
                              {notif.body}
                            </p>

                            {notif.type === "JOIN_REQUEST" && notif.inviteId && !notif.readAt && (
                              <div className="mt-2.5 flex items-center gap-2 pt-2 border-t border-neutral-800">
                                <button
                                  disabled={respondingId === notif.inviteId}
                                  onClick={() => handleRespond(notif.inviteId!, true, notif.id)}
                                  className="flex-1 py-1 rounded-lg bg-white text-black font-semibold text-xs flex items-center justify-center gap-1 hover:bg-neutral-200 transition-colors cursor-pointer"
                                >
                                  <Check className="h-3 w-3" />
                                  Accept
                                </button>
                                <button
                                  disabled={respondingId === notif.inviteId}
                                  onClick={() => handleRespond(notif.inviteId!, false, notif.id)}
                                  className="px-3 py-1 rounded-lg border border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors text-xs flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <X className="h-3 w-3" />
                                  Decline
                                </button>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 2. User Profile Icon (Lands on Profile Page) */}
              <Link
                href="/profile"
                className="flex items-center gap-2 text-sm font-semibold text-neutral-200 hover:text-white transition-colors font-mono"
                title="Profile"
              >
                <User className="h-4 w-4 text-neutral-400 hover:text-white transition-colors" />
                <span>@{dynamicUsername}</span>
              </Link>

              {/* 3. Account Balance */}
              <div className="flex items-center gap-1.5 text-sm font-mono text-neutral-200">
                <span className="text-white font-bold">{balance === null ? "..." : balance}</span>
                <span className="text-neutral-400 text-xs font-normal">USDC</span>
              </div>

              {/* 4. Exit / Logout Icon */}
              <button
                type="button"
                onClick={handleLogout}
                className="p-1 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="h-4.5 w-4.5" />
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="px-4 py-1.5 rounded-lg bg-white text-black font-semibold text-sm hover:bg-neutral-200 transition-colors"
            >
              Sign In
            </Link>
          )}
        </div>

      </div>
    </header>
  );
}
