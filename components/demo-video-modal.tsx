"use client";

import React, { useState, useEffect } from "react";
import { X, ShieldCheck, Sparkles, Layers, Lock, Coins, ArrowRight } from "lucide-react";

export function DemoVideoModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem("chitchain_demo_video_dismissed");
    if (!dismissed) {
      const timer = setTimeout(() => setIsOpen(true), 600);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem("chitchain_demo_video_dismissed", "true");
    }
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-3xl bg-neutral-900 shadow-2xl overflow-hidden border border-neutral-800 text-neutral-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-800 bg-neutral-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Welcome to ChitChain</h3>
              <p className="text-xs text-neutral-400">Decentralized Autonomous Chit Fund Protocol</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Professional Feature Architecture Cards */}
        <div className="p-6 space-y-4 bg-neutral-900">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="p-4 rounded-2xl bg-neutral-950/80 border border-neutral-800 space-y-2">
              <div className="flex items-center gap-2 text-blue-400 text-xs font-bold uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4" />
                <span>Smart Account Security</span>
              </div>
              <p className="text-xs text-neutral-300 leading-relaxed">
                Self custodial smart account wallets powered by ERC4337 with gasless transactions and scoped permissions.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-950/80 border border-neutral-800 space-y-2">
              <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
                <Layers className="w-4 h-4" />
                <span>Circle Governance</span>
              </div>
              <p className="text-xs text-neutral-300 leading-relaxed">
                Automated member verification, balance checks, issue dispute resolution, and mutual agreement prior to start.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-950/80 border border-neutral-800 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                <Coins className="w-4 h-4" />
                <span>Automated Pooling</span>
              </div>
              <p className="text-xs text-neutral-300 leading-relaxed">
                Preapproved monthly transfers direct to the vault with transparent ledger tracking on Base Sepolia.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-950/80 border border-neutral-800 space-y-2">
              <div className="flex items-center gap-2 text-purple-400 text-xs font-bold uppercase tracking-wider">
                <Lock className="w-4 h-4" />
                <span>Secret Sealed Auctions</span>
              </div>
              <p className="text-xs text-neutral-300 leading-relaxed">
                Cryptographic commit and reveal scheme ensures complete bid privacy, fair lowest bid selection, and dividend distribution.
              </p>
            </div>
          </div>
        </div>

        {/* Footer controls */}
        <div className="flex items-center justify-between px-6 py-4 bg-neutral-950 border-t border-neutral-800">
          <label className="flex items-center gap-2 text-xs text-neutral-400 cursor-pointer">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="rounded border-neutral-700 bg-neutral-900 text-blue-600 focus:ring-blue-500 h-4 w-4"
            />
            <span>Do not show this again</span>
          </label>

          <button
            onClick={handleClose}
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-lg shadow-blue-600/20 transition-all flex items-center gap-1.5"
          >
            <span>Enter App</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
