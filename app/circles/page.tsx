"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useDevUser } from "@/components/providers";
import { PlusCircle, ArrowRight, Clock, CheckCircle2, AlertCircle, Coins, Shield } from "lucide-react";
import { fromBaseUnits } from "@/lib/validation";

interface CircleItem {
  id: string;
  name: string;
  volunteerWallet: string;
  volunteerUsername?: string;
  numPeople: number;
  monthlyAmount: string;
  durationMonths: number;
  status: "INVITING" | "ISSUE_STAGE" | "FINALIZED";
}

export default function CirclesListPage() {
  const { user } = useDevUser();
  const [circles, setCircles] = useState<CircleItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    fetch("/api/circles/mine", {
      headers: { "x-dev-user": user.username },
    })
      .then((res) => res.json())
      .then((data: CircleItem[]) => {
        if (Array.isArray(data)) {
          setCircles(data);
        }
      })
      .catch((err) => console.error("Error fetching circles:", err))
      .finally(() => setLoading(false));
  }, [user]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-10 text-neutral-100">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-neutral-900">
        <div className="space-y-1">
          <div className="text-xs uppercase tracking-widest font-bold text-red-500">
            Portfolio Overview
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">Your Wealth Circles</h1>
          <p className="text-neutral-400 text-sm">
            Active participating circles for <span className="text-white font-semibold">{user?.displayName}</span> (@{user?.username})
          </p>
        </div>

        <Link
          href="/circles/new"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white hover:bg-neutral-200 text-black font-bold text-xs tracking-wider uppercase transition-all shadow-lg shadow-white/5"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Create New Circle</span>
        </Link>
      </div>

      {/* Circles Grid */}
      {loading ? (
        <div className="p-16 text-center text-sm text-neutral-500 bg-neutral-950 rounded-3xl border border-neutral-900">
          Loading portfolio circles...
        </div>
      ) : circles.length === 0 ? (
        <div className="p-16 text-center bg-neutral-950 rounded-3xl border border-neutral-900 space-y-4">
          <Shield className="w-12 h-12 text-neutral-600 mx-auto" />
          <p className="text-neutral-400 text-sm">You do not participate in any wealth circles yet.</p>
          <Link
            href="/circles/new"
            className="inline-flex items-center gap-2 text-xs font-bold text-red-400 hover:text-red-300"
          >
            <span>Initiate your first circle</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {circles.map((circle) => {
            const isVolunteer =
              user?.username === circle.volunteerUsername ||
              user?.walletAddress.toLowerCase() === circle.volunteerWallet.toLowerCase();

            return (
              <div
                key={circle.id}
                className="rounded-3xl border border-neutral-900 bg-neutral-950 p-8 hover:border-red-600/40 transition-all flex flex-col justify-between space-y-6 shadow-2xl relative overflow-hidden group"
              >
                <div className="space-y-5 relative z-10">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-2xl font-bold text-white group-hover:text-red-300 transition-colors">{circle.name}</h3>
                      <p className="text-xs text-neutral-400 mt-1">
                        Organizer:{" "}
                        <span className="font-medium text-neutral-200">
                          {circle.volunteerUsername ? `@${circle.volunteerUsername}` : `${circle.volunteerWallet.slice(0, 6)}...`}
                        </span>
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase ${
                        circle.status === "FINALIZED"
                          ? "bg-emerald-950/80 text-emerald-300 border border-emerald-800/60"
                          : circle.status === "ISSUE_STAGE"
                          ? "bg-amber-950/80 text-amber-300 border border-amber-800/60"
                          : "bg-blue-950/80 text-blue-300 border border-blue-800/60"
                      }`}
                    >
                      {circle.status === "FINALIZED" && <CheckCircle2 className="h-3 w-3" />}
                      {circle.status === "ISSUE_STAGE" && <AlertCircle className="h-3 w-3" />}
                      {circle.status === "INVITING" && <Clock className="h-3 w-3" />}
                      {circle.status}
                    </span>
                  </div>

                  {/* Stats overview */}
                  <div className="grid grid-cols-3 gap-3 bg-neutral-900/80 rounded-2xl p-4 text-center border border-neutral-800">
                    <div>
                      <span className="text-[11px] uppercase tracking-wider text-neutral-400 block font-semibold">Members</span>
                      <span className="font-bold text-white text-lg mt-0.5 block">{circle.numPeople}</span>
                    </div>
                    <div>
                      <span className="text-[11px] uppercase tracking-wider text-neutral-400 block font-semibold">Monthly</span>
                      <span className="font-bold text-white text-lg mt-0.5 block">
                        {fromBaseUnits(circle.monthlyAmount)} <span className="text-xs text-neutral-400 font-normal">USDC</span>
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] uppercase tracking-wider text-neutral-400 block font-semibold">Duration</span>
                      <span className="font-bold text-white text-lg mt-0.5 block">{circle.durationMonths} Months</span>
                    </div>
                  </div>
                </div>

                {/* Actions Links */}
                <div className="flex items-center justify-between border-t border-neutral-900 pt-5 text-xs">
                  <span className="text-neutral-400">
                    Role:{" "}
                    <span className="text-white font-bold">
                      {isVolunteer ? "Organizer" : "Member"}
                    </span>
                  </span>

                  <div className="flex items-center gap-2.5">
                    {circle.status === "ISSUE_STAGE" && (
                      <Link
                        href={`/circles/${circle.id}/issues`}
                        className="font-bold px-3.5 py-2 rounded-xl bg-amber-950/60 text-amber-300 border border-amber-800/50 hover:bg-amber-900/50 transition-colors"
                      >
                        Review Issues
                      </Link>
                    )}
                    {circle.status === "FINALIZED" && (
                      <Link
                        href={`/circles/${circle.id}/autopay`}
                        className="font-bold px-3.5 py-2 rounded-xl bg-emerald-950/60 text-emerald-300 border border-emerald-800/50 hover:bg-emerald-900/50 transition-colors"
                      >
                        Autopay
                      </Link>
                    )}
                    <Link
                      href={`/circles/${circle.id}`}
                      className="font-bold px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white border border-neutral-800 flex items-center gap-1.5 transition-colors"
                    >
                      <span>Circle Details</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
