"use client";

import React, { useState, useEffect } from "react";
import { X, AlertTriangle, Trash2, Edit3, CheckCircle2, ShieldAlert } from "lucide-react";
import { fromBaseUnits, getAllowedDurations } from "@/lib/validation";
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
    user?.walletAddress ||
    (typeof window !== "undefined" ? localStorage.getItem("chitchain_smart_wallet_address") : "") ||
    (privyUser as any)?.smartWallet?.address ||
    embeddedWallet?.address ||
    privyUser?.wallet?.address ||
    ""
  ).toLowerCase();

  const userEmail = privyUser?.email?.address || "";
  const dynamicUsername = userEmail
    ? userEmail.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "").toLowerCase()
    : user?.username ||
      (activeWalletAddress ? `user_${activeWalletAddress.slice(2, 6).toLowerCase()}` : "volunteer");

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

  const allowedDurations = getAllowedDurations(Number(numPeople));

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
    setNumPeople(Number(clean));
    const n = parseInt(clean, 10);
    if (!isNaN(n) && n >= 2) {
      const allowed = getAllowedDurations(n);
      setDurationMonths(allowed[0] || n - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
      <div className="relative w-full max-w-lg p-8 text-neutral-100 space-y-6">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-xl text-neutral-400 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3">
          <Edit3 className="h-5 w-5 text-white" />
          <div>
            <h3 className="text-xl font-bold text-white">Edit Circle Parameters</h3>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl text-red-300 text-xs flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative h-14 border-b border-white/20 focus-within:border-white transition-colors">
            <input
              type="text"
              id="edit-circle-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder=" "
              required
              className="peer w-full h-full bg-transparent border-none outline-none pt-4 pb-1 text-sm text-white font-mono placeholder-transparent"
            />
            <label
              htmlFor="edit-circle-name"
              className="absolute left-0 top-4 text-sm text-neutral-400 pointer-events-none transition-all duration-200 origin-[0] peer-focus:top-0 peer-focus:text-xs peer-focus:text-white peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-neutral-400"
            >
              Circle Name
            </label>
          </div>

          <div className="grid grid-cols-2 gap-6 items-start">
            <div className="relative h-14 border-b border-white/20 focus-within:border-white transition-colors">
              <input
                type="text"
                id="edit-circle-capacity"
                inputMode="numeric"
                pattern="[0-9]*"
                value={numPeople}
                onChange={(e) => handleNumPeopleChange(e.target.value)}
                placeholder=" "
                required
                className="peer w-full h-full bg-transparent border-none outline-none pt-4 pb-1 text-sm text-white font-mono placeholder-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <label
                htmlFor="edit-circle-capacity"
                className="absolute left-0 top-4 text-sm text-neutral-400 pointer-events-none transition-all duration-200 origin-[0] peer-focus:top-0 peer-focus:text-xs peer-focus:text-white peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-neutral-400"
              >
                Capacity (Members)
              </label>
            </div>

            <div className="relative h-14 border-b border-white/20 flex flex-col justify-end">
              <span className="absolute left-0 top-0 text-xs font-semibold text-neutral-400">
                Duration (Months)
              </span>
              {Number(numPeople) >= 2 ? (
                <div className="flex items-center gap-4 pb-1 overflow-x-auto no-scrollbar">
                  {allowedDurations.map((d) => {
                    const isSelected = Number(durationMonths) === d;
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDurationMonths(d)}
                        className={`text-sm font-mono transition-colors cursor-pointer ${
                          isSelected
                            ? "text-white font-bold underline underline-offset-8 decoration-2"
                            : "text-neutral-500 hover:text-neutral-300"
                        }`}
                      >
                        {d} {d === 1 ? "Month" : "Months"}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="pb-1 text-xs text-neutral-500 font-mono">
                  Enter capacity (N ≥ 2)
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 items-start">
            <div className="relative h-14 border-b border-white/20 focus-within:border-white transition-colors">
              <input
                type="text"
                id="edit-circle-monthly"
                inputMode="numeric"
                pattern="[0-9]*"
                value={monthlyAmount}
                onChange={(e) => setMonthlyAmount(e.target.value.replace(/\D/g, ""))}
                placeholder=" "
                required
                className="peer w-full h-full bg-transparent border-none outline-none pt-4 pb-1 text-sm text-white font-mono placeholder-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <label
                htmlFor="edit-circle-monthly"
                className="absolute left-0 top-4 text-sm text-neutral-400 pointer-events-none transition-all duration-200 origin-[0] peer-focus:top-0 peer-focus:text-xs peer-focus:text-white peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-neutral-400"
              >
                Monthly Contribution (USDC)
              </label>
            </div>

            {/* 3x Collateral Callout */}
            <div className="relative h-14 border-b border-white/20 flex flex-col justify-end">
              <span className="absolute left-0 top-0 text-xs font-semibold text-neutral-400">
                Required 3x Balance Verification
              </span>
              <div className="flex items-center justify-between pb-1 font-mono text-sm">
                <span className="font-semibold text-white">
                  {collateralRequired.toLocaleString()}
                </span>
                <span className="text-neutral-500 text-xs">USDC</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-neutral-400 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs font-semibold transition-all cursor-pointer"
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
    user?.walletAddress ||
    (typeof window !== "undefined" ? localStorage.getItem("chitchain_smart_wallet_address") : "") ||
    (privyUser as any)?.smartWallet?.address ||
    embeddedWallet?.address ||
    privyUser?.wallet?.address ||
    ""
  ).toLowerCase();

  const userEmail = privyUser?.email?.address || "";
  const dynamicUsername = userEmail
    ? userEmail.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "").toLowerCase()
    : user?.username ||
      (activeWalletAddress ? `user_${activeWalletAddress.slice(2, 6).toLowerCase()}` : "volunteer");

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
      <div className="relative w-full max-w-md p-8 text-neutral-100 space-y-6">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-xl text-neutral-400 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3">
          <Trash2 className="h-5 w-5 text-red-400" />
          <div>
            <h3 className="text-xl font-bold text-white">Delete Wealth Circle</h3>
          </div>
        </div>

        <div className="p-2 text-xs text-neutral-300 space-y-2">
          <p>
            Are you sure you want to delete <strong className="text-white">&ldquo;{circle.name}&rdquo;</strong>?
          </p>
          <p className="text-neutral-400 text-xs">
            This will cancel all pending member invites, remove registered issues, and delete the circle record from the database.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl text-red-300 text-xs flex items-center gap-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-neutral-400 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleDelete}
            className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>{loading ? "Deleting..." : "Delete Circle"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
