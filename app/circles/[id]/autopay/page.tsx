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
        const res = await fetch(`/api/circles/${circleId}`);
        if (res.ok) {
          const json = await res.json();
          if (json && !json.error) {
            setCircle(json);
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

  // Deduplicate members list by wallet address to avoid duplicate volunteer entries
  const memberMap = new Map<string, any>();
  if (circle?.volunteerWallet) {
    const vWallet = circle.volunteerWallet.toLowerCase();
    memberMap.set(vWallet, {
      walletAddress: circle.volunteerWallet,
      username: circle.volunteerUsername || "volunteer",
      displayName: circle.volunteerUsername ? `@${circle.volunteerUsername}` : "Volunteer Leader",
      isVolunteer: true,
    });
  }

  (circle?.invites || []).forEach((inv: any) => {
    if (inv.status !== "REJECTED") {
      const w = (inv.inviteeWallet || "").toLowerCase();
      if (w) {
        const existing = memberMap.get(w);
        if (existing) {
          if (inv.inviteeUsername) {
            existing.username = inv.inviteeUsername;
            existing.displayName = `@${inv.inviteeUsername}`;
          }
        } else {
          memberMap.set(w, {
            walletAddress: inv.inviteeWallet,
            username: inv.inviteeUsername || "member",
            displayName: `@${inv.inviteeUsername || "member"}`,
            isVolunteer: false,
          });
        }
      }
    }
  });

  const membersList = Array.from(memberMap.values());

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
            monthlyAmountUSDC={Number(monthlyAmount) || 1000}
            durationMonths={durationMonths}
            vaultAddress={circle?.vaultAddress}
            members={membersList}
          />
        )}
      </div>
    </div>
  );
}
