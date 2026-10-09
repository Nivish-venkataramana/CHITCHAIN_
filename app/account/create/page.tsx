"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
import { validateUsername } from "@/lib/username-rule";

export default function CreateAccountProfilePage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const validation = validateUsername(displayName, username);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validation.valid) {
      setError(validation.error || "Invalid username format");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
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

      setSuccess(`Account @${data.username} created successfully`);
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
    <div className="max-w-md mx-auto py-8 space-y-6">
      <Link
        href="/account/wallet"
        className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Wallet
      </Link>

      <div className="glass-panel p-8 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Create Profile</h1>
          <p className="text-xs text-neutral-400 mt-1">
            Register a username containing your name, bound to your smart account.
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 text-xs">
          <div className="space-y-2">
            <label className="font-semibold text-neutral-300">Full Name</label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Asha Rao"
              className="w-full rounded-xl bg-neutral-900/80 border border-white/10 px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-neutral-300">Username</label>
              <span className="text-[10px] text-neutral-500">Must include full name</span>
            </div>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder="e.g. asharao01"
              className="w-full rounded-xl bg-neutral-900/80 border border-white/10 px-3.5 py-2.5 text-xs font-mono text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
            />
          </div>

          {displayName.length > 0 && (
            <div
              className={`p-3.5 rounded-xl border text-[11px] ${
                validation.valid
                  ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-300"
                  : "bg-amber-950/30 border-amber-500/30 text-amber-300"
              }`}
            >
              {validation.valid ? (
                <div className="flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Valid username pattern</span>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span>{validation.error}</span>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={!validation.valid || submitting}
            className={`w-full py-3 rounded-xl font-semibold transition-all ${
              validation.valid && !submitting
                ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30 cursor-pointer"
                : "bg-neutral-800 text-neutral-500 cursor-not-allowed"
            }`}
          >
            {submitting ? "Creating Profile..." : "Create Profile"}
          </button>
        </form>
      </div>
    </div>
  );
}
