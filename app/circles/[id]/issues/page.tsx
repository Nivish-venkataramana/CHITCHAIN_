"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useDevUser } from "@/components/providers";
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  MessageSquare,
  ShieldCheck,
  Send,
  HelpCircle,
} from "lucide-react";

export default function IssuesStagePage() {
  const params = useParams();
  const circleId = params.id as string;
  const { user } = useDevUser();

  const isVolunteer = user?.username === "asharao01";

  const [issues, setIssues] = useState([
    {
      id: "issue-1",
      category: "DURATION",
      targetMember: null,
      comment: "Can we verify if 3 months is optimal rather than 2 months?",
      authorUsername: "vikramnair02",
      authorDisplayName: "Vikram Nair",
      status: "RESOLVED",
      resolution: "3 months gives everyone sufficient cycle time for liquidity.",
    },
    {
      id: "issue-2",
      category: "AMOUNT",
      targetMember: null,
      comment: "Please confirm monthly 1,000 USDC autopay timing.",
      authorUsername: "meerajoshi03",
      authorDisplayName: "Meera Joshi",
      status: "OPEN",
      resolution: null,
    },
  ]);

  const [category, setCategory] = useState("PEOPLE_COUNT");
  const [comment, setComment] = useState("");
  const [resolutionText, setResolutionText] = useState<{ [key: string]: string }>({});
  const [noIssuesConfirmed, setNoIssuesConfirmed] = useState(false);

  const openIssuesCount = issues.filter((i) => i.status === "OPEN").length;

  const handleRaiseIssue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;

    const newIssue = {
      id: "issue-" + Date.now(),
      category,
      targetMember: null,
      comment,
      authorUsername: user?.username || "member",
      authorDisplayName: user?.displayName || "Member",
      status: "OPEN",
      resolution: null,
    };

    // Rule: new issue clears all confirmations (DEFAULT D10)
    setNoIssuesConfirmed(false);
    setIssues([...issues, newIssue]);
    setComment("");
  };

  const handleResolveIssue = (issueId: string) => {
    const text = resolutionText[issueId];
    if (!text || !text.trim()) return;

    setIssues(
      issues.map((iss) =>
        iss.id === issueId
          ? { ...iss, status: "RESOLVED", resolution: text.trim() }
          : iss
      )
    );
  };

  return (
    <div className="max-w-4xl mx-auto py-4 space-y-6">
      <Link
        href={`/circles/${circleId}`}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to circle
      </Link>

      {/* Header */}
      <div className="rounded-2xl border bg-white p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">Issue Stage & Agreement</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
              {openIssuesCount > 0 ? `${openIssuesCount} Open Issue(s)` : "All Resolved"}
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Review circle terms before autopay. Every issue requires volunteer resolution before finalization.
          </p>
        </div>

        {/* Finalize button */}
        <button
          disabled={openIssuesCount > 0 || noIssuesConfirmed}
          onClick={() => setNoIssuesConfirmed(true)}
          className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
            openIssuesCount === 0 && !noIssuesConfirmed
              ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow cursor-pointer"
              : noIssuesConfirmed
              ? "bg-emerald-100 text-emerald-800 border border-emerald-300 cursor-default"
              : "bg-slate-200 text-slate-400 cursor-not-allowed"
          }`}
        >
          <CheckCircle2 className="h-4 w-4" />
          {noIssuesConfirmed ? "Confirmed: No Issues ✓" : "Submit 'No Issues'"}
        </button>
      </div>

      {/* Form to Raise New Issue */}
      <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-blue-600" />
          Raise an Issue or Question
        </h2>

        <form onSubmit={handleRaiseIssue} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="PEOPLE_COUNT">Number of People</option>
                <option value="DURATION">Duration (Months)</option>
                <option value="AMOUNT">Monthly Amount</option>
                <option value="PEOPLE_JOINED">The People Joined</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Your Comment / Concern (Required)
            </label>
            <textarea
              required
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="State your question or concern clearly..."
              className="w-full rounded-xl border p-3 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors flex items-center gap-1.5"
          >
            <Send className="h-3.5 w-3.5" />
            Submit Issue
          </button>
        </form>
      </div>

      {/* Issues List */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-slate-900">Submitted Issues ({issues.length})</h3>

        <div className="space-y-3">
          {issues.map((iss) => (
            <div key={iss.id} className="rounded-2xl border bg-white p-5 space-y-3 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-wider">
                    {iss.category}
                  </span>
                  <span className="text-xs font-semibold text-slate-900">
                    {iss.authorDisplayName} (@{iss.authorUsername})
                  </span>
                </div>

                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    iss.status === "RESOLVED"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {iss.status}
                </span>
              </div>

              <p className="text-xs text-slate-800 bg-slate-50 rounded-xl p-3 border">
                &ldquo;{iss.comment}&rdquo;
              </p>

              {/* Resolution Display or Box */}
              {iss.status === "RESOLVED" ? (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-900 space-y-1">
                  <p className="font-semibold flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    Volunteer Resolution:
                  </p>
                  <p className="text-emerald-800">{iss.resolution}</p>
                </div>
              ) : isVolunteer ? (
                <div className="space-y-2 border-t pt-3">
                  <label className="block text-[11px] font-semibold text-slate-700">
                    Volunteer Resolution Response
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Write your resolution response..."
                      value={resolutionText[iss.id] || ""}
                      onChange={(e) =>
                        setResolutionText({ ...resolutionText, [iss.id]: e.target.value })
                      }
                      className="flex-1 rounded-xl border px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => handleResolveIssue(iss.id)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs"
                    >
                      Resolve
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-amber-700 italic">
                  Waiting for volunteer organizer to review and resolve...
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
