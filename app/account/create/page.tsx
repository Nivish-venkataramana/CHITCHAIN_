"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getAccessToken } from "@privy-io/react-auth";
import { useAccount } from "@/hooks/useAccount";
import { useDevUser } from "@/components/providers";
import { ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
import { validateUsername } from "@/lib/username-rule";

export default function CreateAccountProfilePage() {
  const router = useRouter();
  const { authenticated, refetchProfile, login } = useAccount();
  const { user: devUser, setUser: setDevUser } = useDevUser();

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Live validation (§7.5)
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
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (authenticated) {
        const token = await getAccessToken();
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
      } else if (devUser) {
        headers["x-dev-user"] = devUser.username;
      }

      const res = await fetch("/api/users", {
        method: "POST",
        headers,
        body: JSON.stringify({
          displayName: displayName.trim(),
          username: username.toLowerCase().trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create account profile");
      }

      // Update local state and TanStack profile cache
      if (setDevUser) {
        setDevUser(data);
      }
      await refetchProfile();

      setSuccess(`Account @${data.username} created and bound to smart account wallet!`);
      setTimeout(() => {
        router.push("/account/wallet");
      }, 1200);
    } catch (err: any) {
      setError(err.message || "Failed to create account profile");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12 px-6 space-y-8 text-neutral-100">
      <Link
        href="/account/wallet"
        className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Return to Wallet</span>
      </Link>

      <div className="rounded-3xl border border-neutral-900 bg-neutral-950 p-8 shadow-2xl space-y-6 relative overflow-hidden">
        <div className="space-y-1.5">
          <span className="text-xs uppercase tracking-widest font-bold text-red-500">
            Identity Origination
          </span>
          <h1 className="text-2xl font-bold text-white tracking-tight">Create Member Profile</h1>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Unique username containing your real name bound to your onchain smart account.
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-red-950/60 border border-red-800/50 text-red-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-800/50 text-emerald-300 text-xs flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 text-xs">
          <div className="space-y-1.5">
            <label className="font-bold text-neutral-300 uppercase tracking-wider text-[10px]">Real Full Name</label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Asha Rao"
              className="w-full rounded-2xl border border-neutral-800 bg-neutral-900 p-3.5 text-xs text-white focus:outline-none focus:border-red-500 placeholder:text-neutral-600 font-medium"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-neutral-300 uppercase tracking-wider text-[10px]">Unique Username</label>
              <span className="text-[10px] text-neutral-500">Must include real name plus suffix</span>
            </div>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder="e.g. asharao01"
              className="w-full rounded-2xl border border-neutral-800 bg-neutral-900 p-3.5 text-xs text-white focus:outline-none focus:border-red-500 font-mono placeholder:text-neutral-600"
            />
          </div>

          {displayName.length > 0 && (
            <div
              className={`p-4 rounded-2xl border text-xs ${
                validation.valid
                  ? "bg-emerald-950/40 border-emerald-800/40 text-emerald-300"
                  : "bg-amber-950/40 border-amber-800/40 text-amber-300"
              }`}
            >
              {validation.valid ? (
                <div className="flex items-center gap-2 font-bold">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>Valid username format ({displayName} included in @{username})</span>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>{validation.error}</span>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={!validation.valid || submitting}
            className={`w-full py-4 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all shadow-xl ${
              validation.valid && !submitting
                ? "bg-white hover:bg-neutral-200 text-black cursor-pointer shadow-white/5"
                : "bg-neutral-900 text-neutral-600 border border-neutral-800 cursor-not-allowed"
            }`}
          >
            {submitting ? "Binding Identity..." : "Bind Profile to Smart Account"}
          </button>
        </form>
      </div>
    </div>
  );
}
