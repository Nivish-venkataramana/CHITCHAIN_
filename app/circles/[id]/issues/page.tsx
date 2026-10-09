"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useDevUser } from "@/components/providers";
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  MessageSquare,
  ShieldCheck,
  Send,
  AlertCircle,
  Clock,
  Sparkles,
  Users,
  Calendar,
  DollarSign,
  UserCheck,
} from "lucide-react";
import { IssueRecord, NoIssueConfirmationRecord } from "@/lib/circles-store";

interface CircleInfo {
  id: string;
  name: string;
  volunteerWallet: string;
  volunteerUsername?: string;
  numPeople: number;
  monthlyAmount: string;
  durationMonths: number;
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
  const router = useRouter();
  const { user } = useDevUser();

  const [circle, setCircle] = useState<CircleInfo | null>(null);
  const [issues, setIssues] = useState<IssueRecord[]>([]);
  const [confirmations, setConfirmations] = useState<NoIssueConfirmationRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // 4 Issue Categories requested by user
  const [category, setCategory] = useState<"PEOPLE_COUNT" | "DURATION" | "AMOUNT" | "PEOPLE_JOINED">("PEOPLE_COUNT");
  const [targetMemberWallet, setTargetMemberWallet] = useState<string>("");
  const [comment, setComment] = useState("");
  const [resolutionText, setResolutionText] = useState<{ [key: string]: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isActivating, setIsActivating] = useState(false);

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

  const isVolunteer = Boolean(
    circle && user &&
    ((user.username && circle.volunteerUsername && user.username.toLowerCase() === circle.volunteerUsername.toLowerCase()) ||
     (user.walletAddress && circle.volunteerWallet && user.walletAddress.toLowerCase() === circle.volunteerWallet.toLowerCase()))
  );

  const openIssues = issues.filter((i) => i.status === "OPEN");
  const openIssuesCount = openIssues.length;
  const acceptedMembers = circle?.invites.filter((i) => i.status === "ACCEPTED") || [];
  
  // Non-volunteer accepted members
  const nonVolunteerMembers = acceptedMembers.filter(
    (m) => circle && m.inviteeWallet.toLowerCase() !== circle.volunteerWallet.toLowerCase()
  );

  const hasUserConfirmed = Boolean(
    user && confirmations.some((c) => c.memberWallet.toLowerCase() === user.walletAddress.toLowerCase())
  );

  // Count non-volunteer confirmations
  const nonVolunteerConfirmations = nonVolunteerMembers.filter((m) =>
    confirmations.some((c) => c.memberWallet.toLowerCase() === m.inviteeWallet.toLowerCase())
  );

  const allMembersConfirmedNoIssues =
    nonVolunteerMembers.length > 0
      ? nonVolunteerConfirmations.length >= nonVolunteerMembers.length && openIssuesCount === 0
      : openIssuesCount === 0;

  const handleRaiseIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (isVolunteer) {
      setError("Volunteers cannot raise issues against their own circle parameters.");
      return;
    }
    if (!comment.trim()) {
      setError("Please write a comment describing your issue or concern.");
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
          targetMemberWallet: category === "PEOPLE_JOINED" ? (targetMemberWallet || null) : null,
          comment: comment.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit issue");
      }

