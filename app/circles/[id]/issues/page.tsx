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
    user && confirmations.some((c) =>
      (user.walletAddress && c.memberWallet.toLowerCase() === user.walletAddress.toLowerCase()) ||
      (user.username && c.memberWallet.toLowerCase() === user.username.toLowerCase())
    )
  );

  // Count non-volunteer confirmations
  const nonVolunteerConfirmations = nonVolunteerMembers.filter((m) =>
    confirmations.some((c) =>
      c.memberWallet.toLowerCase() === m.inviteeWallet.toLowerCase() ||
      (m.inviteeUsername && c.memberWallet.toLowerCase() === m.inviteeUsername.toLowerCase())
    )
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
          "x-dev-wallet": user.walletAddress,
        },
        body: JSON.stringify({
          category,
          targetMemberWallet: category === "PEOPLE_JOINED" ? (targetMemberWallet || null) : null,
          comment: comment.trim(),
          walletAddress: user.walletAddress,
          username: user.username,
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
          "x-dev-wallet": user?.walletAddress || "",
        },
        body: JSON.stringify({
          resolutionResponse: resp,
          walletAddress: user?.walletAddress,
          username: user?.username,
        }),
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
    setIsSubmitting(true);
    setError(null);
    setActionSuccess(null);

    try {
      const res = await fetch(`/api/circles/${circleId}/no-issues`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-dev-user": user.username,
          "x-dev-wallet": user.walletAddress,
        },
        body: JSON.stringify({
          walletAddress: user.walletAddress,
          username: user.username,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to confirm No issues");
      }

      setActionSuccess("Your 'No Issues' confirmation was successfully recorded!");
      loadData();
    } catch (err: any) {
      setError(err.message || "Failed to confirm No issues");
    } finally {
      setIsSubmitting(false);
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
          "x-dev-wallet": user.walletAddress,
        },
        body: JSON.stringify({
          walletAddress: user.walletAddress,
          username: user.username,
        }),
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
        <div className="p-8 text-center text-xs font-mono text-neutral-400 rounded-3xl border border-white/10 bg-transparent">
          Loading issue stage...
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-2 sm:px-4 flex flex-col justify-between h-[calc(100vh-5.5rem)] max-h-[calc(100vh-5.5rem)] text-neutral-100 gap-3">
      {/* Top Bar */}
      <div className="flex items-center justify-between shrink-0">
        <Link
          href={`/circles/${circleId}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Return to Circle</span>
        </Link>
      </div>

      {/* Header Banner - Transparent with light white tint */}
      <div className="rounded-2xl border border-white/10 bg-transparent p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0 shadow-lg">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Terms Review & Issues</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider border border-white/20 text-neutral-200">
              {circle?.status === "FINALIZED"
                ? "ACTIVATED & FINALIZED"
                : openIssuesCount > 0
                ? `${openIssuesCount} Open Question(s)`
                : allMembersConfirmedNoIssues
                ? "Ready for Activation"
                : "Awaiting Member Confirmations"}
            </span>
          </div>
          <p className="text-[11px] text-neutral-400">
            {nonVolunteerConfirmations.length} of {nonVolunteerMembers.length} member(s) confirmed No Issues.{" "}
            {circle?.status === "FINALIZED"
              ? "Circle is active and under decentralized protocol rules."
              : "Volunteer can activate once all members submit No Issues."}
          </p>
        </div>

        {/* Action Button Header */}
        <div className="flex items-center gap-2">
          {circle?.status === "FINALIZED" ? (
            <Link
              href={`/circles/${circleId}/autopay`}
              className="px-4 py-2 rounded-xl bg-white text-black font-semibold text-xs flex items-center gap-1.5 hover:bg-neutral-200 transition-colors shadow-md"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Proceed to Autopay Setup</span>
            </Link>
          ) : isVolunteer ? (
            <button
              onClick={handleActivateCircle}
              disabled={!allMembersConfirmedNoIssues || isActivating}
              className={`px-4 py-2 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                allMembersConfirmedNoIssues
                  ? "bg-white text-black hover:bg-neutral-200 shadow-md"
                  : "border border-white/10 bg-white/[0.03] text-neutral-500 cursor-not-allowed"
              }`}
              title={
                !allMembersConfirmedNoIssues
                  ? "Activation can only be done when all members submit No Issues and 0 open issues remain"
                  : "Activate Circle"
              }
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>{isActivating ? "Activating..." : "Activate Circle"}</span>
            </button>
          ) : (
            <button
              disabled={openIssuesCount > 0 || hasUserConfirmed || isSubmitting}
              onClick={handleConfirmNoIssues}
              className={`px-4 py-2 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                openIssuesCount === 0 && !hasUserConfirmed
                  ? "bg-white text-black hover:bg-neutral-200 shadow-md"
                  : hasUserConfirmed
                  ? "border border-emerald-500/40 text-emerald-400 bg-emerald-950/20 cursor-default"
                  : "border border-white/10 bg-white/[0.03] text-neutral-500 cursor-not-allowed"
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>
                {isSubmitting
                  ? "Confirming..."
                  : hasUserConfirmed
                  ? "Confirmed: No Issues"
                  : "Submit No Issues"}
              </span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-2.5 rounded-xl border border-red-900/60 bg-red-950/40 text-red-300 text-xs flex items-center gap-2 shrink-0">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {actionSuccess && (
        <div className="p-2.5 rounded-xl border border-emerald-900/60 bg-emerald-950/40 text-emerald-300 text-xs flex items-center gap-2 shrink-0">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Symmetrical 2-Column Area: Left (Raise Issue / Volunteer Controls) & Right (Recorded Inquiries) */}
      <div className="grid md:grid-cols-2 gap-3.5 flex-1 min-h-0">
        {/* Left Column: Member Issue Submission or Volunteer Panel */}
        <div className="rounded-2xl border border-white/10 bg-transparent p-4 flex flex-col justify-between h-full min-h-0 shadow-xl space-y-3">
          <div className="border-b border-white/10 pb-2.5 shrink-0">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-neutral-300" />
              <span>
                {circle?.status === "FINALIZED"
                  ? "Circle Activated"
                  : isVolunteer
                  ? "Volunteer Activation Controls"
                  : "Raise Issue on Circle Terms"}
              </span>
            </h2>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              {circle?.status === "FINALIZED"
                ? "All parameters locked. Autopay mandates are being collected."
                : isVolunteer
                ? "Review and resolve member questions. Activate circle when all confirm No Issues."
                : "Submit concerns regarding the 4 core parameters before circle activation."}
            </p>
          </div>

          {circle?.status === "FINALIZED" ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-4 space-y-3">
              <div className="h-12 w-12 rounded-full border border-emerald-500/40 bg-emerald-950/30 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-emerald-400" />
              </div>
              <div className="space-y-1 max-w-sm">
                <h3 className="text-sm font-bold text-white">Circle is Activated</h3>
                <p className="text-xs text-neutral-400 font-mono">
                  All privileges are decentralized. Edit and delete permissions have been revoked. Proceed to Autopay.
                </p>
              </div>
              <Link
                href={`/circles/${circleId}/autopay`}
                className="px-4 py-2 rounded-xl bg-white text-black font-semibold text-xs flex items-center gap-1.5 hover:bg-neutral-200 transition-colors shadow-md"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Go to Autopay</span>
              </Link>
            </div>
          ) : isVolunteer ? (
            <div className="flex-1 flex flex-col justify-between min-h-0 space-y-3">
              <div className="space-y-3 overflow-y-auto no-scrollbar pr-1">
                <div className="p-3 rounded-xl border border-white/10 bg-white/[0.02] space-y-2">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-400 block font-semibold">
                    Activation Criteria Checklist
                  </span>
                  <div className="space-y-1.5 text-xs font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-300">Open Inquiries:</span>
                      <span className={openIssuesCount === 0 ? "text-emerald-400" : "text-amber-400"}>
                        {openIssuesCount === 0 ? "0 (All Resolved)" : `${openIssuesCount} Pending`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-300">Member 'No Issues':</span>
                      <span
                        className={
                          nonVolunteerConfirmations.length >= nonVolunteerMembers.length
                            ? "text-emerald-400"
                            : "text-neutral-400"
                        }
                      >
                        {nonVolunteerConfirmations.length} / {nonVolunteerMembers.length} Confirmed
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-white/10 bg-white/[0.02] space-y-2">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-400 block font-semibold">
                    Member Confirmations Roster
                  </span>
                  <div className="space-y-1.5">
                    {nonVolunteerMembers.map((m) => {
                      const confirmed = confirmations.some(
                        (c) =>
                          c.memberWallet.toLowerCase() === m.inviteeWallet.toLowerCase() ||
                          (m.inviteeUsername && c.memberWallet.toLowerCase() === m.inviteeUsername.toLowerCase())
                      );
                      return (
                        <div
                          key={m.inviteeWallet}
                          className="flex items-center justify-between text-xs font-mono py-1 border-b border-white/5 last:border-0"
                        >
                          <span className="text-white">@{m.inviteeUsername}</span>
                          <span className={confirmed ? "text-emerald-400 flex items-center gap-1" : "text-neutral-500 flex items-center gap-1"}>
                            {confirmed ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                            {confirmed ? "No Issues" : "Pending"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={handleActivateCircle}
                  disabled={!allMembersConfirmedNoIssues || isActivating}
                  className={`w-full py-2.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                    allMembersConfirmedNoIssues
                      ? "bg-white text-black hover:bg-neutral-200 shadow-md"
                      : "border border-white/10 bg-white/[0.03] text-neutral-500 cursor-not-allowed"
                  }`}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>
                    {isActivating
                      ? "Activating Circle..."
                      : allMembersConfirmedNoIssues
                      ? "Activate Circle Now"
                      : `Awaiting Member Confirmations (${nonVolunteerConfirmations.length}/${nonVolunteerMembers.length})`}
                  </span>
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleRaiseIssue} className="flex-1 flex flex-col justify-between min-h-0 space-y-3">
              <div className="space-y-3 overflow-y-auto no-scrollbar pr-1">
                {/* 4 Topic Categories Requested by User */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-neutral-300">
                    Topic Category (Choose from 4)
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCategory("PEOPLE_COUNT")}
                      className={`p-2 rounded-xl border text-left text-xs transition-all flex items-center gap-2 cursor-pointer ${
                        category === "PEOPLE_COUNT"
                          ? "border-white bg-white/10 text-white font-semibold"
                          : "border-white/10 bg-white/[0.02] text-neutral-400 hover:border-white/20"
                      }`}
                    >
                      <Users className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">Number of People</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCategory("DURATION")}
                      className={`p-2 rounded-xl border text-left text-xs transition-all flex items-center gap-2 cursor-pointer ${
                        category === "DURATION"
                          ? "border-white bg-white/10 text-white font-semibold"
                          : "border-white/10 bg-white/[0.02] text-neutral-400 hover:border-white/20"
                      }`}
                    >
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">Duration</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCategory("AMOUNT")}
                      className={`p-2 rounded-xl border text-left text-xs transition-all flex items-center gap-2 cursor-pointer ${
                        category === "AMOUNT"
                          ? "border-white bg-white/10 text-white font-semibold"
                          : "border-white/10 bg-white/[0.02] text-neutral-400 hover:border-white/20"
                      }`}
                    >
                      <DollarSign className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">Amount / Month</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCategory("PEOPLE_JOINED")}
                      className={`p-2 rounded-xl border text-left text-xs transition-all flex items-center gap-2 cursor-pointer ${
                        category === "PEOPLE_JOINED"
                          ? "border-white bg-white/10 text-white font-semibold"
                          : "border-white/10 bg-white/[0.02] text-neutral-400 hover:border-white/20"
                      }`}
                    >
                      <UserCheck className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">Individuals in Circle</span>
                    </button>
                  </div>
                </div>

                {category === "PEOPLE_JOINED" && (
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-neutral-300">
                      Select Individual (Optional)
                    </label>
                    <select
                      value={targetMemberWallet}
                      onChange={(e) => setTargetMemberWallet(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-white/10 bg-white/[0.03] text-white focus:outline-none focus:border-white/30 font-mono transition-colors cursor-pointer"
                    >
                      <option value="" className="bg-neutral-900 text-white">General / All Individuals</option>
                      {acceptedMembers.map((m) => (
                        <option key={m.inviteeWallet} value={m.inviteeWallet} className="bg-neutral-900 text-white">
                          @{m.inviteeUsername} ({m.inviteeWallet.slice(0, 6)}...{m.inviteeWallet.slice(-4)})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-neutral-300">
                    Comment / Question
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Describe your issue or suggestion in detail..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-white/10 bg-white/[0.03] text-white focus:outline-none focus:border-white/30 placeholder:text-neutral-500 font-mono transition-colors resize-none"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-white/10 flex gap-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-white text-black font-semibold text-xs hover:bg-neutral-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Send className="h-3 w-3" />
                  <span>{isSubmitting ? "Submitting..." : "Submit Issue"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleConfirmNoIssues}
                  disabled={openIssuesCount > 0 || hasUserConfirmed || isSubmitting}
                  className={`px-4 py-2.5 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                    openIssuesCount === 0 && !hasUserConfirmed
                      ? "border border-white/20 bg-white/10 text-white hover:bg-white/20"
                      : hasUserConfirmed
                      ? "border border-emerald-500/40 text-emerald-400 bg-emerald-950/20 cursor-default"
                      : "border border-white/10 bg-white/[0.02] text-neutral-500 cursor-not-allowed"
                  }`}
                  title={openIssuesCount > 0 ? "Resolve open issues first" : "Submit No Issues"}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>
                    {isSubmitting
                      ? "Confirming..."
                      : hasUserConfirmed
                      ? "No Issues Confirmed"
                      : "Submit No Issues"}
                  </span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Right Column: Recorded Inquiries & Resolutions */}
        <div className="rounded-2xl border border-white/10 bg-transparent p-4 flex flex-col h-full min-h-0 shadow-xl space-y-3">
          <div className="border-b border-white/10 pb-2.5 shrink-0">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-neutral-300" />
              <span>Recorded Inquiries ({issues.length})</span>
            </h3>
            <p className="text-[11px] text-neutral-400 mt-0.5">Status of all participant questions & volunteer resolutions</p>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-2.5 pr-1">
            {issues.length === 0 ? (
              <div className="p-8 text-center text-xs text-neutral-500 font-mono border border-white/10 rounded-xl bg-transparent">
                No inquiries raised. All terms agreed.
              </div>
            ) : (
              issues.map((iss) => (
                <div key={iss.id} className="p-3 rounded-xl border border-white/10 bg-white/[0.02] space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider border border-white/20 text-neutral-300">
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
                      className={`px-2 py-0.5 rounded-full text-[9px] font-mono uppercase tracking-wider border ${
                        iss.status === "RESOLVED"
                          ? "border-emerald-500/40 text-emerald-400 bg-emerald-950/20"
                          : "border-amber-500/40 text-amber-400 bg-amber-950/20"
                      }`}
                    >
                      {iss.status}
                    </span>
                  </div>

                  <p className="text-[11px] text-neutral-300 font-mono leading-relaxed">
                    &ldquo;{iss.comment}&rdquo;
                  </p>

                  {iss.status === "RESOLVED" ? (
                    <div className="p-2 rounded-lg border border-emerald-500/30 bg-emerald-950/20 text-[11px] text-emerald-300 space-y-0.5">
                      <p className="font-semibold text-emerald-400 flex items-center gap-1 text-[10px]">
                        <CheckCircle2 className="h-3 w-3" />
                        Volunteer Resolution:
                      </p>
                      <p className="text-emerald-200 font-mono">{iss.resolutionResponse}</p>
                    </div>
                  ) : isVolunteer && circle?.status !== "FINALIZED" ? (
                    <div className="space-y-1.5 pt-1.5 border-t border-white/10">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Write resolution response..."
                          value={resolutionText[iss.id] || ""}
                          onChange={(e) =>
                            setResolutionText({ ...resolutionText, [iss.id]: e.target.value })
                          }
                          className="flex-1 px-2.5 py-1 text-xs rounded-lg border border-white/10 bg-white/[0.03] text-white focus:outline-none focus:border-white/30 font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => handleResolveIssue(iss.id)}
                          className="px-3 py-1 rounded-lg bg-white text-black font-semibold text-xs hover:bg-neutral-200 transition-colors cursor-pointer"
                        >
                          Resolve
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[10px] text-amber-400/80 font-mono italic">
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
  );
}
