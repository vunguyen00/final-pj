"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const labelClass = "mb-1.5 block text-sm font-bold text-slate-700";
const inputClass = "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

export function ForgotPasswordForm() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", otp: "", newPassword: "", confirmPassword: "", phase: "request" as "request" | "reset", loading: false, error: "", message: "" });
  const { email, otp, newPassword, confirmPassword, phase, loading, error, message } = form;
  const updateForm = (patch: Partial<typeof form>) => setForm((current) => ({ ...current, ...patch }));

  async function requestOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateForm({ loading: true, error: "", message: "" });

    try {
      const checkRes = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const checkData = await checkRes.json();

      if (!checkRes.ok) {
        updateForm({ error: checkData.error ?? "Không kiểm tra được email.", loading: false });
        return;
      }

      if (!checkData.exists) {
        updateForm({ error: "Email không tồn tại trong hệ thống.", loading: false });
        return;
      }

      if (checkData.role === "ADMIN") {
        const adminMessage =
          "Tai khoan admin phai lien he quan tri he thong de duoc cap mat khau moi. Khong the dat lai mat khau bang OTP.";
        updateForm({ error: adminMessage, loading: false });
        window.alert(adminMessage);
        return;
      }

      const response = await fetch("/api/auth/forgot-password/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();

      if (!response.ok) {
        updateForm({ error: data.error ?? "Không gửi được mã xác nhận." });
        return;
      }

      updateForm({ phase: "reset", message: "Mã xác nhận đã được gửi đến email của bạn." });
    } catch {
      updateForm({ error: "Lỗi mạng. Vui lòng thử lại." });
    } finally {
      updateForm({ loading: false });
    }
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateForm({ loading: true, error: "", message: "" });

    if (newPassword !== confirmPassword) {
      updateForm({ error: "Xác nhận mật khẩu không khớp.", loading: false });
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
        updateForm({ error: data.error ?? "Cập nhật mật khẩu thất bại." });
        return;
      }

      router.push("/auth/login");
      router.refresh();
    } catch {
      updateForm({ error: "Lỗi mạng. Vui lòng thử lại." });
    } finally {
      updateForm({ loading: false });
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
            onChange={(event) => updateForm({ email: event.target.value })}
            required
            autoComplete="email"
            placeholder="ban@example.com"
          />
        </div>

        {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}
        {message ? <p className="text-sm font-medium text-accent">{message}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Đang gửi hướng dẫn..." : "Tiếp tục"}
        </button>

        <p className="text-sm text-muted-foreground">
          Nhớ lại mật khẩu?{" "}
          <Link className="font-semibold text-foreground hover:underline" href="/auth/login">
            Quay về đăng nhập
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
        <input id="email-confirm" type="email" className={`${inputClass} bg-muted text-muted-foreground`} value={email} disabled readOnly />
      </div>

      <div>
        <label className={labelClass} htmlFor="otp">
          Mã xác nhận
        </label>
        <input
          id="otp"
          type="text"
          className={inputClass}
          value={otp}
          onChange={(event) => updateForm({ otp: event.target.value })}
          placeholder="Nhap ma 6 so"
          required
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="new-password">
          Mật khẩu mới
        </label>
        <input
          id="new-password"
          type="password"
          className={inputClass}
          value={newPassword}
          onChange={(event) => updateForm({ newPassword: event.target.value })}
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="confirm-password">
          Xác nhận mật khẩu mới
        </label>
        <input
          id="confirm-password"
          type="password"
          className={inputClass}
          value={confirmPassword}
          onChange={(event) => updateForm({ confirmPassword: event.target.value })}
          required
          autoComplete="new-password"
        />
      </div>

      {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}
      {message ? <p className="text-sm font-medium text-accent">{message}</p> : null}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
      </button>

      <button
        type="button"
        disabled={loading}
        className="w-full rounded-lg border border-border px-4 py-2 font-semibold text-foreground hover:bg-muted disabled:cursor-not-allowed"
        onClick={() => {
          updateForm({ phase: "request", otp: "", newPassword: "", confirmPassword: "", error: "", message: "" });
        }}
      >
        Gửi lại mã xác nhận
      </button>
    </form>
  );
}