      setActionSuccess("Issue submitted successfully for volunteer review. Previous 'No Issues' confirmations have been reset.");
      setComment("");
      setTargetMemberWallet("");
      loadData();
    } catch (err: any) {
      setError(err.message || "Failed to submit issue");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolveIssue = async (issueId: string) => {
    const resp = resolutionText[issueId]?.trim();
    if (!resp) {
      setError("Please provide a resolution note before resolving.");
      return;
    }

    setError(null);
    setActionSuccess(null);

    try {
      const res = await fetch(`/api/circles/${circleId}/issues/${issueId}/resolve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-dev-user": user?.username || "",
        },
        body: JSON.stringify({ resolutionResponse: resp }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to resolve issue");
      }

      setActionSuccess("Issue marked as resolved!");
      loadData();
    } catch (err: any) {
      setError(err.message || "Failed to resolve issue");
    }
  };

  const handleConfirmNoIssues = async () => {
    if (!user) return;
    if (openIssuesCount > 0) {
      setError("Cannot submit 'No Issues' while open issues remain unresolved.");
      return;
    }
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

      setActionSuccess("Your 'No Issues' confirmation was successfully recorded!");
      loadData();
    } catch (err: any) {
      setError(err.message || "Failed to confirm No issues");
    }
  };

  const handleActivateCircle = async () => {
    if (!user || !isVolunteer) return;
    if (!allMembersConfirmedNoIssues) {
      setError("The activation of the circle can only be done when all members have submitted no issues.");
      return;
    }

    setIsActivating(true);
    setError(null);
    setActionSuccess(null);

    try {
      const res = await fetch(`/api/circles/${circleId}/activate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-dev-user": user.username,
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to activate circle");
      }

      setActionSuccess("Circle successfully ACTIVATED! Autopay mandate requests have been dispatched to all wallets.");
      loadData();
    } catch (err: any) {
      setError(err.message || "Failed to activate circle");
    } finally {
      setIsActivating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="p-8 text-center text-xs font-mono text-neutral-400 bg-transparent animate-pulse">
          Loading terms review & issues...
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 flex flex-col text-neutral-100 gap-6 py-4 overflow-y-auto min-h-0 flex-1">
      {/* Main Container with Outer Curved Border and Inner Divider Lines */}
      <div className="w-full rounded-2xl border border-white/20 p-6 sm:p-8 flex flex-col gap-6 bg-transparent">
        {/* Header Banner - Top Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/15 shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Terms Review & Issues</h1>
          </div>

          {/* Action Button Header */}
          <div className="flex items-center gap-2.5">
            {circle?.status === "FINALIZED" ? (
              <Link
                href={`/circles/${circleId}/autopay`}
                className="px-5 py-2.5 rounded-xl bg-white text-black font-semibold text-xs flex items-center gap-2 hover:bg-neutral-200 transition-colors"
              >
                <ShieldCheck className="h-4 w-4" />
                <span>Proceed to Autopay Setup</span>
              </Link>
            ) : !isVolunteer ? (
              <button
                disabled={openIssuesCount > 0 || hasUserConfirmed}
                onClick={handleConfirmNoIssues}
                className={`px-5 py-2.5 rounded-xl font-semibold text-xs flex items-center gap-2 transition-colors cursor-pointer ${
                  openIssuesCount === 0 && !hasUserConfirmed
                    ? "bg-white text-black hover:bg-neutral-200"
                    : hasUserConfirmed
                    ? "text-emerald-400 cursor-default"
                    : "text-neutral-500 cursor-not-allowed"
                }`}
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>{hasUserConfirmed ? "Confirmed: No Issues" : "Submit No Issues"}</span>
              </button>
            ) : null}
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl text-red-300 text-xs flex items-center gap-2.5 shrink-0">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {actionSuccess && (
          <div className="p-3 rounded-xl text-emerald-300 text-xs flex items-center gap-2.5 shrink-0">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* Symmetrical 2-Column Area with vertical divider */}
        <div className="grid md:grid-cols-2 md:divide-x divide-white/15 gap-8 flex-1 min-h-0 pt-2">
          {/* Left Column: Member Issue Submission or Volunteer Status Panel */}
          <div className="flex flex-col justify-between h-full min-h-[24rem] space-y-4 md:pr-4">
            <div className="shrink-0 pb-1">
              <h2 className="text-base font-bold text-white">
                {circle?.status === "FINALIZED"
                  ? "Circle Activated"
                  : isVolunteer
                  ? "Status"
                  : "Raise Issue on Circle Terms"}
              </h2>
            </div>

            {circle?.status === "FINALIZED" ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-4">
                <div className="h-14 w-14 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="h-7 w-7 text-emerald-400" />
                </div>
                <div className="space-y-1.5 max-w-sm">
                  <h3 className="text-base font-bold text-white">Circle is Activated</h3>
                  <p className="text-sm text-neutral-400 font-mono">
                    All privileges are decentralized. Edit and delete permissions have been revoked. Proceed to Autopay.
                  </p>
                </div>
                <Link
                  href={`/circles/${circleId}/autopay`}
                  className="px-5 py-2.5 rounded-xl bg-white text-black font-semibold text-xs flex items-center gap-2 hover:bg-neutral-200 transition-colors"
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>Go to Autopay</span>
                </Link>
              </div>
            ) : isVolunteer ? (
              <div className="flex-1 flex flex-col justify-between min-h-0 space-y-4">
                <div className="space-y-4 overflow-y-auto no-scrollbar pr-1">
                  {/* Status Metrics List */}
                  <div className="space-y-3 p-1 font-mono text-sm">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                      <span className="text-neutral-400">Issues Raised:</span>
                      <span className="font-semibold text-white">{issues.length}</span>
                    </div>

                    <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                      <span className="text-neutral-400">Issues Resolved:</span>
                      <span className={openIssuesCount === 0 && issues.length > 0 ? "text-emerald-400 font-semibold" : "font-semibold text-white"}>
                        {issues.filter((i) => i.status === "RESOLVED").length} / {issues.length}
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                      <span className="text-neutral-400">Confirmations:</span>
                      <span className={nonVolunteerConfirmations.length >= nonVolunteerMembers.length ? "text-emerald-400 font-semibold" : "font-semibold text-white"}>
                        {nonVolunteerConfirmations.length} / {nonVolunteerMembers.length}
                      </span>
                    </div>
                  </div>

                  {/* Member Confirmations Roster */}
                  <div className="space-y-2 pt-2">
                    <span className="text-xs uppercase font-mono tracking-wider text-neutral-500 block font-semibold">
                      Member Confirmations
                    </span>
                    <div className="space-y-1.5">
                      {nonVolunteerMembers.map((m) => {
                        const confirmed = confirmations.some(
                          (c) => c.memberWallet.toLowerCase() === m.inviteeWallet.toLowerCase()
                        );
                        return (
                          <div
                            key={m.inviteeWallet}
                            className="flex items-center justify-between text-xs font-mono py-1.5 border-b border-white/5"
                          >
                            <span className="text-neutral-200">@{m.inviteeUsername}</span>
                            <span className={confirmed ? "text-emerald-400 flex items-center gap-1.5" : "text-neutral-500 flex items-center gap-1.5"}>
                              {confirmed ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                              {confirmed ? "Confirmed" : "Pending"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* When all confirmations are in, show Activate Circle button */}
                {allMembersConfirmedNoIssues && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleActivateCircle}
                      disabled={isActivating}
                      className="w-full py-3 rounded-xl bg-white text-black hover:bg-neutral-200 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md"
                    >
                      <Sparkles className="h-4 w-4" />
                      <span>{isActivating ? "Activating Circle..." : "Activate Circle"}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleRaiseIssue} className="flex-1 flex flex-col justify-between min-h-0 space-y-4">
                <div className="space-y-3.5 overflow-y-auto no-scrollbar pr-1">
                  {/* 4 Topic Categories without extra heading */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCategory("PEOPLE_COUNT")}
                      className={`p-3 rounded-xl text-left text-xs transition-all flex items-center gap-2 cursor-pointer ${
                        category === "PEOPLE_COUNT"
                          ? "bg-white text-black font-semibold"
                          : "text-neutral-400 hover:text-white"
                      }`}
                    >
                      <Users className="h-4 w-4 shrink-0" />
                      <span className="truncate">Number of People</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCategory("DURATION")}
                      className={`p-3 rounded-xl text-left text-xs transition-all flex items-center gap-2 cursor-pointer ${
                        category === "DURATION"
                          ? "bg-white text-black font-semibold"
                          : "text-neutral-400 hover:text-white"
                      }`}
                    >
                      <Calendar className="h-4 w-4 shrink-0" />
                      <span className="truncate">Duration</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCategory("AMOUNT")}
                      className={`p-3 rounded-xl text-left text-xs transition-all flex items-center gap-2 cursor-pointer ${
                        category === "AMOUNT"
                          ? "bg-white text-black font-semibold"
                          : "text-neutral-400 hover:text-white"
                      }`}
                    >
                      <DollarSign className="h-4 w-4 shrink-0" />
                      <span className="truncate">Amount / Month</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setCategory("PEOPLE_JOINED");
                        const others = acceptedMembers.filter((m) => {
                          const isSelf =
                            (user?.username && m.inviteeUsername.toLowerCase() === user.username.toLowerCase()) ||
                            (user?.walletAddress && m.inviteeWallet.toLowerCase() === user.walletAddress.toLowerCase());
                          return !isSelf;
                        });
                        if (!targetMemberWallet && others.length > 0) {
                          setTargetMemberWallet(others[0].inviteeWallet);
                        }
                      }}
                      className={`p-3 rounded-xl text-left text-xs transition-all flex items-center gap-2 cursor-pointer ${
                        category === "PEOPLE_JOINED"
                          ? "bg-white text-black font-semibold"
                          : "text-neutral-400 hover:text-white"
                      }`}
                    >
                      <UserCheck className="h-4 w-4 shrink-0" />
                      <span className="truncate">Individuals in Circle</span>
                    </button>
                  </div>

                  {category === "PEOPLE_JOINED" && (
                    <div className="relative h-14 border-b border-white/20 focus-within:border-white transition-colors mt-2">
                      {(() => {
                        const otherMembers = acceptedMembers.filter((m) => {
                          const isSelf =
                            (user?.username && m.inviteeUsername.toLowerCase() === user.username.toLowerCase()) ||
                            (user?.walletAddress && m.inviteeWallet.toLowerCase() === user.walletAddress.toLowerCase());
                          return !isSelf;
                        });

                        return (
                          <select
                            id="target-member"
                            value={targetMemberWallet || (otherMembers[0]?.inviteeWallet || "")}
                            onChange={(e) => setTargetMemberWallet(e.target.value)}
                            className="w-full h-full bg-transparent border-none outline-none pt-4 pb-1 text-xs sm:text-sm text-white focus:outline-none font-mono transition-colors cursor-pointer"
                          >
                            {otherMembers.map((m) => (
                              <option key={m.inviteeWallet} value={m.inviteeWallet} className="bg-black text-white">
                                @{m.inviteeUsername} ({m.inviteeWallet.slice(0, 6)}...{m.inviteeWallet.slice(-4)})
                              </option>
                            ))}
                          </select>
                        );
                      })()}
                      <label
                        htmlFor="target-member"
                        className="absolute left-0 top-0 text-[11px] font-semibold text-neutral-400 pointer-events-none"
                      >
                        Select Individual
                      </label>
                    </div>
                  )}

                  <div className="relative h-14 border-b border-white/20 focus-within:border-white transition-colors mt-2">
                    <input
                      type="text"
                      id="issue-comment"
                      required
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder=" "
                      className="peer w-full h-full bg-transparent border-none outline-none pt-4 pb-1 text-xs sm:text-sm text-white font-mono placeholder-transparent"
                    />
                    <label
                      htmlFor="issue-comment"
                      className="absolute left-0 top-4 text-xs sm:text-sm text-neutral-400 pointer-events-none transition-all duration-200 origin-[0] peer-focus:top-0 peer-focus:text-[11px] peer-focus:text-white peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:text-neutral-400"
                    >
                      Comment / Question
                    </label>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 rounded-xl bg-white text-black font-semibold text-xs hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>{isSubmitting ? "Submitting..." : "Submit Issue"}</span>
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Right Column: Recorded Inquiries & Resolutions */}
          <div className="flex flex-col h-full min-h-[24rem] space-y-4 md:pl-8">
            <div className="shrink-0 pb-1">
              <h3 className="text-base font-bold text-white flex items-center gap-2.5">
                <AlertTriangle className="h-5 w-5 text-neutral-300" />
                <span>Recorded Inquiries ({issues.length})</span>
              </h3>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-3 pr-1">
              {issues.length === 0 ? (
                <div className="p-8 text-center text-sm text-neutral-500 font-mono">
                  No inquiries raised. All terms agreed.
                </div>
              ) : (
                issues.map((iss) => (
                  <div key={iss.id} className="py-3 border-b border-white/10 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-mono uppercase tracking-wider text-neutral-300">
                          {iss.category === "PEOPLE_COUNT"
                            ? "Number of People"
                            : iss.category === "DURATION"
                            ? "Duration"
                            : iss.category === "AMOUNT"
                            ? "Amount / Month"
                            : "Individuals"}
                        </span>
                        <span className="text-xs font-semibold text-white font-mono">@{iss.authorUsername}</span>
                      </div>

                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-mono uppercase tracking-wider ${
                          iss.status === "RESOLVED"
                            ? "text-emerald-400"
                            : "text-amber-400"
                        }`}
                      >
                        {iss.status}
                      </span>
                    </div>

                    <p className="text-xs text-neutral-300 font-mono leading-relaxed">
                      &ldquo;{iss.comment}&rdquo;
                    </p>

                    {iss.status === "RESOLVED" ? (
                      <div className="p-3 text-xs text-emerald-300 space-y-1">
                        <p className="font-semibold text-emerald-400 flex items-center gap-1.5 text-xs">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Volunteer Resolution:
                        </p>
                        <p className="text-emerald-200 font-mono">{iss.resolutionResponse}</p>
                      </div>
                    ) : isVolunteer && circle?.status !== "FINALIZED" ? (
                      <div className="space-y-2 pt-2">
                        <div className="flex gap-2 items-center">
                          <input
                            type="text"
                            placeholder="Write resolution response..."
                            value={resolutionText[iss.id] || ""}
                            onChange={(e) =>
                              setResolutionText({ ...resolutionText, [iss.id]: e.target.value })
                            }
                            className="flex-1 bg-transparent border-0 border-b border-white/20 pb-1.5 pt-1 text-xs text-white focus:border-white focus:outline-none font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => handleResolveIssue(iss.id)}
                            className="px-4 py-1.5 rounded-xl bg-white text-black font-semibold text-xs hover:bg-neutral-200 transition-colors cursor-pointer flex items-center gap-1.5"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Issue Resolved</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-amber-400/80 font-mono italic">
                        Awaiting volunteer review and resolution...
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
