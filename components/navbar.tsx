"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDevUser } from "@/components/providers";
import { Bell, Shield, PlusCircle, UserCheck, Wallet, Check, X, Sparkles, ChevronDown } from "lucide-react";

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
  const { user, setUser, users } = useDevUser();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const fetchNotifications = () => {
    if (!user) return;
    fetch("/api/notifications", {
      headers: { "x-dev-user": user.username },
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
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5000);
    return () => clearInterval(interval);
  }, [user]);

  const handleRespond = async (inviteId: string, accept: boolean, notifId: string) => {
    if (!user) return;
    setRespondingId(inviteId);
    try {
      const res = await fetch(`/api/invites/${inviteId}/respond`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-dev-user": user.username,
        },
        body: JSON.stringify({ accept }),
      });
      if (res.ok) {
        await fetch(`/api/notifications/${notifId}/read`, {
          method: "POST",
          headers: { "x-dev-user": user.username },
        });
        fetchNotifications();
      }
    } catch (err) {
      console.error("Error responding to invite:", err);
    } finally {
      setRespondingId(null);
    }
  };

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-neutral-800/80 bg-black/85 backdrop-blur-xl">
      <div className="container mx-auto flex h-20 items-center justify-between px-6 max-w-7xl">
        {/* Brand */}
        <div className="flex items-center gap-10">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-red-600 via-rose-600 to-amber-600 flex items-center justify-center shadow-lg shadow-red-900/30 group-hover:scale-105 transition-transform duration-300">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-xl tracking-tight text-white group-hover:text-red-400 transition-colors">
                ChitChain
              </span>
              <span className="text-[10px] tracking-widest uppercase text-neutral-400 font-semibold font-mono">
                Private Wealth Circle
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-xs uppercase tracking-widest font-semibold text-neutral-400">
            <Link
              href="/"
              className={`hover:text-white transition-colors ${
                pathname === "/" ? "text-white" : ""
              }`}
            >
              Overview
            </Link>
            <Link
              href="/circles"
              className={`hover:text-white transition-colors ${
                pathname.startsWith("/circles") && pathname !== "/circles/new"
                  ? "text-white"
                  : ""
              }`}
            >
              My Circles
            </Link>
            <Link
              href="/circles/new"
              className={`flex items-center gap-1.5 hover:text-red-400 transition-colors ${
                pathname === "/circles/new" ? "text-red-400 font-bold" : ""
              }`}
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span>Create Circle</span>
            </Link>
          </nav>
        </div>

        {/* Right Action & User Controls */}
        <div className="flex items-center gap-4">
          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative p-2.5 text-neutral-400 hover:text-white hover:bg-neutral-900 rounded-xl border border-neutral-800 transition-all"
              title="Notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-black animate-pulse" />
              )}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 mt-3 w-96 rounded-2xl bg-neutral-950 p-5 shadow-2xl border border-neutral-800 z-50 text-neutral-100">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-white">Notifications</h4>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-red-950 border border-red-800/60 text-red-300 text-[10px] font-bold">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setNotificationsOpen(false)}
                    className="text-xs text-neutral-500 hover:text-white"
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
                        className={`p-3.5 rounded-xl border transition-all ${
                          notif.type === "JOIN_REQUEST" && notif.inviteId && !notif.readAt
                            ? "bg-red-950/30 border-red-800/40"
                            : "bg-neutral-900/80 border-neutral-800"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-bold text-[10px] uppercase tracking-wider text-red-400">
                            {notif.type.replace("_", " ")}
                          </span>
                          <span className="text-[10px] text-neutral-500 font-mono">
                            {new Date(notif.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <p className="text-neutral-200 leading-relaxed text-xs">
                          {notif.body}
                        </p>

                        {/* Join Request Actions */}
                        {notif.type === "JOIN_REQUEST" && notif.inviteId && !notif.readAt && (
                          <div className="mt-3 flex items-center gap-2 pt-2 border-t border-neutral-800">
                            <button
                              disabled={respondingId === notif.inviteId}
                              onClick={() => handleRespond(notif.inviteId!, true, notif.id)}
                              className="flex-1 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-lg shadow-red-900/30 transition-all"
                            >
                              <Check className="h-3.5 w-3.5" />
                              Accept
                            </button>
                            <button
                              disabled={respondingId === notif.inviteId}
                              onClick={() => handleRespond(notif.inviteId!, false, notif.id)}
                              className="px-3 py-1.5 rounded-lg border border-neutral-700 hover:bg-neutral-800 text-neutral-300 font-bold text-xs flex items-center justify-center gap-1 transition-all"
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

          {/* Dev User Switcher */}
          <div className="flex items-center gap-2 bg-neutral-900/90 rounded-xl px-3.5 py-2 border border-neutral-800 text-xs">
            <UserCheck className="h-4 w-4 text-red-400" />
            <span className="text-neutral-400 font-medium hidden sm:inline">Member:</span>
            <select
              value={user?.username || ""}
              onChange={(e) => {
                const found = users.find((u) => u.username === e.target.value);
                if (found) setUser(found);
              }}
              className="bg-transparent font-bold text-white focus:outline-none cursor-pointer text-xs"
            >
              {users.map((u) => (
                <option key={u.username} value={u.username} className="bg-neutral-950 text-white">
                  {u.displayName} (@{u.username})
                </option>
              ))}
            </select>
          </div>

          {/* Wallet Address badge */}
          {user && (
            <Link
              href="/account/wallet"
              className="hidden lg:flex items-center gap-2 bg-gradient-to-r from-red-950/50 to-neutral-900 text-red-300 px-3.5 py-2 rounded-xl text-xs font-mono border border-red-800/40 hover:border-red-600/60 transition-all shadow-sm"
            >
              <Wallet className="h-3.5 w-3.5 text-red-400" />
              <span>
                {user.walletAddress.slice(0, 6)}...{user.walletAddress.slice(-4)}
              </span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
