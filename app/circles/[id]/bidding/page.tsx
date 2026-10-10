"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useDevUser } from "@/components/providers";
import {
  ArrowLeft,
  Lock,
  Unlock,
  Trophy,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Users,
  Coins,
  ArrowRight,
  ShieldCheck,
  Play,
  Calendar,
  X,
  Layers,
  ExternalLink,
} from "lucide-react";
import { generateSecureSalt, deriveDemoSalt } from "@/lib/bidding-store";

const PROTOCOL_VAULT_ADDRESS = "0x33dD04441C48D92B71dA84DFa1bf61538C562651";

interface BidInfo {
  memberWallet: string;
  memberUsername: string;
  commitment: string;
  amount?: string;
  salt?: string;
  revealed: boolean;
  committedAt?: number;
}

interface BiddingState {
  circleId: string;
  cycle: number;
  phase: "Commit" | "Reveal" | "Settled";
  totalPool: string;
  floorBid: string;
  capacity?: number;
  durationMonths?: number;
  monthlyAmount?: string;
  bids: BidInfo[];
  winner: {
    wallet: string;
    username: string;
    amount: string;
    dividend: string;
  } | null;
}

interface CircleDetails {
  id: string;
  name: string;
  volunteerWallet: string;
  volunteerUsername?: string;
  numPeople: number;
  monthlyAmount: string;
  durationMonths: number;
  status: "INVITING" | "ISSUE_STAGE" | "FINALIZED";
  vaultAddress?: string | null;
  invites: Array<{
    id: string;
    inviteeWallet: string;
    inviteeUsername: string;
    status: "PENDING" | "ACCEPTED" | "REJECTED";
    balanceAtCheck: string;
    createdAt: string;
  }>;
}

interface ParticipantInfo {
  username: string;
  displayName: string;
  wallet: string;
  targetBid: string;
  isVolunteer?: boolean;
}

interface MonthSimulation {
  month: number;
  potAmount: string;
  floorAmount: string;
  winnerUsername: string;
  winnerDisplayName: string;
  winnerWallet: string;
  winningBid: string;
  dividend: string;
  dividendPerMember: string;
  bids: Array<{
    username: string;
    displayName: string;
    wallet: string;
    amount: string;
    isWinner: boolean;
    note?: string;
  }>;
}

// Fallback pool of sample members if circle invites are fewer than capacity
const FALLBACK_MEMBERS = [
  { username: "asharao01", displayName: "Asha Rao", wallet: "0x1111111111111111111111111111111111111111" },
  { username: "vikramnair02", displayName: "Vikram Nair", wallet: "0x2222222222222222222222222222222222222222" },
  { username: "meerajoshi03", displayName: "Meera Joshi", wallet: "0x3333333333333333333333333333333333333333" },
  { username: "rohandas04", displayName: "Rohan Das", wallet: "0x4444444444444444444444444444444444444444" },
  { username: "arjunpatel06", displayName: "Arjun Patel", wallet: "0x5555555555555555555555555555555555555555" },
];

function parseUSDC(val: string | number | undefined | null): number {
  if (val === undefined || val === null || val === "") return 1000;
  const str = String(val).trim().replace(/,/g, "");
  const num = parseFloat(str);
  if (isNaN(num)) return 1000;
  if (num >= 100_000 && !str.includes(".")) {
    return num / 1_000_000;
  }
  return num;
}

function formatUSDC(val: string | number | undefined | null): string {
  if (val === undefined || val === null || val === "" || val === "—") return "—";
  try {
    const str = String(val).trim().replace(/,/g, "");
    const num = parseFloat(str);
    if (isNaN(num)) return String(val);
    if (num >= 100_000 && !str.includes(".")) {
      return (num / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 2 });
    }
    return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
  } catch {
    return String(val);
  }
}

