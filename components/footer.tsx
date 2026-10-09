"use client";

import React from "react";
import { usePathname } from "next/navigation";

export function Footer() {
  const pathname = usePathname();

  if (pathname === "/") {
    return null;
  }

  return (
    <footer className="border-t border-neutral-900 bg-neutral-950 py-8 text-center text-xs text-neutral-500">
      <div className="container mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <span className="font-semibold text-neutral-400">ChitChain Private Protocol</span>
        <span>Base Sepolia Live Prototype</span>
        <span>Audited Smart Contracts</span>
      </div>
    </footer>
  );
}
