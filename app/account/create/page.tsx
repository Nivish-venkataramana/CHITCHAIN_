"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, User, CheckCircle2, AlertCircle } from "lucide-react";

export default function CreateAccountProfilePage() {
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");

  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const normName = norm(displayName);
  const normUser = norm(username);

  // Exact rule from README section 7.5:
  // norm(username) includes norm(realName) AND norm(username).length > norm(realName).length
  const isValidUsername =
    normName.length > 0 &&
    normUser.includes(normName) &&
    normUser.length > normName.length;

  return (
    <div className="max-w-md mx-auto py-6 space-y-6">
      <Link
        href="/account/wallet"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to wallet
      </Link>

      <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Create Account Profile</h1>
          <p className="text-xs text-slate-500 mt-1">
            [Pruthvik Slice: Unique username containing real name bound to wallet public key]
          </p>
        </div>

        <form onSubmit={(e) => e.preventDefault()} className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-700">Real Full Name</label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Asha Rao"
              className="w-full rounded-xl border p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-700">Username</label>
              <span className="text-[10px] text-slate-400">Must include real name + suffix</span>
            </div>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder="e.g. asharao01"
              className="w-full rounded-xl border p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>

          {displayName.length > 0 && (
            <div
              className={`p-3 rounded-xl border text-[11px] ${
                isValidUsername
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-amber-50 border-amber-200 text-amber-800"
              }`}
            >
              {isValidUsername ? (
                <div className="flex items-center gap-1.5 font-semibold">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  Valid username format (&quot;{displayName}&quot; found in &quot;@{username}&quot;)
                </div>
              ) : (
                <div className="flex items-start gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    Rule: Username must contain your real name plus additional characters (e.g. &quot;{normName || "name"}01&quot;).
                  </span>
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            disabled={!isValidUsername}
            className={`w-full py-2.5 rounded-xl font-bold transition-colors ${
              isValidUsername
                ? "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            }`}
          >
            Bind Account to Wallet
          </button>
        </form>
      </div>
    </div>
  );
}
