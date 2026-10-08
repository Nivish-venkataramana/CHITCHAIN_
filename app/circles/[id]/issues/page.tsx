"use client";

import React, { useState, useEffect } from "react";
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
  AlertCircle,
  ArrowRight,
  Users,
} from "lucide-react";
import { IssueRecord, NoIssueConfirmationRecord } from "@/lib/circles-store";

interface CircleInfo {
  id: string;
  name: string;
  volunteerWallet: string;
  volunteerUsername?: string;
  numPeople: number;
  status: "INVITING" | "ISSUE_STAGE" | "FINALIZED";
  invites: Array<{
    id: string;
    inviteeWallet: string;
    inviteeUsername: string;
    status: string;
  }>;
}

export default function IssuesStagePage() {
  const params = useParams();
  const circleId = params.id as string;
  const { user } = useDevUser();

  const [circle, setCircle] = useState<CircleInfo | null>(null);
  const [issues, setIssues] = useState<IssueRecord[]>([]);
  const [confirmations, setConfirmations] = useState<NoIssueConfirmationRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [category, setCategory] = useState<"PEOPLE_COUNT" | "DURATION" | "AMOUNT" | "PEOPLE_JOINED">("PEOPLE_COUNT");
  const [targetMemberWallet, setTargetMemberWallet] = useState<string>("");
  const [comment, setComment] = useState("");
  const [resolutionText, setResolutionText] = useState<{ [key: string]: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = () => {
    Promise.all([
      fetch(`/api/circles/${circleId}`).then((r) => r.json()),
      fetch(`/api/circles/${circleId}/issues`).then((r) => r.json()),
    ])
      .then(([circleData, issuesData]) => {
        if (circleData && !circleData.error) setCircle(circleData);
        if (issuesData && !issuesData.error) {
          setIssues(issuesData.issues || []);
          setConfirmations(issuesData.confirmations || []);
        }
      })
      .catch((err) => console.error("Error loading issues data:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [circleId]);

  const isVolunteer =
    user?.username === circle?.volunteerUsername ||
    user?.walletAddress.toLowerCase() === circle?.volunteerWallet.toLowerCase();

  const openIssues = issues.filter((i) => i.status === "OPEN");
  const openIssuesCount = openIssues.length;
  const acceptedMembers = circle?.invites.filter((i) => i.status === "ACCEPTED") || [];
  const hasUserConfirmed = user ? confirmations.some((c) => c.memberWallet.toLowerCase() === user.walletAddress.toLowerCase()) : false;

  const handleRaiseIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!comment.trim()) {
      setError("Please write a comment describing the issue.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setActionSuccess(null);

    try {
      const res = await fetch(`/api/circles/${circleId}/issues`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-dev-user": user.username,
        },
        body: JSON.stringify({
          category,
          targetMemberWallet: category === "PEOPLE_JOINED" ? targetMemberWallet || null : null,
          comment: comment.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to raise issue");
      }

      setComment("");
      setActionSuccess("Issue raised successfully. All confirmations have been reset.");
      loadData();
    } catch (err: any) {
      setError(err.message || "Failed to raise issue");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolveIssue = async (issueId: string) => {
    if (!user) return;
    const resp = resolutionText[issueId];
    if (!resp || !resp.trim()) return;

    setError(null);
    setActionSuccess(null);

    try {
      const res = await fetch(`/api/issues/${issueId}/resolve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-dev-user": user.username,
        },
        body: JSON.stringify({ response: resp.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to resolve issue");
      }

      setActionSuccess("Issue resolved with response!");
      loadData();
    } catch (err: any) {
      setError(err.message || "Failed to resolve issue");
    }
  };

  const handleConfirmNoIssues = async () => {
    if (!user) return;
    setError(null);
    setActionSuccess(null);

    try {
      const res = await fetch(`/api/circles/${circleId}/no-issues`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-dev-user": user.username,
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit 'No issues'");
      }

      if (data.allConfirmed) {
        setActionSuccess("All members confirmed 'No issues'! Circle is now FINALIZED!");
      } else {
        setActionSuccess("Your 'No issues' confirmation was recorded!");
      }
      loadData();
    } catch (err: any) {
      setError(err.message || "Failed to submit 'No issues'");
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-sm text-slate-500 bg-white rounded-2xl border">
        Loading issue stage...
      </div>
    );
  }

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
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">Issue Stage &amp; Terms Agreement</h1>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                circle?.status === "FINALIZED"
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                  : openIssuesCount > 0
                  ? "bg-amber-100 text-amber-800 border border-amber-200"
                  : "bg-blue-100 text-blue-800 border border-blue-200"
              }`}
            >
              {circle?.status === "FINALIZED"
                ? "FINALIZED"
                : openIssuesCount > 0
                ? `${openIssuesCount} Open Issue(s)`
                : "All Issues Resolved"}
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            {confirmations.length} of {acceptedMembers.length} members confirmed &quot;No issues&quot;.
            Circle finalizes when all members confirm.
          </p>
        </div>

        {/* Action Button */}
        {circle?.status === "FINALIZED" ? (
          <Link
            href={`/circles/${circleId}/autopay`}
            className="px-5 py-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow transition-all flex items-center gap-2"
          >
            <ShieldCheck className="h-4 w-4" />
            Proceed to Autopay Setup →
          </Link>
        ) : (
          <button
            disabled={openIssuesCount > 0 || hasUserConfirmed}
            onClick={handleConfirmNoIssues}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
              openIssuesCount === 0 && !hasUserConfirmed
                ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow cursor-pointer"
                : hasUserConfirmed
                ? "bg-emerald-100 text-emerald-800 border border-emerald-300 cursor-default"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            }`}
          >
            <CheckCircle2 className="h-4 w-4" />
            {hasUserConfirmed ? "You Confirmed: No Issues ✓" : "Submit 'No Issues'"}
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Form to Raise New Issue (Disabled if Finalized) */}
      {circle?.status !== "FINALIZED" && (
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
                  onChange={(e: any) => setCategory(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="PEOPLE_COUNT">Number of People</option>
                  <option value="DURATION">Duration (Months)</option>
                  <option value="AMOUNT">Monthly Amount</option>
                  <option value="PEOPLE_JOINED">The People Joined</option>
                </select>
              </div>

              {category === "PEOPLE_JOINED" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Member
                  </label>
                  <select
                    value={targetMemberWallet}
                    onChange={(e) => setTargetMemberWallet(e.target.value)}
                    className="w-full rounded-xl border px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Choose a member...</option>
                    {acceptedMembers.map((m) => (
                      <option key={m.inviteeWallet} value={m.inviteeWallet}>
                        @{m.inviteeUsername} ({m.inviteeWallet.slice(0, 6)}...)
                      </option>
                    ))}
                  </select>
                </div>
              )}
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
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors flex items-center gap-1.5"
            >
              <Send className="h-3.5 w-3.5" />
              {isSubmitting ? "Submitting..." : "Submit Issue"}
            </button>
          </form>
        </div>
      )}

      {/* Issues List */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-slate-900">Submitted Issues ({issues.length})</h3>

        {issues.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border text-slate-400 text-xs">
            No issues have been raised yet.
          </div>
        ) : (
          <div className="space-y-3">
            {issues.map((iss) => (
              <div key={iss.id} className="rounded-2xl border bg-white p-5 space-y-3 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-wider">
                      {iss.category.replace("_", " ")}
                    </span>
                    <span className="text-xs font-semibold text-slate-900">
                      @{iss.authorUsername}
                    </span>
                    {iss.targetMemberWallet && (
                      <span className="text-xs text-slate-500">
                        re: {iss.targetMemberWallet.slice(0, 6)}...
                      </span>
                    )}
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

                {/* Resolution Display or Resolution Input Box */}
                {iss.status === "RESOLVED" ? (
                  <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-900 space-y-1">
                    <p className="font-semibold flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      Volunteer Resolution Response:
                    </p>
                    <p className="text-emerald-800">{iss.resolutionResponse}</p>
                  </div>
                ) : isVolunteer ? (
                  <div className="space-y-2 border-t pt-3">
                    <label className="block text-[11px] font-semibold text-slate-700">
                      Volunteer Resolution Response
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Write resolution response..."
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
        )}
      </div>
    </div>
  );
}
