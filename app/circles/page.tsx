"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useDevUser } from "@/components/providers";
import { Plus, ArrowRight, CheckCircle2, AlertCircle, Clock } from "lucide-react";
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
    <div className="space-y-10 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Circles</h1>
          <p className="text-neutral-400 text-sm mt-1">
            Active and invited circles for <span className="text-neutral-200 font-medium">{user?.displayName}</span>.
          </p>
        </div>

        <Link
          href="/circles/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs shadow-lg transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create Circle
        </Link>
      </div>

      {/* Circles Grid */}
      {loading ? (
        <div className="p-16 text-center text-sm text-neutral-500 glass-panel rounded-3xl">
          Loading circles...
        </div>
      ) : circles.length === 0 ? (
        <div className="p-16 text-center glass-panel rounded-3xl space-y-4">
          <p className="text-neutral-400 text-sm">No circles found.</p>
          <Link
            href="/circles/new"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300"
          >
            Start a new circle →
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
                className="rounded-3xl glass-panel p-8 flex flex-col justify-between space-y-8 hover:border-white/20 transition-all"
              >
                <div className="space-y-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-bold text-white tracking-tight">{circle.name}</h3>
                      <p className="text-xs text-neutral-400 mt-1">
                        Organizer:{" "}
                        <span className="text-neutral-300 font-medium">
                          {circle.volunteerUsername ? `@${circle.volunteerUsername}` : `${circle.volunteerWallet.slice(0, 6)}...`}
                        </span>
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
                        circle.status === "FINALIZED"
                          ? "bg-emerald-950/40 text-emerald-300 border-emerald-500/30"
                          : circle.status === "ISSUE_STAGE"
                          ? "bg-amber-950/40 text-amber-300 border-amber-500/30"
                          : "bg-neutral-800 text-neutral-300 border-white/10"
                      }`}
                    >
                      {circle.status === "FINALIZED" && <CheckCircle2 className="h-3 w-3" />}
                      {circle.status === "ISSUE_STAGE" && <AlertCircle className="h-3 w-3" />}
                      {circle.status === "INVITING" && <Clock className="h-3 w-3" />}
                      {circle.status}
                    </span>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4 bg-white/[0.03] rounded-2xl p-4 text-center border border-white/5">
                    <div>
                      <span className="text-[11px] text-neutral-500 block">Members</span>
                      <span className="font-bold text-white text-base mt-0.5 block">{circle.numPeople}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-neutral-500 block">Monthly</span>
                      <span className="font-bold text-white text-base mt-0.5 block">
                        {fromBaseUnits(circle.monthlyAmount)} USDC
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-neutral-500 block">Duration</span>
                      <span className="font-bold text-white text-base mt-0.5 block">{circle.durationMonths} Mos</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between border-t border-white/10 pt-5">
                  <span className="text-xs text-neutral-500">
                    Role: <span className="text-neutral-300 font-medium">{isVolunteer ? "Volunteer" : "Member"}</span>
                  </span>

                  <div className="flex items-center gap-2.5">
                    {circle.status === "ISSUE_STAGE" && (
                      <Link
                        href={`/circles/${circle.id}/issues`}
                        className="px-3.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-medium border border-amber-500/20 transition-colors"
                      >
                        Issues
                      </Link>
                    )}
                    {circle.status === "FINALIZED" && (
                      <Link
                        href={`/circles/${circle.id}/autopay`}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-medium border border-emerald-500/20 transition-colors"
                      >
                        Autopay
                      </Link>
                    )}
                    <Link
                      href={`/circles/${circle.id}`}
                      className="px-3.5 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/10 text-white text-xs font-medium border border-white/10 transition-colors inline-flex items-center gap-1"
                    >
                      Details <ArrowRight className="h-3 w-3" />
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
