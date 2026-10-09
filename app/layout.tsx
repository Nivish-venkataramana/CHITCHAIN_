import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Navbar } from "@/components/navbar";

export const metadata: Metadata = {
  title: "ChitChain — Decentralized Chit Funds",
  description: "Peer-to-peer chit funds on Base Sepolia powered by smart accounts and commit-reveal auctions.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-black text-neutral-100 antialiased flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
        <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.12),rgba(255,255,255,0))]" />
        <Providers>
          <Navbar />
          <main className="flex-1 flex flex-col justify-center container mx-auto px-6 py-4 max-w-5xl relative z-10">
            {children}
          </main>
          <footer className="py-4 text-center text-xs text-neutral-600 relative z-10">
            <p>ChitChain • Base Sepolia</p>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
