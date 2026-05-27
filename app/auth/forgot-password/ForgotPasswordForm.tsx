"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function ForgotPasswordForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phase, setPhase] = useState<"request" | "reset">("request");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function requestOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const checkRes = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const checkData = await checkRes.json();

      if (!checkRes.ok) {
        setError(checkData.error ?? "Khong kiem tra duoc email.");
        setLoading(false);
        return;
      }

      if (!checkData.exists) {
        setError("Email khong ton tai trong he thong.");
        setLoading(false);
        return;
      }

      if (checkData.role === "ADMIN") {
        const adminMessage =
          "Tai khoan admin phai lien he quan tri he thong de duoc cap mat khau moi. Khong the dat lai mat khau bang OTP.";
        setError(adminMessage);
        window.alert(adminMessage);
        setLoading(false);
        return;
      }

      const response = await fetch("/api/auth/forgot-password/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Khong gui duoc OTP.");
        return;
      }

      setPhase("reset");
      setMessage("OTP da duoc gui den email cua ban.");
    } catch {
      setError("Loi mang. Vui long thu lai.");
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    if (newPassword !== confirmPassword) {
      setError("Xac nhan mat khau khong khop.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/forgot-password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          otp,
          newPassword,
          confirmPassword,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Dat lai mat khau that bai.");
        return;
      }

      router.push("/auth/login");
      router.refresh();
    } catch {
      setError("Loi mang. Vui long thu lai.");
    } finally {
      setLoading(false);
    }
  }

  if (phase === "request") {
    return (
      <form className="space-y-4" onSubmit={requestOtp}>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none ring-slate-200 focus:ring"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>

        {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
        {message ? <p className="text-sm font-medium text-emerald-700">{message}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {loading ? "Dang xu ly..." : "Gui ma OTP"}
        </button>

        <p className="text-sm text-slate-600">
          Nho lai mat khau?{" "}
          <Link className="font-semibold text-slate-900 hover:underline" href="/auth/login">
            Quay ve dang nhap
          </Link>
        </p>
      </form>
    );
  }

  return (
    <form className="space-y-4" onSubmit={resetPassword}>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="email-confirm">
          Email
        </label>
        <input
          id="email-confirm"
          type="email"
          className="w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-slate-600 outline-none"
          value={email}
          disabled
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="otp">
          OTP
        </label>
        <input
          id="otp"
          type="text"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none ring-slate-200 focus:ring"
          value={otp}
          onChange={(event) => setOtp(event.target.value)}
          placeholder="Nhap ma 6 so"
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="new-password">
          Mat khau moi
        </label>
        <input
          id="new-password"
          type="password"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none ring-slate-200 focus:ring"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          required
          minLength={8}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="confirm-password">
          Xac nhan mat khau moi
        </label>
        <input
          id="confirm-password"
          type="password"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none ring-slate-200 focus:ring"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
        />
      </div>

      {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
      {message ? <p className="text-sm font-medium text-emerald-700">{message}</p> : null}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {loading ? "Dang xu ly..." : "Dat lai mat khau"}
      </button>

      <button
        type="button"
        disabled={loading}
        className="w-full rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-800 hover:bg-slate-100 disabled:cursor-not-allowed"
        onClick={() => {
          setPhase("request");
          setOtp("");
          setNewPassword("");
          setConfirmPassword("");
          setError("");
          setMessage("");
        }}
      >
        Gui lai OTP
      </button>
    </form>
  );
}
