"use client";

import React, { useState, useEffect } from "react";
import { X, Play, Film } from "lucide-react";

export function DemoVideoModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem("chitchain_demo_video_dismissed");
    if (!dismissed) {
      const timer = setTimeout(() => setIsOpen(true), 800);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl glass-panel overflow-hidden border border-white/10 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-neutral-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Film className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">ChitChain Overview</h3>
              <p className="text-xs text-neutral-400">Decentralized chit fund walkthrough</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Video Player */}
        <div className="relative aspect-video bg-black flex flex-col items-center justify-center text-white p-6 text-center border-b border-white/5">
          <video
            controls
            className="absolute inset-0 w-full h-full object-cover hidden"
            src="/demo/wallet-demo.mp4"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />

          <div className="space-y-4 max-w-md z-10">
            <div className="h-14 w-14 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Play className="h-6 w-6 ml-0.5 text-white" />
            </div>
            <div>
              <h4 className="font-semibold text-base text-white">Interactive Walkthrough</h4>
              <p className="text-xs text-neutral-400 mt-1">
                Embedded smart wallets, test faucets, autopay mandates, and commit-reveal bidding on Base Sepolia.
              </p>
            </div>
          </div>
        </div>

        {/* Footer controls */}
        <div className="flex items-center justify-between px-6 py-4 bg-neutral-900/40">
          <label className="flex items-center gap-2 text-xs text-neutral-400 cursor-pointer">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="rounded border-neutral-700 bg-neutral-800 text-emerald-500 focus:ring-emerald-500 h-3.5 w-3.5"
            />
            <span>Do not show again</span>
          </label>

          <button
            onClick={handleClose}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow transition-all"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
