"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AutoPayAuthorization } from "@/components/AutoPayAuthorization";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { fromBaseUnits } from "@/lib/validation";

export default function AutoPayDedicatedPage() {
  const params = useParams();
  const router = useRouter();
  const circleId = params.id as string;

  const [circle, setCircle] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCircle() {
      try {
        const res = await fetch(`/api/circles/mine`);
        if (res.ok) {
          const json = await res.json();
          const found = (json.circles || []).find((c: any) => c.id === circleId);
          if (found) {
            setCircle(found);
          }
        }
      } catch (e) {
        console.error("Failed to load circle:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchCircle();
  }, [circleId]);

  const monthlyAmount = circle ? fromBaseUnits(circle.monthlyAmount) : 25000;
  const durationMonths = circle?.durationMonths || 3;
  const circleName = circle?.name || "Chit Circle";

  return (
    <div className="min-h-screen bg-[#07090e] text-white p-4 sm:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href={`/circles/${circleId}`}
            className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Circle
          </Link>
          <span className="text-xs font-mono text-cyan-400 bg-cyan-950/40 border border-cyan-800/50 px-3 py-1 rounded-full">
            Circle ID: {circleId.slice(0, 12)}...
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12 text-neutral-400 gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" />
            <span>Loading Auto-Pay Engine...</span>
          </div>
        ) : (
          <AutoPayAuthorization
            circleId={circleId}
            circleName={circleName}
            monthlyAmountUSDC={monthlyAmount}
            durationMonths={durationMonths}
            vaultAddress={circle?.vaultAddress}
          />
        )}
      </div>
    </div>
  );
}
