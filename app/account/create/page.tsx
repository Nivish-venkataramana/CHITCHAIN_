"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDevUser } from "@/components/providers";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { ArrowLeft, CheckCircle2, AlertCircle, Wallet, Sparkles } from "lucide-react";

export default function CreateAccountProfilePage() {
  const router = useRouter();
  const { setUser } = useDevUser();
  const { login, authenticated, ready, user: privyUser } = usePrivy();
  const { wallets } = useWallets();

  const [username, setUsername] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Auto-populate public key if Privy wallet connects
  useEffect(() => {
    const privyWallet = wallets.find((w) => w.walletClientType === "privy") || wallets[0];
    const address = privyWallet?.address || privyUser?.wallet?.address;
    if (address) {
      setPublicKey(address);
      if (!username) {
        setUsername(`user_${address.slice(2, 6).toLowerCase()}`);
      }
    }
  }, [wallets, privyUser]);

  // Validate public key format (EVM 42-char hex address)
  const isPublicKeyValid = /^0x[a-fA-F0-9]{40}$/.test(publicKey.trim());
  const isUsernameValid = username.trim().length >= 3 && /^[a-zA-Z0-9_]+$/.test(username.trim());
  const canConnect = isPublicKeyValid && isUsernameValid;

  const handleConnectPrivy = () => {
    setError(null);
    try {
      login();
    } catch (err: any) {
      setError(err.message || "Failed to open Privy login");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canConnect) {
      setError("Please provide a valid username (min 3 chars) and a valid public key (0x... address).");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const cleanKey = publicKey.trim().toLowerCase() as `0x${string}`;
      const cleanUser = username.trim().toLowerCase();

      // Check if wallet already registered
      const checkRes = await fetch(`/api/users/by-wallet/${cleanKey}`);
      if (checkRes.ok) {
        const existingUser = await checkRes.json();
        if (existingUser?.username) {
          setUser(existingUser);
          router.push("/home");
          return;
        }
      }

      const res = await fetch("/api/account/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: cleanUser,
          walletAddress: cleanKey,
          displayName: cleanUser,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to connect account");
      }

      setUser(data);
      router.push("/home");
    } catch (err: any) {
      setError(err.message || "Failed to connect account");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto py-12 px-6 space-y-6">
      <Link
        href="/home"
        className="inline-flex items-center gap-2 text-xs font-mono text-neutral-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>

      <div className="rounded-3xl glass-panel-glow p-8 sm:p-10 space-y-8">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400 block mb-1">
            Identity & Key Setup
          </span>
          <h1 className="text-2xl font-bold text-white tracking-tight">Create & Connect Account</h1>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-red-950/30 border border-red-500/30 text-red-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* 1-Click Privy Auto-Connect */}
        <button
          type="button"
          onClick={handleConnectPrivy}
          className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs tracking-wider uppercase shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Wallet className="h-4 w-4" />
          <span>{authenticated ? "Privy Wallet Connected" : "Connect Privy Embedded Wallet"}</span>
        </button>

        <div className="relative flex items-center justify-center">
          <div className="border-t border-white/10 w-full" />
          <span className="bg-black px-3 text-[10px] uppercase text-neutral-500 tracking-widest absolute">
            or enter address manually
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Username */}
          <div className="line-input-group">
            <input
              type="text"
              id="username"
              required
              placeholder=" "
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              className="line-input font-mono"
            />
            <label htmlFor="username" className="line-label">
              Username
            </label>
          </div>

          {/* Public Key */}
          <div className="line-input-group">
            <input
              type="text"
              id="public-key"
              required
              placeholder=" "
              value={publicKey}
              onChange={(e) => setPublicKey(e.target.value)}
              className="line-input font-mono text-xs"
            />
            <label htmlFor="public-key" className="line-label">
              Public Key (0x Address)
            </label>
          </div>

          {/* Validation Indicator */}
          {publicKey.length > 0 && (
            <div className="flex items-center gap-2 text-xs -mt-4">
              {isPublicKeyValid ? (
                <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Valid public key format</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-amber-400 font-medium">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>Must be a valid 42-character 0x hex address</span>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={!canConnect || submitting}
            className={`w-full py-3.5 rounded-xl font-semibold text-xs tracking-wider uppercase transition-all ${
              canConnect && !submitting
                ? "bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_25px_rgba(16,185,129,0.35)] cursor-pointer"
                : "bg-white/5 text-neutral-600 border border-white/5 cursor-not-allowed"
            }`}
          >
            {submitting ? "Connecting..." : "Connect & Enter Dashboard"}
          </button>
        </form>
      </div>
    </div>
  );
}
