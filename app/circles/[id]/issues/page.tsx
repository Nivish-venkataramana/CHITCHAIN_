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
  Shield,
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
      setError("Please write a comment describing the question or concern.");
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
      setActionSuccess("Issue raised successfully. All mutual confirmations reset.");
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

      setActionSuccess("Issue resolved with official response");
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
        throw new Error(data.error || "Failed to confirm No issues");
      }

      if (data.allConfirmed) {
        setActionSuccess("All members confirmed No issues! Circle is now FINALIZED!");
      } else {
        setActionSuccess("Your No issues confirmation was recorded!");
      }
      loadData();
    } catch (err: any) {
      setError(err.message || "Failed to confirm No issues");
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-sm text-neutral-500 bg-neutral-950 rounded-3xl border border-neutral-900">
        Loading issue stage...
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-6 space-y-8 text-neutral-100">
      <Link
        href={`/circles/${circleId}`}
        className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Return to Circle</span>
      </Link>

      {/* Header */}
      <div className="rounded-3xl border border-neutral-900 bg-neutral-950 p-8 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-white tracking-tight">Terms Review and Issues</h1>
            <span
              className={`px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase ${
                circle?.status === "FINALIZED"
                  ? "bg-emerald-950/80 text-emerald-300 border border-emerald-800/60"
                  : openIssuesCount > 0
                  ? "bg-amber-950/80 text-amber-300 border border-amber-800/60"
                  : "bg-blue-950/80 text-blue-300 border border-blue-800/60"
              }`}
            >
              {circle?.status === "FINALIZED"
                ? "FINALIZED"
                : openIssuesCount > 0
                ? `${openIssuesCount} Open Question(s)`
                : "All Issues Resolved"}
            </span>
          </div>
          <p className="text-xs text-neutral-400">
            {confirmations.length} of {acceptedMembers.length} members confirmed No issues. Circle finalizes when all members confirm.
          </p>
        </div>

        {/* Action Button */}
        {circle?.status === "FINALIZED" ? (
          <Link
            href={`/circles/${circleId}/autopay`}
            className="px-6 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl shadow-emerald-950 transition-all flex items-center gap-2"
          >
            <ShieldCheck className="h-4 w-4" />
            <span>Proceed to Autopay Setup</span>
          </Link>
        ) : (
          <button
            disabled={openIssuesCount > 0 || hasUserConfirmed}
            onClick={handleConfirmNoIssues}
            className={`px-6 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-xl ${
              openIssuesCount === 0 && !hasUserConfirmed
                ? "bg-white hover:bg-neutral-200 text-black cursor-pointer shadow-white/5"
                : hasUserConfirmed
                ? "bg-emerald-950/60 text-emerald-300 border border-emerald-800/50 cursor-default"
                : "bg-neutral-900 text-neutral-600 border border-neutral-800 cursor-not-allowed"
            }`}
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>{hasUserConfirmed ? "Confirmed: No Issues" : "Confirm No Issues"}</span>
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-950/60 border border-red-800/50 text-red-300 text-xs flex items-center gap-2.5">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {actionSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-800/50 text-emerald-300 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Form to Raise New Issue (Disabled if Finalized) */}
      {circle?.status !== "FINALIZED" && (
        <div className="rounded-3xl border border-neutral-900 bg-neutral-950 p-8 shadow-2xl space-y-6">
          <div className="border-b border-neutral-900 pb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
              <MessageSquare className="h-5 w-5 text-red-500" />
              <span>Raise a Term Dispute or Question</span>
            </h2>
            <p className="text-xs text-neutral-400 mt-1">Submit inquiries regarding circle parameters before finalization</p>
          </div>

          <form onSubmit={handleRaiseIssue} className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs uppercase tracking-wider font-bold text-neutral-300">
                  Topic Category
                </label>
                <select
                  value={category}
                  onChange={(e: any) => setCategory(e.target.value)}
                  className="w-full rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-xs text-white focus:outline-none focus:border-red-500 cursor-pointer"
                >
                  <option value="PEOPLE_COUNT">Number of Participants</option>
                  <option value="DURATION">Duration (Months)</option>
                  <option value="AMOUNT">Monthly Amount</option>
                  <option value="PEOPLE_JOINED">The People Joined</option>
                </select>
              </div>

              {category === "PEOPLE_JOINED" && (
                <div className="space-y-1.5">
                  <label className="block text-xs uppercase tracking-wider font-bold text-neutral-300">
                    Select Member
                  </label>
                  <select
                    value={targetMemberWallet}
                    onChange={(e) => setTargetMemberWallet(e.target.value)}
                    className="w-full rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-xs text-white focus:outline-none focus:border-red-500 cursor-pointer"
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

            <div className="space-y-1.5">
              <label className="block text-xs uppercase tracking-wider font-bold text-neutral-300">
                Detailed Concern (Required)
              </label>
              <textarea
                required
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="State your question or proposed adjustment clearly..."
                className="w-full rounded-2xl border border-neutral-800 bg-neutral-900 p-4 text-xs text-white focus:outline-none focus:border-red-500 placeholder:text-neutral-600"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 rounded-2xl bg-white hover:bg-neutral-200 text-black font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-white/5"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{isSubmitting ? "Submitting..." : "Submit Inquiry"}</span>
            </button>
          </form>
        </div>
      )}

      {/* Issues List */}
      <div className="space-y-6">
        <h3 className="text-xl font-bold text-white">Recorded Questions ({issues.length})</h3>

        {issues.length === 0 ? (
          <div className="p-12 text-center bg-neutral-950 rounded-3xl border border-neutral-900 text-neutral-500 text-xs">
            No issues or questions raised for this circle.
          </div>
        ) : (
          <div className="space-y-4">
            {issues.map((iss) => (
              <div key={iss.id} className="rounded-3xl border border-neutral-900 bg-neutral-950 p-6 space-y-4 shadow-xl">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="px-2.5 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-300 text-[10px] font-bold uppercase tracking-wider">
                      {iss.category.replace("_", " ")}
                    </span>
                    <span className="text-xs font-bold text-white font-mono">
                      @{iss.authorUsername}
                    </span>
                    {iss.targetMemberWallet && (
                      <span className="text-xs text-neutral-500 font-mono">
                        target: {iss.targetMemberWallet.slice(0, 6)}...
                      </span>
                    )}
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      iss.status === "RESOLVED"
                        ? "bg-emerald-950 text-emerald-300 border border-emerald-800/60"
                        : "bg-amber-950 text-amber-300 border border-amber-800/60"
                    }`}
                  >
                    {iss.status}
                  </span>
                </div>

                <p className="text-xs text-neutral-300 bg-neutral-900/80 rounded-2xl p-4 border border-neutral-800 leading-relaxed font-mono">
                  &ldquo;{iss.comment}&rdquo;
                </p>

                {/* Resolution Display or Resolution Input Box */}
                {iss.status === "RESOLVED" ? (
                  <div className="rounded-2xl bg-emerald-950/40 border border-emerald-800/40 p-4 text-xs text-emerald-300 space-y-1">
                    <p className="font-bold flex items-center gap-1.5 text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" />
                      Volunteer Resolution Response:
                    </p>
                    <p className="text-emerald-200 mt-1">{iss.resolutionResponse}</p>
                  </div>
                ) : isVolunteer ? (
                  <div className="space-y-2 border-t border-neutral-900 pt-4">
                    <label className="block text-[10px] uppercase tracking-wider font-bold text-neutral-400">
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
                        className="flex-1 rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-2.5 text-xs text-white focus:outline-none focus:border-red-500"
                      />
                      <button
                        onClick={() => handleResolveIssue(iss.id)}
                        className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition-all"
                      >
                        Resolve
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-amber-400/80 italic">
                    Waiting for volunteer to review and resolve...
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
