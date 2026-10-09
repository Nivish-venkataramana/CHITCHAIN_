"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useDevUser } from "@/components/providers";
import {
  ArrowLeft,
  CheckCircle2,
  MessageSquare,
  Shield,
  Send,
  AlertCircle,
  ArrowRight,
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
      if (!res.ok) throw new Error(data.error || "Failed to raise issue");

      setComment("");
      setActionSuccess("Issue submitted. Confirmations have been reset.");
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
      if (!res.ok) throw new Error(data.error || "Failed to resolve issue");

      setActionSuccess("Issue resolved.");
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
      if (!res.ok) throw new Error(data.error || "Failed to submit 'No issues'");

      if (data.allConfirmed) {
        setActionSuccess("All members confirmed. Circle is now FINALIZED.");
      } else {
        setActionSuccess("Your 'No issues' confirmation was recorded.");
      }
      loadData();
    } catch (err: any) {
      setError(err.message || "Failed to submit 'No issues'");
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-sm text-neutral-500 glass-panel rounded-3xl">
        Loading issue stage...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-8">
      <Link
        href={`/circles/${circleId}`}
        className="inline-flex items-center gap-2 text-xs text-neutral-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to circle
      </Link>

      {/* Header */}
      <div className="rounded-3xl glass-panel p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white tracking-tight">Issue Stage</h1>
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium border ${
                circle?.status === "FINALIZED"
                  ? "bg-emerald-950/40 text-emerald-300 border-emerald-500/30"
                  : openIssuesCount > 0
                  ? "bg-amber-950/40 text-amber-300 border-amber-500/30"
                  : "bg-neutral-800 text-neutral-300 border-white/10"
              }`}
            >
              {circle?.status === "FINALIZED"
                ? "FINALIZED"
                : openIssuesCount > 0
                ? `${openIssuesCount} Open Issue(s)`
                : "All Resolved"}
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            {confirmations.length} of {acceptedMembers.length} members confirmed &quot;No issues&quot;.
          </p>
        </div>

        {/* Action Button */}
        {circle?.status === "FINALIZED" ? (
          <Link
            href={`/circles/${circleId}/autopay`}
            className="px-5 py-2.5 rounded-xl font-semibold text-xs bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg transition-all flex items-center gap-2"
          >
            <Shield className="h-4 w-4" />
            Proceed to Autopay →
          </Link>
        ) : (
          <button
            disabled={openIssuesCount > 0 || hasUserConfirmed}
            onClick={handleConfirmNoIssues}
            className={`px-5 py-2.5 rounded-xl font-semibold text-xs flex items-center gap-2 transition-all ${
              openIssuesCount === 0 && !hasUserConfirmed
                ? "bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_15px_rgba(16,185,129,0.3)] cursor-pointer"
                : hasUserConfirmed
                ? "bg-emerald-950/40 text-emerald-300 border border-emerald-500/30 cursor-default"
                : "bg-white/5 text-neutral-500 cursor-not-allowed border border-white/5"
            }`}
          >
            <CheckCircle2 className="h-4 w-4" />
            {hasUserConfirmed ? "Confirmed: No Issues" : "Confirm No Issues"}
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {actionSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Form to Raise New Issue */}
      {circle?.status !== "FINALIZED" && (
        <div className="rounded-3xl glass-panel p-8 space-y-6">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-emerald-400" />
            Raise an Issue
          </h2>

          <form onSubmit={handleRaiseIssue} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1.5 uppercase tracking-wider">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e: any) => setCategory(e.target.value)}
                  className="w-full rounded-xl glass-input px-4 py-2.5 text-xs focus:outline-none bg-neutral-900 text-white"
                >
                  <option value="PEOPLE_COUNT">Number of People</option>
                  <option value="DURATION">Duration (Months)</option>
                  <option value="AMOUNT">Monthly Amount</option>
                  <option value="PEOPLE_JOINED">The People Joined</option>
                </select>
              </div>

              {category === "PEOPLE_JOINED" && (
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1.5 uppercase tracking-wider">
                    Select Member
                  </label>
                  <select
                    value={targetMemberWallet}
                    onChange={(e) => setTargetMemberWallet(e.target.value)}
                    className="w-full rounded-xl glass-input px-4 py-2.5 text-xs focus:outline-none bg-neutral-900 text-white"
                  >
                    <option value="">Select member...</option>
                    {acceptedMembers.map((m) => (
                      <option key={m.inviteeWallet} value={m.inviteeWallet}>
                        @{m.inviteeUsername}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-1.5 uppercase tracking-wider">
                Comment
              </label>
              <textarea
                required
                rows={2}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="State your concern..."
                className="w-full rounded-xl glass-input p-4 text-xs focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs transition-colors inline-flex items-center gap-2"
            >
              <Send className="h-3.5 w-3.5" />
              {isSubmitting ? "Submitting..." : "Submit Issue"}
            </button>
          </form>
        </div>
      )}

      {/* Issues List */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-white">Issues ({issues.length})</h3>

        {issues.length === 0 ? (
          <div className="p-12 text-center glass-panel rounded-3xl text-neutral-500 text-xs">
            No issues raised.
          </div>
        ) : (
          <div className="space-y-3">
            {issues.map((iss) => (
              <div key={iss.id} className="rounded-2xl glass-panel p-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2.5">
                    <span className="px-2.5 py-1 rounded-lg bg-white/5 text-neutral-300 text-[10px] font-semibold uppercase tracking-wider border border-white/10">
                      {iss.category.replace("_", " ")}
                    </span>
                    <span className="text-xs font-medium text-white">
                      @{iss.authorUsername}
                    </span>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-[10px] font-medium border ${
                      iss.status === "RESOLVED"
                        ? "bg-emerald-950/40 text-emerald-300 border-emerald-500/30"
                        : "bg-amber-950/40 text-amber-300 border-amber-500/30"
                    }`}
                  >
                    {iss.status}
                  </span>
                </div>

                <p className="text-xs text-neutral-300 bg-white/[0.02] rounded-xl p-4 border border-white/5">
                  &ldquo;{iss.comment}&rdquo;
                </p>

                {iss.status === "RESOLVED" ? (
                  <div className="rounded-xl bg-emerald-950/20 border border-emerald-500/20 p-4 text-xs text-emerald-200 space-y-1">
                    <p className="font-semibold text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      Resolution:
                    </p>
                    <p className="text-neutral-300">{iss.resolutionResponse}</p>
                  </div>
                ) : isVolunteer ? (
                  <div className="space-y-2 border-t border-white/5 pt-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Resolution response..."
                        value={resolutionText[iss.id] || ""}
                        onChange={(e) =>
                          setResolutionText({ ...resolutionText, [iss.id]: e.target.value })
                        }
                        className="flex-1 rounded-xl glass-input px-4 py-2 text-xs focus:outline-none"
                      />
                      <button
                        onClick={() => handleResolveIssue(iss.id)}
                        className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs"
                      >
                        Resolve
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-neutral-500 italic">
                    Awaiting volunteer resolution...
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
