"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useDevUser } from "@/components/providers";
import { ShieldCheck, ArrowLeft, CheckCircle2, XCircle, Key } from "lucide-react";

export default function AutopayPermissionsPage() {
  const params = useParams();
  const circleId = params.id as string;
  const { user } = useDevUser();

  const members = [
    { username: "asharao01", displayName: "Asha Rao", status: "GIVEN" },
    { username: "vikramnair02", displayName: "Vikram Nair", status: "GIVEN" },
    { username: "meerajoshi03", displayName: "Meera Joshi", status: "NOT_GIVEN" },
    { username: "rohandas04", displayName: "Rohan Das", status: "NOT_GIVEN" },
  ];

  return (
    <div className="max-w-2xl mx-auto py-6 space-y-6">
      <Link
        href={`/circles/${circleId}`}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to circle
      </Link>

      <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Autopay SmartSession Permissions</h1>
            <p className="text-xs text-slate-500">
              [Pruthvik Slice: Rhinestone SmartSession EIP-712 Mandates]
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border text-xs text-slate-600 space-y-2">
          <p className="font-semibold text-slate-800">Mandate Scope (Strictly Scoped):</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>Target: Only this circle&apos;s vault address.</li>
            <li>Function: MockUSDC transfer (max 1,000 USDC) &amp; recordContribution().</li>
            <li>Frequency: At most 1 execution per cycle.</li>
          </ul>
        </div>

        {/* Member Status */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-900">Member Permissions</h3>
          <div className="divide-y border rounded-xl overflow-hidden">
            {members.map((m) => (
              <div key={m.username} className="p-3.5 flex items-center justify-between text-xs bg-white">
                <div>
                  <span className="font-semibold text-slate-800">{m.displayName}</span>
                  <span className="text-slate-400 ml-1.5">@{m.username}</span>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                    m.status === "GIVEN"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {m.status === "GIVEN" ? "Permission Given ✓" : "Not Given"}
                </span>
              </div>
            ))}
          </div>
        </div>

        <button className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-colors flex items-center justify-center gap-2">
          <Key className="h-4 w-4" />
          Sign EIP-712 Autopay Mandate
        </button>
      </div>
    </div>
  );
}
