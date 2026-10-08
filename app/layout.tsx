import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Navbar } from "@/components/navbar";

export const metadata: Metadata = {
  title: "ChitChain — Decentralized Chit Funds",
  description: "Peer-to-peer decentralized chit funds powered by smart accounts and commit-reveal auctions.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased flex flex-col font-sans">
        <Providers>
          <Navbar />
          <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
            {children}
          </main>
          <footer className="border-t bg-white py-6 text-center text-xs text-gray-500">
            <p>ChitChain (Base Sepolia Prototype) — Team Tempus</p>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
