"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDevUser } from "@/components/providers";
import { Bell, Coins, PlusCircle, UserCheck, Wallet, Check, X } from "lucide-react";

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
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur shadow-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-blue-600">
            <Coins className="h-6 w-6 text-blue-600" />
            <span>ChitChain</span>
          </Link>

          <nav className="hidden md:flex items-center gap-4 text-sm font-medium text-gray-600">
            <Link
              href="/"
              className={`hover:text-blue-600 transition-colors ${
                pathname === "/" ? "text-blue-600 font-semibold" : ""
              }`}
            >
              Home
            </Link>
            <Link
              href="/circles"
              className={`hover:text-blue-600 transition-colors ${
                pathname.startsWith("/circles") && pathname !== "/circles/new"
                  ? "text-blue-600 font-semibold"
                  : ""
              }`}
            >
              My Circles
            </Link>
            <Link
              href="/circles/new"
              className={`flex items-center gap-1 hover:text-blue-600 transition-colors ${
                pathname === "/circles/new" ? "text-blue-600 font-semibold" : ""
              }`}
            >
              <PlusCircle className="h-4 w-4" />
              Create Circle
            </Link>
          </nav>
        </div>

        {/* Right Action & User Controls */}
        <div className="flex items-center gap-3">
          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative p-2 text-gray-600 hover:text-blue-600 hover:bg-gray-100 rounded-full transition-colors"
              title="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-blue-600 ring-2 ring-white animate-pulse" />
              )}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-96 rounded-2xl bg-white p-4 shadow-xl ring-1 ring-black/5 z-50">
                <div className="flex items-center justify-between border-b pb-2 mb-3">
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-bold text-sm text-gray-800">In-App Notifications</h4>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setNotificationsOpen(false)}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    Close
                  </button>
                </div>

                <div className="space-y-2.5 max-h-80 overflow-y-auto text-xs">
                  {notifications.length === 0 ? (
                    <p className="text-center py-6 text-gray-400">No notifications right now.</p>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={`p-3 rounded-xl border transition-all ${
                          notif.type === "JOIN_REQUEST" && notif.inviteId && !notif.readAt
                            ? "bg-blue-50/70 border-blue-200"
                            : notif.type === "ISSUE_RAISED"
                            ? "bg-amber-50/70 border-amber-200"
                            : "bg-slate-50 border-slate-200"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-[11px] uppercase tracking-wider text-blue-900">
                            {notif.type.replace("_", " ")}
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono">
                            {new Date(notif.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <p className="text-gray-800 leading-relaxed font-medium">
                          {notif.body}
                        </p>

                        {/* Join Request Actions */}
                        {notif.type === "JOIN_REQUEST" && notif.inviteId && !notif.readAt && (
                          <div className="mt-3 flex items-center gap-2 pt-2 border-t border-blue-200/60">
                            <button
                              disabled={respondingId === notif.inviteId}
                              onClick={() => handleRespond(notif.inviteId!, true, notif.id)}
                              className="flex-1 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-sm transition-colors"
                            >
                              <Check className="h-3.5 w-3.5" />
                              Accept &amp; Join
                            </button>
                            <button
                              disabled={respondingId === notif.inviteId}
                              onClick={() => handleRespond(notif.inviteId!, false, notif.id)}
                              className="px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-white text-gray-700 font-bold text-xs flex items-center justify-center gap-1 transition-colors"
                            >
                              <X className="h-3.5 w-3.5" />
                              Reject
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
          <div className="flex items-center gap-2 bg-gray-100 rounded-full px-3 py-1.5 border border-gray-200 text-xs">
            <UserCheck className="h-4 w-4 text-emerald-600" />
            <span className="text-gray-500 font-medium">Dev User:</span>
            <select
              value={user?.username || ""}
              onChange={(e) => {
                const found = users.find((u) => u.username === e.target.value);
                if (found) setUser(found);
              }}
              className="bg-transparent font-semibold text-gray-800 focus:outline-none cursor-pointer"
            >
              {users.map((u) => (
                <option key={u.username} value={u.username}>
                  {u.displayName} (@{u.username})
                </option>
              ))}
            </select>
          </div>

          {/* Wallet Address badge */}
          {user && (
            <Link
              href="/account/wallet"
              className="hidden lg:flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-xs font-mono border border-blue-100 hover:bg-blue-100 transition-colors"
            >
              <Wallet className="h-3.5 w-3.5" />
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
