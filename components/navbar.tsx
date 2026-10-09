"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDevUser } from "@/components/providers";
import { Bell, Shield, UserCheck, Wallet, Check, X, User } from "lucide-react";

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
    <header className="sticky top-0 z-50 w-full bg-black/80 backdrop-blur-xl border-b border-neutral-900/60">
      <div className="container mx-auto flex h-24 items-center justify-between px-6 max-w-7xl">
        
        {/* Top Left: Live Indian Rupee Ticker Pill matching Xapo Bank screenshot */}
        <div className="hidden lg:flex items-center gap-4 bg-neutral-900/90 hover:bg-neutral-900 border border-neutral-800 rounded-full px-5 py-2.5 shadow-2xl transition-all">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-white tracking-wide">
              ChitChain INR
            </span>
            <span className="text-[10px] text-emerald-400 font-mono font-semibold flex items-center gap-0.5">
              <span>↑ 5.20%</span>
              <span className="text-neutral-500 ml-1">Dividend</span>
            </span>
          </div>
          <div className="h-6 w-px bg-neutral-800" />
          <div className="text-[10px] font-mono text-neutral-400 space-y-0.5">
            <div>Monthly Pot <span className="text-white font-bold">₹1,00,000</span></div>
            <div>Yield <span className="text-white font-bold">5.2% APY</span></div>
          </div>
        </div>

        {/* Center: Luxury ChitChain Logo */}
        <div className="flex flex-col items-center justify-center">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-amber-600 via-orange-600 to-red-600 flex items-center justify-center shadow-lg shadow-orange-950/50 group-hover:scale-105 transition-transform duration-300">
              <span className="font-bold text-white text-base">₹</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="font-bold text-xl tracking-[0.25em] text-white uppercase group-hover:text-amber-400 transition-colors">
                CHITCHAIN
              </span>
              <span className="text-[9px] tracking-[0.35em] uppercase text-neutral-500 font-mono font-semibold">
                BHARAT PROTOCOL
              </span>
            </div>
          </Link>
        </div>

        {/* Top Right: Member controls matching Xapo Bank screenshot pills */}
        <div className="flex items-center gap-3">
          {/* Join Circle Pill */}
          <Link
            href="/circles/new"
            className="hidden sm:flex items-center gap-2 px-6 py-2.5 rounded-full bg-neutral-900/90 hover:bg-neutral-800 text-white font-bold text-xs uppercase tracking-wider border border-neutral-800 transition-all shadow-xl"
          >
            <span>Start Chit Circle</span>
            <User className="w-3.5 h-3.5 text-neutral-400" />
          </Link>

          {/* 3D Hubtown Starting View Button */}
          <Link
            href="/"
            onClick={() => {
              if (typeof window !== "undefined") {
                sessionStorage.removeItem("chitchain_intro_seen");
              }
            }}
            className="hidden md:flex items-center gap-1.5 px-4 py-2 rounded-full bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-500/40 text-cyan-300 font-mono text-xs transition-all"
            title="Open 3D Hubtown Starting Screen"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
            <span>3D Monolith</span>
          </Link>

          {/* Dev User Switcher Pill */}
          <div className="flex items-center gap-2 bg-neutral-900/90 rounded-full px-4 py-2 border border-neutral-800 text-xs">
            <UserCheck className="h-3.5 w-3.5 text-orange-500" />
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
                  {u.displayName}
                </option>
              ))}
            </select>
          </div>

          {/* Notifications Button */}
          <div className="relative">
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="p-2.5 text-neutral-400 hover:text-white hover:bg-neutral-900 rounded-full border border-neutral-800 transition-all"
              title="Notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-orange-500 ring-2 ring-black animate-pulse" />
              )}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 mt-3 w-96 rounded-3xl bg-neutral-950 p-5 shadow-2xl border border-neutral-800 z-50 text-neutral-100">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-white">Notifications</h4>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-orange-950 border border-orange-800 text-orange-300 text-[10px] font-bold">
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
                        className={`p-3.5 rounded-2xl border transition-all ${
                          notif.type === "JOIN_REQUEST" && notif.inviteId && !notif.readAt
                            ? "bg-orange-950/30 border-orange-800/40"
                            : "bg-neutral-900/80 border-neutral-800"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-bold text-[10px] uppercase tracking-wider text-orange-400">
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
                              className="flex-1 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-lg shadow-orange-900/30 transition-all"
                            >
                              <Check className="h-3.5 w-3.5" />
                              Accept
                            </button>
                            <button
                              disabled={respondingId === notif.inviteId}
                              onClick={() => handleRespond(notif.inviteId!, false, notif.id)}
                              className="px-3 py-1.5 rounded-xl border border-neutral-700 hover:bg-neutral-800 text-neutral-300 font-bold text-xs flex items-center justify-center gap-1 transition-all"
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

          {/* Wallet Address Link */}
          {user && (
            <Link
              href="/account/wallet"
              className="p-2.5 text-neutral-400 hover:text-white hover:bg-neutral-900 rounded-full border border-neutral-800 transition-all"
              title="Smart Account Wallet"
            >
              <Wallet className="h-4 w-4" />
            </Link>
          )}
        </div>

      </div>
    </header>
  );
}
