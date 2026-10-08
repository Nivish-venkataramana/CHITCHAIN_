"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, User, CheckCircle2, AlertCircle } from "lucide-react";
import { validateUsername } from "@/lib/username-rule";

export default function CreateAccountProfilePage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Live validation
  const validation = validateUsername(displayName, username);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validation.valid) {
      setError(validation.error || "Please check username format");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      // Deterministic mock smart account address for demo
      const randomHex = Array.from({ length: 40 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join("");
      const generatedWallet: `0x${string}` = `0x${randomHex}`;

      const res = await fetch("/api/account/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim(),
          username: username.toLowerCase().trim(),
          walletAddress: generatedWallet,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create account");
      }

      setSuccess(`Account @${data.username} created and bound to smart account wallet!`);
      setTimeout(() => {
        router.push("/account/wallet");
      }, 1200);
    } catch (err: any) {
      setError(err.message || "Failed to create account");
    } finally {
      setSubmitting(false);
    }
  };

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
            Unique username containing your real name bound to your on-chain smart account.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
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
                validation.valid
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-amber-50 border-amber-200 text-amber-800"
              }`}
            >
              {validation.valid ? (
                <div className="flex items-center gap-1.5 font-semibold">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  Valid username format (&quot;{displayName}&quot; included in &quot;@{username}&quot;)
                </div>
              ) : (
                <div className="flex items-start gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <span>{validation.error}</span>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={!validation.valid || submitting}
            className={`w-full py-2.5 rounded-xl font-bold transition-colors ${
              validation.valid && !submitting
                ? "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            }`}
          >
            {submitting ? "Creating & Binding Account..." : "Create & Bind Account to Wallet"}
          </button>
        </form>
      </div>
    </div>
  );
}
