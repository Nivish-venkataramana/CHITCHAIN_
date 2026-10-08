import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Navbar } from "@/components/navbar";

export const metadata: Metadata = {
  title: "ChitChain • Private Wealth Circles",
  description: "Decentralized chit funds powered by smart accounts and confidential auctions.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark bg-black">
      <body className="min-h-screen bg-black text-neutral-100 antialiased flex flex-col font-sans selection:bg-red-950 selection:text-white">
        <Providers>
          <Navbar />
          <main className="flex-1">
            {children}
          </main>
          <footer className="border-t border-neutral-900 bg-neutral-950 py-8 text-center text-xs text-neutral-500">
            <div className="container mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="font-semibold text-neutral-400">ChitChain Private Protocol</span>
              <span>Base Sepolia Live Prototype</span>
              <span>Audited Smart Contracts</span>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
