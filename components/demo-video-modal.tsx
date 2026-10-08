"use client";

import React, { useState, useEffect } from "react";
import { X, Play, ShieldCheck, Sparkles, Film } from "lucide-react";

export function DemoVideoModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem("chitchain_demo_video_dismissed");
    if (!dismissed) {
      // Show on first visit after a slight delay
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-slate-50/80">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-100 text-blue-600">
              <Film className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Welcome to ChitChain</h3>
              <p className="text-xs text-slate-500">Quick prototype demo walkthrough</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Video Player / Container (Placeholder for Pruthvik's video in public/demo/) */}
        <div className="relative aspect-video bg-slate-950 flex flex-col items-center justify-center text-white p-6 text-center">
          {/* We check for video in public/demo/wallet-demo.mp4 */}
          <video
            controls
            className="absolute inset-0 w-full h-full object-cover hidden"
            src="/demo/wallet-demo.mp4"
            onError={(e) => {
              // If video not yet placed by Pruthvik, fallback stays visible
              e.currentTarget.style.display = "none";
            }}
          />

          <div className="space-y-4 max-w-md z-10">
            <div className="h-16 w-16 mx-auto rounded-full bg-blue-600/30 text-blue-400 border border-blue-400/40 flex items-center justify-center shadow-inner">
              <Play className="h-8 w-8 ml-1 text-white" />
            </div>
            <div>
              <h4 className="font-bold text-lg text-white">ChitChain Video Walkthrough</h4>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Watch how embedded smart account wallets, test faucets, autopay mandates, and secret commit-reveal bidding come together on Base Sepolia.
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-900/60 border border-blue-700/50 text-[11px] text-blue-200">
              <Sparkles className="h-3.5 w-3.5 text-blue-400" />
              <span>Video recorded by Pruthvik (Drop file into <code>public/demo/</code>)</span>
            </div>
          </div>
        </div>

        {/* Footer controls */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-t">
          <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
            />
            <span>Don&apos;t show this again</span>
          </label>

          <button
            onClick={handleClose}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow transition-colors"
          >
            Get Started
          </button>
        </div>
      </div>
    </div>
  );
}
