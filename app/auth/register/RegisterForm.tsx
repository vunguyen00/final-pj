"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const labelClass = "mb-1.5 block text-sm font-bold text-slate-700";
const inputClass = "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function RegisterForm() {
  const router = useRouter();
  const [form, setForm] = useState({ username: "", email: "", password: "", confirmPassword: "", loading: false, error: "" });
  const [otpEmail, setOtpEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpMessage, setOtpMessage] = useState("");
  const [resending, setResending] = useState(false);
  const { username, email, password, confirmPassword, loading, error } = form;
  const updateForm = (patch: Partial<typeof form>) => setForm((current) => ({ ...current, ...patch }));

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateForm({ loading: true, error: "" });

    if (!username.trim() || !email.trim() || !password || !confirmPassword) {
      updateForm({ error: "Vui lòng nhập đầy đủ tên hiển thị, email, mật khẩu và xác nhận mật khẩu.", loading: false });
      return;
    }

    if (!emailPattern.test(email.trim())) {
      updateForm({ error: "Vui lòng nhập email hợp lệ.", loading: false });
      return;
    }

    if (password !== confirmPassword) {
      updateForm({ error: "Xác nhận mật khẩu không khớp.", loading: false });
      return;
    }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password, confirmPassword }),
      });

      const data = await response.json();
      if (!response.ok) {
        updateForm({ error: data.error ?? "Đăng ký thất bại." });
        return;
      }

      if (data.requiresOtp) {
        setOtpEmail(data.email ?? email);
        setOtpMessage("Mã OTP đã được gửi đến email của bạn.");
        return;
      }

      router.push(data.redirectTo ?? "/");
      window.location.href = data.redirectTo ?? "/";
    } catch {
      updateForm({ error: "Lỗi mạng. Vui lòng thử lại." });
    } finally {
      updateForm({ loading: false });
    }
  }

  async function verifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateForm({ loading: true, error: "" });
    setOtpMessage("");

    if (!/^\d{6}$/.test(otpCode)) {
      updateForm({ error: "Vui lòng nhập mã OTP gồm 6 chữ số.", loading: false });
      return;
    }

    try {
      const response = await fetch("/api/auth/verify-registration-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: otpEmail, code: otpCode }),
      });
      const data = await response.json();

      if (!response.ok) {
        updateForm({ error: data.error ?? "Xác thực OTP thất bại." });
        return;
      }

      router.push(data.redirectTo ?? "/");
      window.location.href = data.redirectTo ?? "/";
    } catch {
      updateForm({ error: "Lỗi mạng. Vui lòng thử lại." });
    } finally {
      updateForm({ loading: false });
    }
  }

  async function resendOtp() {
    setResending(true);
    updateForm({ error: "" });
    setOtpMessage("");

    try {
      const response = await fetch("/api/auth/resend-registration-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: otpEmail }),
      });
      const data = await response.json();

      if (!response.ok) {
        updateForm({ error: data.error ?? "Không gửi lại được OTP." });
        return;
      }

      setOtpMessage(data.alreadyActive ? "Tài khoản đã được kích hoạt." : "Mã OTP mới đã được gửi.");
    } catch {
      updateForm({ error: "Lỗi mạng. Vui lòng thử lại." });
    } finally {
      setResending(false);
    }
  }

  if (otpEmail) {
    return (
      <form className="space-y-4" onSubmit={verifyOtp} noValidate>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          <p className="font-semibold">Xác thực email</p>
          <p className="mt-1">Nhập mã OTP gồm 6 chữ số đã gửi đến {otpEmail}.</p>
        </div>

        <div>
          <label className={labelClass} htmlFor="otp">
            Mã OTP
          </label>
          <input
            id="otp"
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            className={inputClass}
            value={otpCode}
            onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, ""))}
            required
            autoComplete="one-time-code"
            placeholder="123456"
            title="Nhập mã OTP gồm 6 chữ số"
          />
        </div>

        {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}
        {otpMessage ? <p className="text-sm font-medium text-emerald-700">{otpMessage}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-blue-600 px-4 py-3 font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Đang xác thực..." : "Xác thực và đăng nhập"}
        </button>
        <button
          type="button"
          disabled={resending || loading}
          onClick={() => void resendOtp()}
          className="w-full rounded-xl border border-slate-300 px-4 py-3 font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {resending ? "Đang gửi lại..." : "Gửi lại OTP"}
        </button>
      </form>
    );
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit} noValidate>
      <div>
        <label className={labelClass} htmlFor="username">
          Tên hiển thị
        </label>
        <input
          id="username"
          type="text"
          className={inputClass}
          value={username}
          onChange={(event) => updateForm({ username: event.target.value })}
          required
          autoComplete="username"
          placeholder="Tên của bạn"
        />
      </div>

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

      <div>
        <label className={labelClass} htmlFor="password">
          Mật khẩu
        </label>
        <input
          id="password"
          type="password"
          className={inputClass}
          value={password}
          onChange={(event) => updateForm({ password: event.target.value })}
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="Tối thiểu 8 ký tự"
        />
        <p className="mt-1.5 text-xs text-slate-500">Có chữ thường, chữ hoa, số và ký tự đặc biệt.</p>
      </div>

      <div>
        <label className={labelClass} htmlFor="confirmPassword">
          Nhập lại mật khẩu
        </label>
        <input
          id="confirmPassword"
          type="password"
          className={inputClass}
          value={confirmPassword}
          onChange={(event) => updateForm({ confirmPassword: event.target.value })}
          required
          autoComplete="new-password"
        />
      </div>

      {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-blue-600 px-4 py-3 font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Đang tạo tài khoản..." : "Tạo tài khoản"}
      </button>
    </form>
  );
}
