import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { InteractiveSpaceBackground } from "@/components/interactive-space-background";

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
      <body className="min-h-screen bg-black text-neutral-100 antialiased flex flex-col font-sans selection:bg-amber-950 selection:text-white relative">
        <Providers>
          <InteractiveSpaceBackground />
          <Navbar />
          <main className="flex-1 relative z-10">
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
