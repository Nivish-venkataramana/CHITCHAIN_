"use client";

import Link from "next/link";
import { useDevUser } from "@/components/providers";
import { PlusCircle, ArrowRight, ShieldCheck, Clock, CheckCircle2, AlertCircle } from "lucide-react";

export default function CirclesListPage() {
  const { user } = useDevUser();

  // Initial sample circles based on handoffs/samples
  const sampleCircles = [
    {
      id: "sample-circle-4m-3mo",
      name: "Alpha Friends Chit",
      volunteer: "0x1111111111111111111111111111111111111111",
      volunteerName: "Asha Rao",
      numPeople: 4,
      monthlyAmount: "1000",
      durationMonths: 3,
      status: "FINALIZED",
      role: user?.username === "asharao01" ? "Volunteer (Organizer)" : "Member",
    },
    {
      id: "sample-circle-5m-4mo",
      name: "Beta Core Chit",
      volunteer: "0x1111111111111111111111111111111111111111",
      volunteerName: "Asha Rao",
      numPeople: 5,
      monthlyAmount: "1000",
      durationMonths: 4,
      status: "ISSUE_STAGE",
      role: user?.username === "asharao01" ? "Volunteer (Organizer)" : "Member",
    },
  ];

  return (
    <div className="space-y-8 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Your Circles</h1>
          <p className="text-slate-600 text-sm mt-1">
            Circles where you are participating or invited as <span className="font-semibold text-slate-900">{user?.displayName}</span> (@{user?.username}).
          </p>
        </div>

        <Link
          href="/circles/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-sm transition-colors"
        >
          <PlusCircle className="h-4 w-4" />
          Create New Circle
        </Link>
      </div>

      {/* Circles Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {sampleCircles.map((circle) => (
          <div
            key={circle.id}
            className="rounded-2xl border bg-white p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-6"
          >
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{circle.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Organizer: <span className="font-medium text-slate-700">{circle.volunteerName}</span>
                  </p>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                    circle.status === "FINALIZED"
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                      : circle.status === "ISSUE_STAGE"
                      ? "bg-amber-100 text-amber-800 border border-amber-200"
                      : "bg-blue-100 text-blue-800 border border-blue-200"
                  }`}
                >
                  {circle.status === "FINALIZED" && <CheckCircle2 className="h-3 w-3" />}
                  {circle.status === "ISSUE_STAGE" && <AlertCircle className="h-3 w-3" />}
                  {circle.status === "INVITING" && <Clock className="h-3 w-3" />}
                  {circle.status}
                </span>
              </div>

              {/* Stats overview */}
              <div className="grid grid-cols-3 gap-3 bg-slate-50 rounded-xl p-3 text-center border">
                <div>
                  <span className="text-xs text-slate-500 block">Members</span>
                  <span className="font-bold text-slate-900 text-base">{circle.numPeople}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Monthly</span>
                  <span className="font-bold text-slate-900 text-base">{circle.monthlyAmount} USDC</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Duration</span>
                  <span className="font-bold text-slate-900 text-base">{circle.durationMonths} Mos</span>
                </div>
              </div>
            </div>

            {/* Actions Links */}
            <div className="flex items-center justify-between border-t pt-4">
              <span className="text-xs font-medium text-slate-500">
                Your role: <span className="text-slate-800 font-semibold">{circle.role}</span>
              </span>

              <div className="flex items-center gap-2">
                {circle.status === "ISSUE_STAGE" && (
                  <Link
                    href={`/circles/${circle.id}/issues`}
                    className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
                  >
                    Issues Review
                  </Link>
                )}
                {circle.status === "FINALIZED" && (
                  <Link
                    href={`/circles/${circle.id}/autopay`}
                    className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                  >
                    Autopay Setup
                  </Link>
                )}
                <Link
                  href={`/circles/${circle.id}`}
                  className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 text-slate-800 hover:bg-slate-200 transition-colors"
                >
                  Details <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
