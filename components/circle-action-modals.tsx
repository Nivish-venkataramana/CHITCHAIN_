"use client";

import React, { useState, useEffect } from "react";
import { X, AlertTriangle, Trash2, Edit3, CheckCircle2, ShieldAlert } from "lucide-react";
import { fromBaseUnits } from "@/lib/validation";
import { useDevUser } from "@/components/providers";
import { usePrivy, useWallets } from "@privy-io/react-auth";

export interface CircleActionData {
  id: string;
  name: string;
  numPeople: number;
  monthlyAmount: string;
  durationMonths: number;
  status: "INVITING" | "ISSUE_STAGE" | "FINALIZED";
}

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  circle: CircleActionData | null;
  onSuccess: () => void;
}

export function EditCircleModal({ isOpen, onClose, circle, onSuccess }: EditModalProps) {
  const { user } = useDevUser();
  const { user: privyUser } = usePrivy();
  const { wallets } = useWallets();

  const embeddedWallet = wallets.find((w) => w.walletClientType === "privy") || wallets[0];
  const activeWalletAddress = (
    embeddedWallet?.address ||
    privyUser?.wallet?.address ||
    user?.walletAddress ||
    ""
  ).toLowerCase();

  const userEmail = privyUser?.email?.address || "";
  const dynamicUsername = userEmail
    ? userEmail.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "").toLowerCase()
    : activeWalletAddress
    ? `user_${activeWalletAddress.slice(2, 6).toLowerCase()}`
    : user?.username || "volunteer";

  const [name, setName] = useState("");
  const [numPeople, setNumPeople] = useState(4);
  const [durationMonths, setDurationMonths] = useState(3);
  const [monthlyAmount, setMonthlyAmount] = useState("1000");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (circle) {
      setName(circle.name);
      setNumPeople(circle.numPeople);
      setDurationMonths(circle.durationMonths);
      setMonthlyAmount(fromBaseUnits(circle.monthlyAmount));
      setError(null);
    }
  }, [circle]);

  if (!isOpen || !circle) return null;

  const allowedDurations = [numPeople - 1, numPeople - 2].filter((d) => d >= 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Circle name is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/circles/${circle.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-dev-user": dynamicUsername,
          "x-dev-wallet": activeWalletAddress,
        },
        body: JSON.stringify({
          name: name.trim(),
          numPeople: Number(numPeople),
          monthlyAmount: monthlyAmount.trim(),
          durationMonths: Number(durationMonths),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update circle");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to update circle");
    } finally {
      setLoading(false);
    }
  };

  const monthlyNumeric = parseFloat(monthlyAmount) || 0;
  const collateralRequired = monthlyNumeric * 3;

  const handleNumPeopleChange = (val: string) => {
    const clean = val.replace(/\D/g, "");
    setNumPeople(clean);
    const n = parseInt(clean, 10);
    if (!isNaN(n) && n >= 2) {
      setDurationMonths(String(n - 1));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-3xl border border-neutral-800 bg-neutral-950 p-8 shadow-2xl text-neutral-100 animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 border-b border-neutral-900 pb-5 mb-6">
          <div className="p-3 rounded-2xl bg-neutral-900 border border-neutral-800 text-white">
            <Edit3 className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Edit Circle Parameters</h3>
            <p className="text-xs text-neutral-400">Modify terms before activation</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-950/60 border border-red-800/50 text-red-300 text-xs flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="block text-xs uppercase tracking-wider font-bold text-neutral-300">
              Circle Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-xs text-white focus:outline-none focus:border-red-500"
              placeholder="e.g. Founders Wealth Circle"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 items-start">
            <div className="space-y-1.5">
              <label className="block text-xs uppercase tracking-wider font-bold text-neutral-300">
                Capacity (Members)
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={numPeople}
                onChange={(e) => handleNumPeopleChange(e.target.value)}
                required
                className="w-full rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-xs text-white focus:outline-none focus:border-red-500 font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs uppercase tracking-wider font-bold text-neutral-300">
                Duration (Months)
              </label>
              {Number(numPeople) >= 2 ? (
                <div className="grid grid-cols-2 gap-2">
                  {[Number(numPeople) - 1, Number(numPeople) - 2]
                    .filter((d) => d >= 1)
                    .map((d) => {
                      const isSelected = Number(durationMonths) === d;
                      const tag = d === Number(numPeople) - 1 ? "N - 1" : "N - 2";
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setDurationMonths(d)}
                          className={`py-2 px-3 text-xs font-mono font-bold rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? "border-white bg-white text-black shadow-md"
                              : "border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-neutral-700 hover:text-white"
                          }`}
                        >
                          <span className="text-[10px] opacity-75">{tag}</span>
                          <span className="font-bold">{d} mo</span>
                        </button>
                      );
                    })}
                </div>
              ) : (
                <div className="w-full px-4 py-3 text-xs rounded-2xl border border-neutral-800 bg-neutral-900 text-neutral-500 font-mono flex items-center">
                  <span>Enter capacity (N ≥ 2)</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs uppercase tracking-wider font-bold text-neutral-300">
              Monthly Contribution (USDC)
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={monthlyAmount}
              onChange={(e) => setMonthlyAmount(e.target.value.replace(/\D/g, ""))}
              required
              className="w-full rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-xs text-white focus:outline-none focus:border-red-500 font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>

          {/* 3x Collateral Callout */}
          <div className="p-4 rounded-2xl bg-neutral-900/90 border border-neutral-800 flex items-center justify-between text-xs">
            <span className="text-neutral-400">Required 3x Balance Verification:</span>
            <span className="font-mono font-bold text-emerald-400">
              {collateralRequired.toLocaleString()} USDC
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-900">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs font-bold transition-all shadow-md"
            >
              {loading ? "Saving Changes..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  circle: { id: string; name: string } | null;
  onSuccess: () => void;
}

export function DeleteCircleModal({ isOpen, onClose, circle, onSuccess }: DeleteModalProps) {
  const { user } = useDevUser();
  const { user: privyUser } = usePrivy();
  const { wallets } = useWallets();

  const embeddedWallet = wallets.find((w) => w.walletClientType === "privy") || wallets[0];
  const activeWalletAddress = (
    embeddedWallet?.address ||
    privyUser?.wallet?.address ||
    user?.walletAddress ||
    ""
  ).toLowerCase();

  const userEmail = privyUser?.email?.address || "";
  const dynamicUsername = userEmail
    ? userEmail.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "").toLowerCase()
    : activeWalletAddress
    ? `user_${activeWalletAddress.slice(2, 6).toLowerCase()}`
    : user?.username || "volunteer";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !circle) return null;

  const handleDelete = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/circles/${circle.id}`, {
        method: "DELETE",
        headers: {
          "x-dev-user": dynamicUsername,
          "x-dev-wallet": activeWalletAddress,
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete circle");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to delete circle");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-3xl border border-red-950 bg-neutral-950 p-8 shadow-2xl text-neutral-100 animate-in fade-in zoom-in-95 duration-150 space-y-6">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-red-950/80 border border-red-800/60 text-red-400">
            <Trash2 className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Delete Wealth Circle</h3>
            <p className="text-xs text-neutral-400">Permanent action</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-red-950/30 border border-red-900/40 text-xs text-neutral-300 space-y-2">
          <p>
            Are you sure you want to delete <strong className="text-white">&ldquo;{circle.name}&rdquo;</strong>?
          </p>
          <p className="text-neutral-400 text-[11px]">
            This will cancel all pending member invites, remove registered issues, and delete the circle record from the database.
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-red-950/60 border border-red-800/50 text-red-300 text-xs flex items-center gap-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs font-bold transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleDelete}
            className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-red-950 flex items-center gap-2"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>{loading ? "Deleting..." : "Delete Circle"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
