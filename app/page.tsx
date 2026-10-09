"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { HubtownIntro } from "@/components/hubtown-intro";

export default function IntroPage() {
  const router = useRouter();

  const handleEnter = () => {
    router.push("/home");
  };

  return (
    <main className="relative min-h-screen bg-black text-white overflow-hidden">
      <HubtownIntro
        isOpen={true}
        onEnter={handleEnter}
      />
    </main>
  );
}
