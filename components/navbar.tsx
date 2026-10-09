"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useDevUser } from "@/components/providers";
import { Bell, Coins, UserCheck, Check, X, ChevronDown } from "lucide-react";

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
    <header className="w-full px-8 sm:px-10 py-5">
      <div className="w-full flex items-center justify-between">
        {/* Brand Logo - No border, no background */}
        <Link
          href="/"
          className="flex items-center gap-2.5 text-white hover:text-emerald-400 transition-colors"
        >
          <Coins className="h-6 w-6 text-emerald-400" />
          <span className="font-bold text-lg tracking-tight">ChitChain</span>
        </Link>

        {/* Right Controls - Clean icons, no borders, no backgrounds */}
        <div className="flex items-center gap-5">
          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative p-1.5 text-neutral-400 hover:text-white transition-colors"
              title="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.9)]" />
              )}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 mt-3 w-96 sm:w-[420px] rounded-2xl glass-panel p-6 shadow-2xl z-50 border border-white/10 space-y-4 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-2.5">
                    <span className="font-semibold text-sm text-white">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-medium border border-emerald-500/30">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setNotificationsOpen(false)}
                    className="text-xs text-neutral-400 hover:text-white transition-colors"
                  >
                    Close
                  </button>
                </div>

                <div className="space-y-3 max-h-80 overflow-y-auto pr-1 text-xs">
                  {notifications.length === 0 ? (
                    <p className="text-center py-6 text-neutral-500">No notifications.</p>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={`p-3 rounded-xl border transition-all ${
                          notif.type === "JOIN_REQUEST" && notif.inviteId && !notif.readAt
                            ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-200"
                            : "bg-white/[0.02] border-white/5 text-neutral-300"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] uppercase font-semibold text-neutral-400">
                            {notif.type.replace("_", " ")}
                          </span>
                          <span className="text-[10px] text-neutral-500">
                            {new Date(notif.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <p className="text-neutral-200 leading-relaxed text-xs">
                          {notif.body}
                        </p>

                        {/* Join Actions */}
                        {notif.type === "JOIN_REQUEST" && notif.inviteId && !notif.readAt && (
                          <div className="mt-3 flex items-center gap-2 pt-2.5 border-t border-white/10">
                            <button
                              disabled={respondingId === notif.inviteId}
                              onClick={() => handleRespond(notif.inviteId!, true, notif.id)}
                              className="flex-1 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                            >
                              <Check className="h-3.5 w-3.5" />
                              Accept
                            </button>
                            <button
                              disabled={respondingId === notif.inviteId}
                              onClick={() => handleRespond(notif.inviteId!, false, notif.id)}
                              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
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

          {/* User Icon & Selector - No border, no background */}
          <div className="relative flex items-center gap-1.5 text-neutral-400 hover:text-white transition-colors cursor-pointer group">
            <UserCheck className="h-5 w-5 text-emerald-400 group-hover:text-emerald-300" />
            <select
              value={user?.username || ""}
              onChange={(e) => {
                const found = users.find((u) => u.username === e.target.value);
                if (found) setUser(found);
              }}
              className="bg-transparent text-xs font-medium text-neutral-300 group-hover:text-white focus:outline-none cursor-pointer pr-1 appearance-none"
            >
              {users.map((u) => (
                <option key={u.username} value={u.username} className="bg-neutral-950 text-neutral-200">
                  {u.displayName} (@{u.username})
                </option>
              ))}
            </select>
            <ChevronDown className="h-3 w-3 text-neutral-500 group-hover:text-neutral-300 pointer-events-none" />
          </div>
        </div>
      </div>
    </header>
  );
}
