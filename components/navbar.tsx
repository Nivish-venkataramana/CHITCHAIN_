"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useDevUser } from "@/components/providers";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { createPublicClient, http, formatUnits, erc20Abi } from "viem";
import { baseSepolia } from "viem/chains";
import { Bell, Shield, Check, X, Coins, LogOut, PlusCircle, User } from "lucide-react";

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

  // Dynamic Identity extraction
  const embeddedWallet = wallets.find((w) => w.walletClientType === "privy") || wallets[0];
  const activeWalletAddress = (
    embeddedWallet?.address ||
    privyUser?.wallet?.address ||
    user?.walletAddress ||
    ""
  ).toLowerCase();

  const userEmail = privyUser?.email?.address || "";
  const dynamicUsername = userEmail
    ? userEmail.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "").toLowerCase()
    : user?.username || (activeWalletAddress ? `user_${activeWalletAddress.slice(2, 6).toLowerCase()}` : "asharao01");

  const dynamicDisplayName = userEmail
    ? userEmail.split("@")[0]
    : user?.displayName || dynamicUsername;

  const [balance, setBalance] = useState<string | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const fetchBalance = async () => {
    if (!activeWalletAddress || !/^0x[a-f0-9]{40}$/i.test(activeWalletAddress)) {
      if (dynamicUsername) {
        try {
          const res = await fetch("/api/account/faucet", { headers: { "x-dev-user": dynamicUsername } });
          const data = await res.json();
          if (data?.balanceUSDC !== undefined) {
            setBalance(Number(data.balanceUSDC).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
            return;
          }
        } catch {}
      }
      setBalance("0.00");
      return;
    }
    try {
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
      // Fallback
      if (dynamicUsername) {
        fetch("/api/account/faucet", { headers: { "x-dev-user": dynamicUsername } })
          .then((r) => r.json())
          .then((data) => {
            if (data?.balanceUSDC !== undefined) {
              setBalance(Number(data.balanceUSDC).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
            } else {
              setBalance("0.00");
            }
          })
          .catch(() => setBalance("0.00"));
      } else {
        setBalance("0.00");
      }
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

    const handleBalanceUpdate = () => {
      fetchBalance();
    };
    window.addEventListener("balance_updated", handleBalanceUpdate);

    const interval = setInterval(() => {
      fetchBalance();
      fetchNotifications();
    }, 15000);
    return () => {
      clearInterval(interval);
      window.removeEventListener("balance_updated", handleBalanceUpdate);
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
      console.warn("Privy logout error:", err);
    }
    setUser(null);
    router.push("/login");
  };

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  if (pathname === "/" || pathname === "/login") {
    return null;
  }

  const isUserAuthenticated = authenticated || Boolean(user) || Boolean(activeWalletAddress);

  return (
    <header className="sticky top-0 z-50 w-full bg-black/85 backdrop-blur-xl border-b border-neutral-900/80">
      <div className="container mx-auto flex h-20 items-center justify-between px-6 max-w-7xl">
        
        {/* Left: Luxury ChitChain Logo */}
        <Link href="/home" className="flex items-center gap-3 group">
          <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform duration-300">
            <span className="font-extrabold text-black text-base">₹</span>
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-lg tracking-[0.25em] text-white uppercase group-hover:text-amber-400 transition-colors">
              CHITCHAIN
            </span>
            <span className="text-[8px] tracking-[0.35em] uppercase text-neutral-500 font-mono font-semibold">
              BHARAT PROTOCOL
            </span>
          </div>
        </Link>

        {/* Right: Clean Luxury Action Controls */}
        <div className="flex items-center gap-3">
          
          {/* Start Chit Circle Action Button */}
          <Link
            href="/circles/new"
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs uppercase tracking-wider border border-neutral-800 transition-all shadow-md hover:border-amber-500/40"
          >
            <PlusCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>Start Chit Circle</span>
          </Link>

          {isUserAuthenticated ? (
            <>
              {/* Live Wallet Balance Pill */}
              <Link
                href="/account/wallet"
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-800 text-xs transition-all shadow-md group hover:border-amber-500/30"
                title="View Smart Vault Wallet"
              >
                <Coins className="h-3.5 w-3.5 text-amber-400 group-hover:rotate-12 transition-transform" />
                <span className="font-mono font-bold text-white text-xs">
                  {balance === null ? "..." : balance} <span className="text-[10px] text-amber-400/80 font-normal">USDC</span>
                </span>
              </Link>

              {/* Dynamic User Profile Pill */}
              <Link
                href="/account/wallet"
                className="flex items-center gap-2 bg-neutral-900/90 hover:bg-neutral-800 rounded-full px-3.5 py-1.5 border border-neutral-800 text-xs transition-all group hover:border-amber-500/30"
                title="Manage Profile & Wallet"
              >
                <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-[10px] font-bold text-black group-hover:scale-105 transition-transform">
                  {dynamicDisplayName.slice(0, 1).toUpperCase()}
                </div>
                <span className="font-bold text-white text-xs max-w-[120px] truncate">@{dynamicUsername}</span>
              </Link>

              {/* Notifications Center */}
              <div className="relative">
                <button
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className="p-2.5 text-neutral-400 hover:text-white hover:bg-neutral-900 rounded-full border border-neutral-800 transition-all cursor-pointer"
                  title="Notifications"
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-black animate-pulse" />
                  )}
                </button>

                {notificationsOpen && (
                  <div className="absolute right-0 mt-3 w-96 rounded-3xl bg-neutral-950 p-5 shadow-2xl border border-neutral-800 z-50 text-neutral-100">
                    <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-3">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-white">Notifications</h4>
                        {unreadCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-950 border border-amber-800 text-amber-300 text-[10px] font-bold">
                            {unreadCount} new
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => setNotificationsOpen(false)}
                        className="text-xs text-neutral-500 hover:text-white cursor-pointer"
                      >
                        Close
                      </button>
                    </div>

                    <div className="space-y-3 max-h-80 overflow-y-auto text-xs">
                      {notifications.length === 0 ? (
                        <p className="text-center py-8 text-neutral-500">No active notifications</p>
                      ) : (
                        notifications.map((notif) => (
                          <div
                            key={notif.id}
                            className={`p-3.5 rounded-2xl border transition-all ${
                              notif.type === "JOIN_REQUEST" && notif.inviteId && !notif.readAt
                                ? "bg-amber-950/30 border-amber-800/40"
                                : "bg-neutral-900/80 border-neutral-800"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="font-bold text-[10px] uppercase tracking-wider text-amber-400">
                                {notif.type.replace("_", " ")}
                              </span>
                              <span className="text-[10px] text-neutral-500 font-mono">
                                {new Date(notif.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                            <p className="text-neutral-200 leading-relaxed text-xs font-medium">
                              {notif.body}
                            </p>

                            {notif.type === "JOIN_REQUEST" && notif.inviteId && !notif.readAt && (
                              <div className="mt-3 flex items-center gap-2 pt-2 border-t border-neutral-800">
                                <button
                                  disabled={respondingId === notif.inviteId}
                                  onClick={() => handleRespond(notif.inviteId!, true, notif.id)}
                                  className="flex-1 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center justify-center gap-1 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                  Accept
                                </button>
                                <button
                                  disabled={respondingId === notif.inviteId}
                                  onClick={() => handleRespond(notif.inviteId!, false, notif.id)}
                                  className="px-3 py-1.5 rounded-xl border border-neutral-700 hover:bg-neutral-800 text-neutral-300 font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer"
                                >
                                  <X className="h-3.5 w-3.5" />
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

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="p-2.5 text-neutral-400 hover:text-red-400 hover:bg-neutral-900 rounded-full border border-neutral-800 transition-all cursor-pointer"
                title="Disconnect & Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-amber-500/20"
            >
              <Shield className="h-3.5 w-3.5" />
              <span>Login</span>
            </Link>
          )}

        </div>

      </div>
    </header>
  );
}