export default function BiddingModulePage() {
  const params = useParams();
  const circleId = (params?.id as string) || "";
  const { user, setUser } = useDevUser();

  const [circle, setCircle] = useState<CircleDetails | null>(null);
  const [state, setState] = useState<BiddingState | null>(null);
  const [loading, setLoading] = useState(true);
  const [bidAmount, setBidAmount] = useState<string>("3800");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Full Timeperiod Simulation Modal state
  const [showSimModal, setShowSimModal] = useState(false);
  const [selectedMonthTab, setSelectedMonthTab] = useState<number>(1);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);

  // Load Circle details & Bidding state safely
  const loadCircleAndBidding = useCallback(() => {
    if (!circleId) return;
    Promise.allSettled([
      fetch(`/api/circles/${encodeURIComponent(circleId)}`).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/circles/${encodeURIComponent(circleId)}/bidding`, {
        headers: user?.username ? { "x-dev-user": user.username } : undefined,
      }).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([circleRes, biddingRes]) => {
        if (circleRes.status === "fulfilled" && circleRes.value && !circleRes.value.error) {
          setCircle(circleRes.value);
        }
        if (biddingRes.status === "fulfilled" && biddingRes.value && !biddingRes.value.error) {
          setState(biddingRes.value);
        }
      })
      .catch((err) => console.error("Error loading circle & bidding state:", err))
      .finally(() => setLoading(false));
  }, [circleId, user?.username]);

  useEffect(() => {
    loadCircleAndBidding();
  }, [loadCircleAndBidding]);

  // Derived Circle parameters
  const capacity = Math.max(2, circle?.numPeople || state?.capacity || 4);
  const monthlyAmountNum = circle?.monthlyAmount
    ? parseUSDC(circle.monthlyAmount)
    : state?.monthlyAmount
    ? parseUSDC(state.monthlyAmount)
    : 1000;
  const durationMonths = Math.max(1, circle?.durationMonths || state?.durationMonths || 3);
  const totalPotNum = capacity * monthlyAmountNum;
  const floorBidNum = Math.floor(totalPotNum / 2);
  const reserve3xNum = 3 * monthlyAmountNum;

  // Build the dynamic Participant Board from the circle's actual members
  const participants = useMemo<ParticipantInfo[]>(() => {
    const list: ParticipantInfo[] = [];
    const seenUsernames = new Set<string>();

    // 1. Volunteer
    if (circle?.volunteerUsername || circle?.volunteerWallet) {
      const vUser = (circle.volunteerUsername || "volunteer").replace(/^@/, "");
      seenUsernames.add(vUser.toLowerCase());
      const vWallet = circle.volunteerWallet || PROTOCOL_VAULT_ADDRESS;
      list.push({
        username: vUser,
        displayName: `${vUser} (Volunteer)`,
        wallet: vWallet,
        targetBid: String(Math.max(floorBidNum, Math.round(totalPotNum * 0.95))),
        isVolunteer: true,
      });
    }

    // 2. Invites from circle
    if (circle?.invites && Array.isArray(circle.invites)) {
      for (const inv of circle.invites) {
        const u = inv.inviteeUsername.replace(/^@/, "");
        if (!seenUsernames.has(u.toLowerCase())) {
          seenUsernames.add(u.toLowerCase());
          const idx = list.length;
          const discountMult = Math.min(0.99, 0.95 + idx * 0.0125);
          list.push({
            username: u,
            displayName: u,
            wallet: inv.inviteeWallet || "0x2222222222222222222222222222222222222222",
            targetBid: String(Math.max(floorBidNum, Math.round(totalPotNum * discountMult))),
            isVolunteer: false,
          });
        }
      }
    }

    // 3. Fill up to circle capacity with benchmark members if circle invites are pending
    for (const fb of FALLBACK_MEMBERS) {
      if (list.length >= capacity) break;
      if (!seenUsernames.has(fb.username.toLowerCase())) {
        seenUsernames.add(fb.username.toLowerCase());
        const idx = list.length;
        const discountMult = Math.min(0.99, 0.95 + idx * 0.0125);
        list.push({
          username: fb.username,
          displayName: fb.displayName,
          wallet: fb.wallet,
          targetBid: String(Math.max(floorBidNum, Math.round(totalPotNum * discountMult))),
          isVolunteer: false,
        });
      }
    }

    return list;
  }, [circle, capacity, totalPotNum, floorBidNum]);

  // Adjust suggested target bid whenever demo user changes
  useEffect(() => {
    if (user?.username && participants.length > 0) {
      const match = participants.find((p) => p.username.toLowerCase() === user.username.toLowerCase());
      if (match) {
        setBidAmount(match.targetBid);
      } else {
        setBidAmount(String(Math.max(floorBidNum, Math.round(totalPotNum * 0.95))));
      }
    } else if (participants.length > 0) {
      setBidAmount(participants[0].targetBid);
    }
  }, [user?.username, participants, totalPotNum, floorBidNum]);

  // Realtime client validation against 50% floor and total pool
  useEffect(() => {
    const raw = String(bidAmount || "").trim().replace(/,/g, "");
    if (!raw) {
      setValidationError("Please enter a valid bid amount.");
      return;
    }

    const num = parseFloat(raw);
    if (isNaN(num) || num <= 0) {
      setValidationError("Please enter a valid positive USDC bid amount.");
      return;
    }

    if (num < floorBidNum) {
      setValidationError(`Bid amount must be at least 50% of the round pot (${formatUSDC(floorBidNum)} USDC).`);
      return;
    }

    if (num > totalPotNum) {
      setValidationError(`Bid amount cannot exceed the round pot (${formatUSDC(totalPotNum)} USDC).`);
      return;
    }

    setValidationError(null);
  }, [bidAmount, floorBidNum, totalPotNum]);

  // Build Dynamic Multi-Month Simulation Data based on Circle Parameters & Actual Members
  const dynamicSimulation = useMemo<MonthSimulation[]>(() => {
    const months: MonthSimulation[] = [];
    const membersPool = [...participants];
    const pastWinners = new Set<string>();

    for (let m = 1; m <= durationMonths; m++) {
      const isFinalMonth = m === durationMonths;
      let monthWinner: ParticipantInfo | null = null;
      let winningBidNum = totalPotNum;
      let dividendNum = 0;

      const activeBidders = membersPool.filter((p) => !pastWinners.has(p.username.toLowerCase()));

      if (isFinalMonth || activeBidders.length <= 1) {
        monthWinner = activeBidders[0] || membersPool[membersPool.length - 1];
        winningBidNum = totalPotNum;
        dividendNum = 0;
      } else {
        const discountRate = Math.max(0.01, 0.05 - (m - 1) * 0.01);
        winningBidNum = Math.max(floorBidNum, Math.round(totalPotNum * (1 - discountRate)));
        dividendNum = Math.max(0, totalPotNum - winningBidNum);
        monthWinner = activeBidders[1] || activeBidders[0];
      }

      if (monthWinner) {
        pastWinners.add(monthWinner.username.toLowerCase());
      }

      const monthBids = membersPool.map((p) => {
        const isPastWinner =
          pastWinners.has(p.username.toLowerCase()) &&
          p.username.toLowerCase() !== monthWinner?.username.toLowerCase();
        const isThisMonthWinner = p.username.toLowerCase() === monthWinner?.username.toLowerCase();

        if (isPastWinner) {
          return {
            username: p.username,
            displayName: p.displayName,
            wallet: `${p.wallet.slice(0, 6)}...${p.wallet.slice(-4)}`,
            amount: "—",
            isWinner: false,
            note: "Past Winner (Contributes without bidding)",
          };
        }

        if (isThisMonthWinner) {
          const discountPct = isFinalMonth ? 0 : Math.round(((totalPotNum - winningBidNum) / totalPotNum) * 1000) / 10;
          return {
            username: p.username,
            displayName: p.displayName,
            wallet: `${p.wallet.slice(0, 6)}...${p.wallet.slice(-4)}`,
            amount: formatUSDC(winningBidNum),
            isWinner: true,
            note: isFinalMonth
              ? "Final Member — Receives 100% Full Pot with 0% Discount"
              : `Lowest Bid (${discountPct}% discount) — Awarded Month ${m} Pot`,
          };
        }

        const bidderIdx = activeBidders.findIndex((b) => b.username.toLowerCase() === p.username.toLowerCase());
        const step = Math.max(1, Math.round(totalPotNum * 0.01));
        const higherBid = Math.min(totalPotNum, winningBidNum + (bidderIdx + 1) * step);
        const disc = Math.max(0, Math.round(((totalPotNum - higherBid) / totalPotNum) * 1000) / 10);
        return {
          username: p.username,
          displayName: p.displayName,
          wallet: `${p.wallet.slice(0, 6)}...${p.wallet.slice(-4)}`,
          amount: formatUSDC(higherBid),
          isWinner: false,
          note: `${disc}% discount offered`,
        };
      });

      months.push({
        month: m,
        potAmount: formatUSDC(totalPotNum),
        floorAmount: formatUSDC(floorBidNum),
        winnerUsername: monthWinner?.username || "participant",
        winnerDisplayName: monthWinner?.displayName || "Participant",
        winnerWallet: monthWinner?.wallet || "0x0",
        winningBid: formatUSDC(winningBidNum),
        dividend: formatUSDC(dividendNum),
        dividendPerMember: formatUSDC(Math.floor(dividendNum / Math.max(1, capacity))),
        bids: monthBids,
      });
    }

    return months;
  }, [participants, durationMonths, totalPotNum, floorBidNum, capacity]);

  // Auto-play timer for full simulation
  useEffect(() => {
    let timer: any;
    if (isAutoPlaying && showSimModal) {
      timer = setInterval(() => {
        setSelectedMonthTab((prev) => (prev >= durationMonths ? 1 : prev + 1));
      }, 2500);
    }
    return () => clearInterval(timer);
  }, [isAutoPlaying, showSimModal, durationMonths]);

  const userBid = state?.bids?.find(
    (b) =>
      user &&
      ((b?.memberWallet && user.walletAddress && b.memberWallet.toLowerCase() === user.walletAddress.toLowerCase()) ||
        (b?.memberUsername && user.username && b.memberUsername.toLowerCase() === user.username.toLowerCase()))
  );

  const handleSwitchParticipant = (p: ParticipantInfo) => {
    const newUser = {
      username: p.username,
      walletAddress: p.wallet as `0x${string}`,
      displayName: p.displayName,
      createdAt: new Date().toISOString(),
    };
    setUser(newUser);
    setBidAmount(p.targetBid);
    setError(null);
    setSuccessMsg(null);
  };

  const handleCommit = async () => {
    if (!user) {
      setError("Please select an active participant to submit a bid.");
      return;
    }

    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const salt = generateSecureSalt();
      const storageKey = `chitchain_bid_secret_${circleId}_${user.username}`;
      localStorage.setItem(storageKey, JSON.stringify({ amount: bidAmount, salt }));

      const res = await fetch(`/api/circles/${encodeURIComponent(circleId)}/bidding/commit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-dev-user": user.username,
          "x-dev-wallet": user.walletAddress,
        },
        body: JSON.stringify({ amount: bidAmount, salt }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to commit bid");

      setSuccessMsg(`Secret bid of ${formatUSDC(bidAmount)} USDC cryptographically hashed & committed!`);
      loadCircleAndBidding();
    } catch (err: any) {
      setError(err.message || "Failed to commit bid");
    } finally {
      setSubmitting(false);
    }
  };

  const handle1ClickReveal = async () => {
    if (!user) return;
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const storageKey = `chitchain_bid_secret_${circleId}_${user.username}`;
      const saved = localStorage.getItem(storageKey);
      let parsedAmount = bidAmount;
      let parsedSalt = deriveDemoSalt(circleId, state?.cycle || 1, user.walletAddress);

      if (saved) {
        try {
          const obj = JSON.parse(saved);
          if (obj.amount) parsedAmount = obj.amount;
          if (obj.salt) parsedSalt = obj.salt;
        } catch {}
      }

      const num = parseFloat(parsedAmount);
      const baseUnits = BigInt(Math.round(num * 1_000_000)).toString();

      const res = await fetch(`/api/circles/${encodeURIComponent(circleId)}/bidding/reveal`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-dev-user": user.username,
          "x-dev-wallet": user.walletAddress,
        },
        body: JSON.stringify({ amountBaseUnits: baseUnits, salt: parsedSalt }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reveal bid");

      setSuccessMsg(`Bid of ${formatUSDC(parsedAmount)} USDC verified and published onchain!`);
      loadCircleAndBidding();
    } catch (err: any) {
      setError(err.message || "Failed to reveal bid");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSettle = async () => {
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/circles/${encodeURIComponent(circleId)}/bidding/settle`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to settle auction");

      setSuccessMsg("Auction settled! Lowest valid bid selected as winner.");
      loadCircleAndBidding();
    } catch (err: any) {
      setError(err.message || "Failed to settle auction");
    } finally {
      setSubmitting(false);
    }
  };

  // Quick 1-Click Demo Auction Simulation for all members in this circle
  const handleQuickDemoRun = async () => {
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      // 1. Commit all circle participants' bids
      for (const p of participants) {
        const salt = deriveDemoSalt(circleId, state?.cycle || 1, p.wallet);
        await fetch(`/api/circles/${encodeURIComponent(circleId)}/bidding/commit`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-dev-user": p.username,
            "x-dev-wallet": p.wallet,
          },
          body: JSON.stringify({ amount: p.targetBid, salt }),
        });
      }

      // 2. Reveal all bids
      for (const p of participants) {
        const salt = deriveDemoSalt(circleId, state?.cycle || 1, p.wallet);
        const num = parseFloat(p.targetBid);
        const baseUnits = BigInt(Math.round(num * 1_000_000)).toString();
        await fetch(`/api/circles/${encodeURIComponent(circleId)}/bidding/reveal`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-dev-user": p.username,
            "x-dev-wallet": p.wallet,
          },
          body: JSON.stringify({ amountBaseUnits: baseUnits, salt }),
        });
      }

      // 3. Settle auction pot
      const settleRes = await fetch(`/api/circles/${encodeURIComponent(circleId)}/bidding/settle`, { method: "POST" });
      const settleData = await settleRes.json();
      if (!settleRes.ok) throw new Error(settleData.error || "Failed to settle demo run");

      const lowestBidder = participants.reduce((prev, curr) =>
        parseFloat(curr.targetBid) < parseFloat(prev.targetBid) ? curr : prev
      );

      setSuccessMsg(
        `🎉 1-Click Demo Auction Completed! @${lowestBidder.username} won with lowest bid of ${formatUSDC(
          lowestBidder.targetBid
        )} USDC.`
      );
      loadCircleAndBidding();
    } catch (err: any) {
      setError(err.message || "Failed to execute quick demo auction");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="p-8 text-center text-xs font-mono text-neutral-400 rounded-3xl border border-white/10 bg-transparent">
          Loading confidential sealed auction for circle...
        </div>
      </div>
    );
  }

  const poolFormatted = formatUSDC(totalPotNum);
  const floorFormatted = formatUSDC(floorBidNum);
  const committedCount = state?.bids?.length || 0;
  const revealedCount = state?.bids?.filter((b) => b?.revealed)?.length || 0;
  const currentSimMonth = dynamicSimulation.find((m) => m.month === selectedMonthTab) || dynamicSimulation[0];

  return (
    <div className="w-full max-w-4xl mx-auto py-6 px-4 space-y-6 text-neutral-100">
      {/* Top Navigation & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link
          href={`/circles/${circleId}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Return to Circle ({circle?.name || "Circle Details"})</span>
        </Link>

        {/* Demo Simulation Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowSimModal(true)}
            className="px-3.5 py-1.5 rounded-xl border border-amber-500/50 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            title="View Bidding of the whole timeperiod set in circle"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span>Full Timeperiod Simulation</span>
          </button>

          <button
            type="button"
            onClick={handleQuickDemoRun}
            disabled={submitting}
            className="px-3.5 py-1.5 rounded-xl bg-white text-black hover:bg-neutral-200 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
            title="Auto-commit, reveal, and settle circle auction in 1 click"
          >
            <Play className="h-3 w-3 fill-current" />
            <span>{submitting ? "Simulating..." : "1-Click Demo Auction"}</span>
          </button>
        </div>
      </div>

      {/* Main Container Card */}
      <div className="rounded-3xl border border-white/10 bg-neutral-950 p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden">
        {/* Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Confidential Sealed Auction</h1>
              <p className="text-xs text-neutral-400 mt-0.5">
                Circle: <strong className="text-neutral-200">{circle?.name || "ChitChain Pool"}</strong> • Commit and Reveal Scheme on Base Sepolia
              </p>
            </div>
          </div>
          <span
            className={`px-3.5 py-1 rounded-full text-xs font-bold font-mono uppercase tracking-wider self-start sm:self-auto border ${
              state?.phase === "Settled"
                ? "bg-emerald-950/80 text-emerald-300 border-emerald-800/60"
                : state?.phase === "Reveal"
                ? "bg-amber-950/80 text-amber-300 border-amber-800/60"
                : "bg-red-950/80 text-red-300 border-red-800/60"
            }`}
          >
            PHASE: {state?.phase?.toUpperCase() || "COMMIT"}
          </span>
        </div>

        {/* 1. Dynamic Participant Board from Circle Members */}
        <div className="p-3.5 rounded-2xl border border-white/10 bg-white/[0.02] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-400 font-semibold flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-amber-400" />
              <span>Select Active Participant ({participants.length} Members in Circle)</span>
            </span>
            <span className="text-[10px] font-mono text-neutral-400">
              Active: <strong className="text-white">@{user?.username || "none"}</strong>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {participants.map((p) => {
              const isSelected = user?.username?.toLowerCase() === p.username.toLowerCase();
              const pBid = state?.bids?.find(
                (b) =>
                  (b?.memberWallet && b.memberWallet.toLowerCase() === p.wallet.toLowerCase()) ||
                  (b?.memberUsername && b.memberUsername.toLowerCase() === p.username.toLowerCase())
              );
              return (
                <button
                  key={p.username}
                  type="button"
                  onClick={() => handleSwitchParticipant(p)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? "border-amber-500/60 bg-amber-500/10 text-white shadow-md shadow-amber-500/10"
                      : "border-white/10 bg-white/[0.02] text-neutral-400 hover:border-white/20 hover:text-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold truncate">@{p.username}</span>
                    {pBid?.revealed ? (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/50">
                        Revealed
                      </span>
                    ) : pBid ? (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-red-950 text-red-300 border border-red-800/50">
                        Committed
                      </span>
                    ) : (
                      <span className="text-[9px] text-neutral-500">Pending</span>
                    )}
                  </div>
                  <div className="text-[10px] text-neutral-400 font-mono mt-0.5 flex justify-between">
                    <span className="truncate">{p.displayName}</span>
                    <span className="text-amber-400/90 font-semibold">{formatUSDC(p.targetBid)} USDC</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-800/60 text-red-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Global Success Banner */}
        {successMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* 2. Circle Parameters Allocated by Volunteer + Vault Auction Metrics */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-400 font-semibold flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-neutral-400" />
              <span>Circle Parameters & Vault Capacity</span>
            </span>

            {/* BaseScan Contract Verification Link */}
            <a
              href={`https://sepolia.basescan.org/address/${PROTOCOL_VAULT_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-mono text-neutral-400 hover:text-white flex items-center gap-1 underline decoration-dotted transition-colors"
              title="View on BaseScan Explorer"
            >
              <span>Contract: {PROTOCOL_VAULT_ADDRESS.slice(0, 6)}...{PROTOCOL_VAULT_ADDRESS.slice(-4)}</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-neutral-900/70 border border-white/10 space-y-0.5">
              <span className="text-[10px] uppercase font-mono text-neutral-400 block font-semibold">Capacity</span>
              <span className="font-bold text-white text-base font-mono block">{capacity} Members</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-neutral-900/70 border border-white/10 space-y-0.5">
              <span className="text-[10px] uppercase font-mono text-neutral-400 block font-semibold">Monthly Amount</span>
              <span className="font-bold text-white text-base font-mono block">
                {formatUSDC(monthlyAmountNum)} <span className="text-xs text-neutral-400 font-normal">USDC</span>
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-neutral-900/70 border border-white/10 space-y-0.5">
              <span className="text-[10px] uppercase font-mono text-neutral-400 block font-semibold">Circle Tenure</span>
              <span className="font-bold text-white text-base font-mono block">{durationMonths} Months</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-neutral-900/70 border border-emerald-500/20 space-y-0.5">
              <span className="text-[10px] uppercase font-mono text-emerald-400 block font-semibold flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" />
                <span>3x Verification</span>
              </span>
              <span className="font-bold text-emerald-300 text-base font-mono block">
                {formatUSDC(reserve3xNum)} <span className="text-xs text-emerald-400/80 font-normal">USDC</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
            <div className="p-4 rounded-2xl bg-neutral-900/80 border border-white/10 space-y-1">
              <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-400 block font-semibold">
                Minimum Floor Bid (50% of Pot)
              </span>
              <span className="font-bold text-white text-xl font-mono block">
                {floorFormatted} <span className="text-xs text-neutral-400 font-normal">USDC</span>
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-neutral-900/80 border border-white/10 space-y-1">
              <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-400 block font-semibold">
                Total Round Pot in Vault
              </span>
              <span className="font-bold text-white text-xl font-mono block">
                {poolFormatted} <span className="text-xs text-neutral-400 font-normal">USDC</span>
              </span>
            </div>
          </div>
        </div>

        {/* 3. Submit Your Confidential Bid Section */}
        {state?.phase === "Commit" && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6 space-y-5">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Lock className="h-4 w-4 text-red-400" />
                <span>Submit Your Confidential Bid</span>
              </h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Specify the payout pot amount you would accept. Your bid remains cryptographically sealed until the reveal window opens. Lowest valid bid wins.
              </p>
            </div>

            {!userBid ? (
              <div className="space-y-3.5">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold text-neutral-300">
                    Bid Amount for @{user?.username || "participant"} (Min: {floorFormatted} USDC, Max: {poolFormatted} USDC)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      placeholder={String(Math.max(floorBidNum, Math.round(totalPotNum * 0.95)))}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.03] pl-4 pr-16 py-3 text-sm text-white focus:outline-none focus:border-white/30 font-mono transition-colors"
                    />
                    <span className="absolute right-4 top-3 text-xs font-bold text-neutral-400">
                      USDC
                    </span>
                  </div>

                  {validationError && (
                    <p className="text-[11px] text-red-400 font-mono flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      <span>{validationError}</span>
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleCommit}
                  disabled={submitting || Boolean(validationError)}
                  className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer ${
                    !validationError && !submitting
                      ? "bg-white text-black hover:bg-neutral-200"
                      : "bg-white/10 text-neutral-500 border border-white/10 cursor-not-allowed"
                  }`}
                >
                  {submitting ? "Hashing and Committing..." : "Hash and Commit Secret Bid"}
                </button>
              </div>
            ) : (
              <div className="p-4 bg-white/[0.02] rounded-xl border border-white/10 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Bid successfully committed for @{user?.username}</span>
                </div>
                <p className="text-[11px] font-mono text-neutral-400 break-all">
                  Commitment Hash: <span className="text-white">{userBid.commitment}</span>
                </p>
                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-neutral-400 text-[11px] font-mono">
                  <span>Progress: {committedCount} of {capacity} members committed</span>
                  <span>{capacity - committedCount > 0 ? `Waiting for ${capacity - committedCount} member(s)` : "Ready for Reveal"}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Phase 2: Reveal Phase */}
        {state?.phase === "Reveal" && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Unlock className="h-4 w-4 text-amber-400" />
                <span>1-Click Reveal Active</span>
              </h3>
              <span className="text-xs text-neutral-400 font-mono">
                {revealedCount} of {committedCount} Revealed
              </span>
            </div>

            <p className="text-xs text-amber-300/90 leading-relaxed bg-amber-950/30 p-3.5 rounded-xl border border-amber-800/40">
              Important: Bids must be revealed to be eligible for payout. The participant with the lowest verified bid wins the pot.
            </p>

            {!userBid?.revealed ? (
              <button
                type="button"
                onClick={handle1ClickReveal}
                disabled={submitting}
                className="w-full py-3.5 rounded-xl bg-white hover:bg-neutral-200 text-black font-bold text-xs uppercase tracking-wider shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="h-4 w-4 text-red-600" />
                <span>{submitting ? "Recovering Salt & Verifying..." : `1-Click Reveal for @${user?.username || "participant"}`}</span>
              </button>
            ) : (
              <div className="p-3.5 bg-emerald-950/40 border border-emerald-800/40 rounded-xl text-xs text-emerald-300 font-semibold flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>Bid for @{user?.username} revealed & verified onchain</span>
                </div>
                <span className="font-mono text-white font-bold">{formatUSDC(userBid.amount)} USDC</span>
              </div>
            )}

            {/* Revealed Bids Board */}
            <div className="p-3.5 rounded-xl border border-white/10 bg-white/[0.02] space-y-2">
              <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-400 block font-semibold">
                Auction Reveal Board ({revealedCount} of {capacity})
              </span>
              <div className="space-y-1.5">
                {participants.map((p) => {
                  const b = state?.bids?.find(
                    (item) =>
                      (item?.memberWallet && item.memberWallet.toLowerCase() === p.wallet.toLowerCase()) ||
                      (item?.memberUsername && item.memberUsername.toLowerCase() === p.username.toLowerCase())
                  );
                  return (
                    <div key={p.username} className="flex items-center justify-between text-xs font-mono py-1 border-b border-white/5 last:border-0">
                      <span className="text-neutral-300">@{p.username} ({p.displayName})</span>
                      {b?.revealed ? (
                        <span className="text-emerald-400 font-bold">{formatUSDC(b.amount)} USDC</span>
                      ) : b ? (
                        <span className="text-amber-400/80 italic">Sealed (Pending Reveal)</span>
                      ) : (
                        <span className="text-neutral-600">No Commit</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={handleSettle}
                disabled={submitting || revealedCount === 0}
                className="w-full py-3 rounded-xl bg-white text-black font-semibold text-xs uppercase tracking-wider hover:bg-neutral-200 transition-colors cursor-pointer shadow-md"
              >
                <span>{submitting ? "Settling..." : "Settle Auction Pot & Pick Lowest Bid Winner"}</span>
              </button>
            </div>
          </div>
        )}

        {/* Phase 3: Settled Phase */}
        {state?.phase === "Settled" && state.winner && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6 space-y-5">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Trophy className="h-5 w-5 text-emerald-400" />
              <span>Auction Settled: Lowest Bid Winner Selected</span>
            </h3>

            <div className="grid sm:grid-cols-2 gap-3.5 bg-neutral-900/80 rounded-xl p-4 border border-white/10 text-xs">
              <div className="space-y-1">
                <span className="text-neutral-400 block uppercase tracking-wider text-[10px] font-mono">Winning Member</span>
                <span className="font-bold text-emerald-400 text-base block font-mono">
                  @{state.winner.username}
                </span>
                <span className="font-mono text-[10px] text-neutral-500">
                  {state.winner.wallet.slice(0, 8)}...{state.winner.wallet.slice(-6)}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-neutral-400 block uppercase tracking-wider text-[10px] font-mono">Winning Payout Pot</span>
                <span className="font-bold text-white text-base block font-mono">
                  {formatUSDC(state.winner.amount)} USDC
                </span>
                <span className="text-[11px] text-amber-400 font-medium font-mono block">
                  +{formatUSDC(state.winner.dividend)} USDC Carried to Next Month
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <Link
                href={`/circles/${circleId}/pool`}
                className="px-4 py-2 rounded-xl bg-white text-black font-semibold text-xs flex items-center gap-1.5 hover:bg-neutral-200 transition-colors shadow-md"
              >
                <span>View Circle Vault Pool</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* Interactive Full Timeperiod Simulation Modal */}
      {/* ========================================================================= */}
      {showSimModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-3xl max-h-[90vh] rounded-3xl border border-white/15 bg-neutral-950 p-5 sm:p-7 shadow-2xl overflow-y-auto space-y-5 text-neutral-100 relative">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                    Full Circle Timeperiod Bidding Simulation
                  </h2>
                  <p className="text-xs text-neutral-400">
                    {durationMonths}-Month Circle Lifecycle • Capacity: {capacity} Members • Monthly: {formatUSDC(monthlyAmountNum)} USDC • Lowest Bid Wins Pot
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowSimModal(false);
                  setIsAutoPlaying(false);
                }}
                className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Month Navigation Tabs & Auto-Play Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 p-1 bg-white/[0.03] border border-white/10 rounded-2xl flex-wrap">
                {dynamicSimulation.map((sim) => (
                  <button
                    key={sim.month}
                    type="button"
                    onClick={() => {
                      setSelectedMonthTab(sim.month);
                      setIsAutoPlaying(false);
                    }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      selectedMonthTab === sim.month
                        ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
                        : "text-neutral-400 hover:text-white"
                    }`}
                  >
                    Month {sim.month}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMonthTab(999);
                    setIsAutoPlaying(false);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedMonthTab === 999
                      ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  Full Summary
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  isAutoPlaying
                    ? "border-amber-500 bg-amber-500/20 text-amber-300"
                    : "border-white/10 bg-white/[0.02] text-neutral-300 hover:text-white"
                }`}
              >
                <Play className={`h-3 w-3 ${isAutoPlaying ? "animate-spin" : "fill-current"}`} />
                <span>{isAutoPlaying ? "Auto-Playing..." : "Auto-Play Walkthrough"}</span>
              </button>
            </div>

            {/* Content for Current Selected Month */}
            {selectedMonthTab <= durationMonths && currentSimMonth && (
              <div className="space-y-4">
                {/* Month Highlights Banner */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-2xl border border-white/10 bg-white/[0.02] space-y-0.5 text-center">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-400 block font-semibold">
                      Month {currentSimMonth.month} Round Pot
                    </span>
                    <span className="text-base font-bold text-white font-mono block">
                      {currentSimMonth.potAmount} USDC
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 space-y-0.5 text-center">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-emerald-400 block font-semibold">
                      Lowest Bid Winner
                    </span>
                    <span className="text-base font-bold text-emerald-300 font-mono block">
                      @{currentSimMonth.winnerUsername} ({currentSimMonth.winningBid} USDC)
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl border border-amber-500/30 bg-amber-950/20 space-y-0.5 text-center">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-amber-400 block font-semibold">
                      Dividend Generated
                    </span>
                    <span className="text-base font-bold text-amber-300 font-mono block">
                      +{currentSimMonth.dividend} USDC ({currentSimMonth.dividendPerMember} USDC/member)
                    </span>
                  </div>
                </div>

                {/* Winner Spotlight Card */}
                <div className="p-4 rounded-2xl border border-emerald-500/40 bg-emerald-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400">
                      <Trophy className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-wider font-mono text-emerald-400 font-bold block">
                        Month {currentSimMonth.month} Winning Member
                      </span>
                      <h4 className="text-base font-bold text-white">
                        {currentSimMonth.winnerDisplayName} (@{currentSimMonth.winnerUsername})
                      </h4>
                      <p className="text-[11px] font-mono text-neutral-400">
                        Awarded Payout Pot: <strong className="text-emerald-300">{currentSimMonth.winningBid} USDC</strong>
                      </p>
                    </div>
                  </div>

                  <div className="text-right sm:border-l sm:border-emerald-500/20 sm:pl-4">
                    <span className="text-[10px] font-mono uppercase text-neutral-400 block">Member Benefit</span>
                    <span className="text-xs font-mono text-amber-300 font-bold">
                      +{currentSimMonth.dividend} USDC Dividend Discount
                    </span>
                  </div>
                </div>

                {/* All Bids Table for this Month */}
                <div className="p-4 rounded-2xl border border-white/10 bg-white/[0.02] space-y-3">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <span className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-neutral-400" />
                      <span>All Participant Bids in Month {currentSimMonth.month}</span>
                    </span>
                    <span className="text-[10px] font-mono text-neutral-400">
                      Minimum Floor: {currentSimMonth.floorAmount} USDC (50%)
                    </span>
                  </div>

                  <div className="space-y-2">
                    {currentSimMonth.bids.map((b) => (
                      <div
                        key={b.username}
                        className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono transition-all ${
                          b.isWinner
                            ? "border-emerald-500/60 bg-emerald-950/30 text-white shadow-sm"
                            : "border-white/5 bg-white/[0.01] text-neutral-300"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">@{b.username}</span>
                          <span className="text-neutral-400 text-[11px]">({b.displayName})</span>
                          {b.isWinner && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-black font-extrabold text-[9px] uppercase tracking-wider flex items-center gap-1">
                              <Trophy className="h-2.5 w-2.5" />
                              Winner
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 text-right">
                          <span className="text-[11px] text-neutral-400">{b.note}</span>
                          <span className={`text-sm font-bold ${b.isWinner ? "text-emerald-400" : "text-white"}`}>
                            {b.amount === "—" ? "—" : `${b.amount} USDC`}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Summary Table for Full Timeperiod */}
            {selectedMonthTab === 999 && (
              <div className="p-4 rounded-2xl border border-white/10 bg-white/[0.02] space-y-4">
                <div className="border-b border-white/10 pb-2 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white font-mono flex items-center gap-1.5">
                    <Trophy className="h-4 w-4 text-amber-400" />
                    <span>Complete {durationMonths}-Month Circle Settlement Ledger</span>
                  </h3>
                  <span className="text-[10px] font-mono text-neutral-400">
                    Total Volume: {formatUSDC(totalPotNum * durationMonths)} USDC
                  </span>
                </div>

                <div className="overflow-x-auto no-scrollbar">
                  <table className="w-full text-xs font-mono text-left">
                    <thead>
                      <tr className="border-b border-white/10 text-[10px] uppercase text-neutral-400 tracking-wider">
                        <th className="py-2 pr-3">Participant</th>
                        <th className="py-2 px-3">Month Won</th>
                        <th className="py-2 px-3">Winning Bid</th>
                        <th className="py-2 px-3">Total Paid</th>
                        <th className="py-2 px-3 text-right">Net Position</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {dynamicSimulation.map((sim) => (
                        <tr key={sim.month} className="hover:bg-white/[0.02]">
                          <td className="py-2.5 pr-3 font-bold text-white">
                            @{sim.winnerUsername} ({sim.winnerDisplayName})
                          </td>
                          <td className="py-2.5 px-3 text-emerald-400 font-bold">Month {sim.month}</td>
                          <td className="py-2.5 px-3 font-bold text-white">{sim.winningBid} USDC</td>
                          <td className="py-2.5 px-3 text-neutral-300">
                            {formatUSDC(monthlyAmountNum * durationMonths - (durationMonths - sim.month) * (monthlyAmountNum * 0.05))} USDC
                          </td>
                          <td className="py-2.5 px-3 text-right text-emerald-400 font-bold">
                            {sim.month === durationMonths
                              ? `+${formatUSDC((durationMonths - 1) * (monthlyAmountNum * 0.05))} USDC Max Saver Gain`
                              : sim.month === 1
                              ? "Fast Liquidity Advantage"
                              : `Month ${sim.month} Liquidity Advantage`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/20 text-[11px] font-mono text-amber-200">
                  💡 <strong>Chit Fund Game Theory Verified:</strong> Early bidders accept a small discount for immediate access to circle liquidity; patient savers receive the 100% full pot with 0% discount and enjoy accumulated monthly dividend savings.
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  setShowSimModal(false);
                  setIsAutoPlaying(false);
                }}
                className="px-4 py-2 rounded-xl border border-white/10 bg-white/[0.02] text-neutral-300 hover:text-white text-xs font-semibold cursor-pointer"
              >
                Close Simulation
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowSimModal(false);
                  setIsAutoPlaying(false);
                  handleQuickDemoRun();
                }}
                className="px-4 py-2 rounded-xl bg-white text-black hover:bg-neutral-200 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>Apply Demo Result to Current Circle</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
