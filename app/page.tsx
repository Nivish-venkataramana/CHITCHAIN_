"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDevUser } from "@/components/providers";

export default function RootPage() {
  const router = useRouter();
  const { user } = useDevUser();

  useEffect(() => {
    // Automatically redirect visitor to login page
    router.replace("/login");
  }, [router]);

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
        <span className="text-xs font-mono text-neutral-400">Loading ChitChain Bharat...</span>
      </div>
    </main>
  );
}

