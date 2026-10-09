"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDevUser } from "@/components/providers";
import { usePrivy, useLoginWithEmail, useWallets } from "@privy-io/react-auth";
import { Mail, KeyRound, ArrowRight, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { setUser, users } = useDevUser();
  const { authenticated, ready } = usePrivy();
  const { wallets } = useWallets();

  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Privy headless email authentication
  const { sendCode, loginWithCode } = useLoginWithEmail({
    onComplete: async (user, isNewUser) => {
      setIsLoading(true);
      try {
        const privyUserId = user?.id;
        const privyWallet = user?.wallet?.address;
        const userEmail = user?.email?.address || email;
        const cleanAddress = privyWallet?.toLowerCase() || `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`;
        const username = userEmail ? userEmail.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "").toLowerCase() : `user_${cleanAddress.slice(2, 6)}`;
        const displayName = userEmail ? userEmail.split("@")[0] : username;

        const syncRes = await fetch("/api/account/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            privyUserId,
            username,
            walletAddress: cleanAddress,
            displayName,
          }),
        });

        if (syncRes.ok) {
          const synced = await syncRes.json();
          setUser(synced);
          if (typeof window !== "undefined") {
            localStorage.setItem("chitchain_user_profile", JSON.stringify(synced));
            localStorage.setItem("chitchain_smart_wallet_address", synced.walletAddress || cleanAddress);
          }
        } else {
          setUser({
            privyUserId,
            username,
            walletAddress: cleanAddress as `0x${string}`,
            displayName,
            createdAt: new Date().toISOString(),
          });
        }
        router.push("/dashboard");
      } catch (err: any) {
        console.error("Post-auth error:", err);
        router.push("/dashboard");
      } finally {
        setIsLoading(false);
      }
    },
    onError: (err) => {
      console.error("Login error:", err);
      setError(err?.message || "Authentication failed. Please verify the code and try again.");
      setIsLoading(false);
    },
  });

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      if (sendCode) {
        await sendCode({ email: email.trim().toLowerCase() });
        setStep("otp");
        setResendCooldown(60);
      } else {
        setStep("otp");
        setResendCooldown(60);
      }
    } catch (err: any) {
      console.error("Error sending OTP:", err);
      setError(err?.message || "Failed to dispatch verification code.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length < 6) {
      setError("Enter the 6-digit verification code.");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      if (loginWithCode) {
        await loginWithCode({
          code: otpCode.trim(),
          email: email.trim().toLowerCase(),
        });
      } else {
        const namePart = email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "").toLowerCase();
        const found = users.find((u) => u.username.toLowerCase().includes(namePart)) || users[0];
        if (found) setUser(found);
        router.push("/dashboard");
      }
    } catch (err: any) {
      console.error("Error validating OTP:", err);
      setError(err?.message || "Invalid verification code.");
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 my-auto text-neutral-100">
      <div className="rounded-3xl border border-neutral-800 bg-neutral-950 p-6 sm:p-8 space-y-5 shadow-2xl">
        
        {/* Header */}
        <div className="text-center space-y-1 border-b border-neutral-800/80 pb-4">
          <h1 className="text-xl font-bold font-mono tracking-[0.2em] text-white uppercase">
            CHITCHAIN
          </h1>
          <p className="text-xs text-neutral-400">
            {step === "email" ? "Sign in to access wealth circles" : `Verification code sent to ${email}`}
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl border border-red-900/60 bg-red-950/40 text-red-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Step 1: Email Form */}
        {step === "email" ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-neutral-300">
                Email Address
              </label>
              <div className="relative flex items-center">
                <Mail className="absolute left-3.5 h-4 w-4 text-neutral-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-neutral-800 bg-neutral-900/60 text-white focus:outline-none focus:border-neutral-500 font-mono transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-white text-black font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 hover:bg-neutral-200 transition-colors disabled:opacity-50 cursor-pointer shadow-md"
            >
              <span>{isLoading ? "Sending Code..." : "Continue with Email"}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        ) : (
          /* Step 2: OTP Form */
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-neutral-300">
                6-Digit Verification Code
              </label>
              <div className="relative flex items-center">
                <KeyRound className="absolute left-3.5 h-4 w-4 text-neutral-500" />
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                  required
                  autoFocus
                  className="w-full pl-10 pr-4 py-2.5 text-base tracking-widest rounded-xl border border-neutral-800 bg-neutral-900/60 text-white focus:outline-none focus:border-neutral-500 font-mono transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || otpCode.length < 6}
              className="w-full py-3 rounded-xl bg-white text-black font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 hover:bg-neutral-200 transition-colors disabled:opacity-50 cursor-pointer shadow-md"
            >
              <span>{isLoading ? "Verifying..." : "Verify & Sign In"}</span>
              <ArrowRight className="h-4 w-4" />
            </button>

            <div className="flex items-center justify-between text-xs text-neutral-400 pt-2 border-t border-neutral-800/60">
              <button
                type="button"
                onClick={() => setStep("email")}
                className="hover:text-white transition-colors cursor-pointer"
              >
                Change email
              </button>
              <button
                type="button"
                disabled={resendCooldown > 0 || isLoading}
                onClick={handleSendOtp}
                className="hover:text-white transition-colors disabled:opacity-40 cursor-pointer"
              >
                {resendCooldown > 0 ? `Resend code (${resendCooldown}s)` : "Resend code"}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
