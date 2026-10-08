"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDevUser } from "@/components/providers";
import { Bell, Coins, PlusCircle, ShieldCheck, UserCheck, Wallet } from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const { user, setUser, users } = useDevUser();
  const [notificationsOpen, setNotificationsOpen] = useState(false);

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
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-blue-600 ring-2 ring-white" />
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 rounded-xl bg-white p-4 shadow-xl ring-1 ring-black/5 z-50">
                <div className="flex items-center justify-between border-b pb-2 mb-2">
                  <h4 className="font-semibold text-sm text-gray-800">In-App Notifications</h4>
                  <span className="text-xs text-blue-600 cursor-pointer">Mark all read</span>
                </div>
                <div className="space-y-2 text-xs text-gray-600">
                  <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-100">
                    <p className="font-medium text-blue-900">Join Request</p>
                    <p className="mt-0.5">
                      You were added to <strong>Alpha Friends Chit</strong> by <strong>Asha Rao</strong>. Verify whether you want to join.
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-gray-50">
                    <p className="font-medium text-gray-800">Circle Update</p>
                    <p className="text-gray-500 mt-0.5">All members agreed on terms. Circle is ready for autopay.</p>
                  </div>
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
