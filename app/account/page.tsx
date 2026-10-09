"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AccountPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/profile");
  }, [router]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center text-xs text-neutral-500 font-mono">
      Redirecting to profile...
    </div>
  );
}
