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
        const linkedWallet = (user as any)?.linkedAccounts?.find((acc: any) => acc.type === "wallet")?.address;
        const privyWallet = user?.wallet?.address || (user as any)?.smartWallet?.address || linkedWallet;
        const userEmail = user?.email?.address || email;
        const username = userEmail
          ? userEmail.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "").toLowerCase()
          : `user_${(privyUserId || "").slice(-6)}`;
        const displayName = userEmail ? userEmail.split("@")[0] : username;

        // 1. First check if user already exists in Neon DB
        let existingUser: any = null;
        try {
          const checkRes = await fetch(`/api/users/by-username/${encodeURIComponent(username)}`);
          if (checkRes.ok) {
            existingUser = await checkRes.json();
          }
        } catch {}

        const cleanAddress = privyWallet?.toLowerCase() || existingUser?.walletAddress;

        const syncRes = await fetch("/api/account/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            privyUserId,
            username,
            walletAddress: cleanAddress || undefined,
            displayName: existingUser?.displayName || displayName,
          }),
        });

        if (syncRes.ok) {
          const synced = await syncRes.json();
          setUser(synced);
          if (typeof window !== "undefined") {
            localStorage.setItem("chitchain_user_profile", JSON.stringify(synced));
            if (synced.walletAddress) {
              localStorage.setItem("chitchain_smart_wallet_address", synced.walletAddress);
            }
          }
        } else if (existingUser) {
          setUser(existingUser);
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
      <div className="p-6 sm:p-8 space-y-6">
        
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold font-mono tracking-[0.2em] text-white uppercase">
            CHITCHAIN
          </h1>
        </div>

        {error && (
          <div className="p-3 rounded-xl text-red-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Step 1: Email Form */}
        {step === "email" ? (
          <form onSubmit={handleSendOtp} className="space-y-6">
            <div className="relative h-14 border-b border-white/20 focus-within:border-white transition-colors">
              <input
                type="email"
                id="login-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder=" "
                required
                autoFocus
                className="peer w-full h-full bg-transparent border-none outline-none pt-4 pb-1 text-sm text-white font-mono placeholder-transparent"
              />
              <label
                htmlFor="login-email"
                className="absolute left-0 top-4 text-sm text-neutral-400 pointer-events-none transition-all duration-200 origin-[0] peer-focus:top-0 peer-focus:text-xs peer-focus:text-white peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-neutral-400"
              >
                Email Address
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-white text-black font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 hover:bg-neutral-200 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <span>{isLoading ? "Sending Code..." : "Continue with Email"}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        ) : (
          /* Step 2: OTP Form */
          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <div className="relative h-14 border-b border-white/20 focus-within:border-white transition-colors">
              <input
                type="text"
                id="login-otp"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                placeholder=" "
                required
                autoFocus
                className="peer w-full h-full bg-transparent border-none outline-none pt-4 pb-1 text-base tracking-widest text-white font-mono placeholder-transparent"
              />
              <label
                htmlFor="login-otp"
                className="absolute left-0 top-4 text-sm text-neutral-400 pointer-events-none transition-all duration-200 origin-[0] peer-focus:top-0 peer-focus:text-xs peer-focus:text-white peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-neutral-400"
              >
                6-Digit Verification Code
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading || otpCode.length < 6}
              className="w-full py-3 rounded-xl bg-white text-black font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 hover:bg-neutral-200 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <span>{isLoading ? "Verifying..." : "Verify & Sign In"}</span>
              <ArrowRight className="h-4 w-4" />
            </button>

            <div className="flex items-center justify-between text-xs text-neutral-400 pt-2">
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
