import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Navbar } from "@/components/navbar";

import { FloatingCoinsBackground } from "@/components/floating-coins-background";

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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Syne:wght@600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-black text-neutral-100 antialiased flex flex-col font-sans selection:bg-neutral-800 selection:text-white overflow-x-hidden overflow-y-auto">
        <FloatingCoinsBackground />
        <Providers>
          <Navbar />
          <main className="flex-1 flex flex-col px-4 sm:px-8 py-3 w-full">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
