"use client";

import React, { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { Mail, Sparkles, X, Wallet } from "lucide-react";

export function AuthModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const { login, ready, authenticated } = usePrivy();

  if (!ready) {
    return (
      <button
        disabled
        className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-white/5 border border-white/10 text-neutral-500 font-semibold text-xs tracking-wider uppercase cursor-not-allowed"
      >
        Loading...
      </button>
    );
  }

  if (authenticated) return null;

  const handleEmailLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    login({ prefill: { type: "email", value: email } });
    setIsOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs tracking-wider uppercase shadow-[0_0_25px_rgba(16,185,129,0.35)] transition-all flex items-center justify-center gap-2 cursor-pointer"
      >
        <Sparkles className="h-4 w-4" />
        <span>Get Started / Connect Wallet</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl glass-panel-glow p-8 space-y-6 shadow-2xl border border-emerald-500/20 animate-in zoom-in-95 duration-200">
            {/* Close Button */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-6 right-6 p-1 text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Header */}
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-white tracking-tight">Create an account</h2>
              <p className="text-xs text-neutral-400">
                Enter your email below to create your account or sign in.
              </p>
            </div>

            {/* Email Form */}
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div className="line-input-group">
                <input
                  id="email"
                  type="email"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect="off"
                  placeholder=" "
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="line-input"
                />
                <label htmlFor="email" className="line-label">
                  Email address
                </label>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs tracking-wider uppercase shadow-[0_0_20px_rgba(16,185,129,0.25)] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Mail className="h-4 w-4" />
                <span>Sign In with Email</span>
              </button>
            </form>

            {/* Separator */}
            <div className="relative flex items-center justify-center py-2">
              <div className="border-t border-white/10 w-full" />
              <span className="bg-black px-3 text-[10px] uppercase text-neutral-500 tracking-widest absolute">
                Or continue with
              </span>
            </div>

            {/* Social / External Providers */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  login();
                  setIsOpen(false);
                }}
                disabled={!ready}
                className="py-3 px-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-neutral-300 font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Google</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  login();
                  setIsOpen(false);
                }}
                disabled={!ready}
                className="py-3 px-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-neutral-300 font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Apple</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                login();
                setIsOpen(false);
              }}
              disabled={!ready}
              className="w-full py-3 px-4 rounded-xl bg-white/[0.02] hover:bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Wallet className="h-4 w-4" />
              <span>Connect External Web3 Wallet</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
