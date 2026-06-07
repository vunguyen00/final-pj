"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const labelClass = "mb-1 block text-sm font-medium text-foreground";
const inputClass = "w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground outline-none ring-primary/20 focus:ring-2";

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
          <label className={labelClass} htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            className={inputClass}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>

        {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}
        {message ? <p className="text-sm font-medium text-accent">{message}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Dang xu ly..." : "Gui ma OTP"}
        </button>

        <p className="text-sm text-muted-foreground">
          Nho lai mat khau?{" "}
          <Link className="font-semibold text-foreground hover:underline" href="/auth/login">
            Quay ve dang nhap
          </Link>
        </p>
      </form>
    );
  }

  return (
    <form className="space-y-4" onSubmit={resetPassword}>
      <div>
        <label className={labelClass} htmlFor="email-confirm">
          Email
        </label>
        <input id="email-confirm" type="email" className={`${inputClass} bg-muted text-muted-foreground`} value={email} disabled />
      </div>

      <div>
        <label className={labelClass} htmlFor="otp">
          OTP
        </label>
        <input
          id="otp"
          type="text"
          className={inputClass}
          value={otp}
          onChange={(event) => setOtp(event.target.value)}
          placeholder="Nhap ma 6 so"
          required
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="new-password">
          Mat khau moi
        </label>
        <input
          id="new-password"
          type="password"
          className={inputClass}
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          required
          minLength={8}
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="confirm-password">
          Xac nhan mat khau moi
        </label>
        <input
          id="confirm-password"
          type="password"
          className={inputClass}
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
        />
      </div>

      {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}
      {message ? <p className="text-sm font-medium text-accent">{message}</p> : null}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Dang xu ly..." : "Dat lai mat khau"}
      </button>

      <button
        type="button"
        disabled={loading}
        className="w-full rounded-lg border border-border px-4 py-2 font-semibold text-foreground hover:bg-muted disabled:cursor-not-allowed"
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
