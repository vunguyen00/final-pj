"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const labelClass = "mb-1.5 block text-sm font-bold text-slate-700";
const inputClass = "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

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
        setOtpMessage("Ma OTP da duoc gui den email cua ban.");
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

    try {
      const response = await fetch("/api/auth/verify-registration-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: otpEmail, code: otpCode }),
      });
      const data = await response.json();

      if (!response.ok) {
        updateForm({ error: data.error ?? "Xac thuc OTP that bai." });
        return;
      }

      router.push(data.redirectTo ?? "/");
      window.location.href = data.redirectTo ?? "/";
    } catch {
      updateForm({ error: "Loi mang. Vui long thu lai." });
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
        updateForm({ error: data.error ?? "Khong gui lai duoc OTP." });
        return;
      }

      setOtpMessage(data.alreadyActive ? "Tai khoan da duoc kich hoat." : "Ma OTP moi da duoc gui.");
    } catch {
      updateForm({ error: "Loi mang. Vui long thu lai." });
    } finally {
      setResending(false);
    }
  }

  if (otpEmail) {
    return (
      <form className="space-y-4" onSubmit={verifyOtp}>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          <p className="font-semibold">Xac thuc email</p>
          <p className="mt-1">Nhap ma OTP 6 chu so da gui den {otpEmail}.</p>
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
          />
        </div>

        {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}
        {otpMessage ? <p className="text-sm font-medium text-emerald-700">{otpMessage}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-blue-600 px-4 py-3 font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Dang xac thuc..." : "Xac thuc va dang nhap"}
        </button>
        <button
          type="button"
          disabled={resending || loading}
          onClick={() => void resendOtp()}
          className="w-full rounded-xl border border-slate-300 px-4 py-3 font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {resending ? "Dang gui lai..." : "Gui lai OTP"}
        </button>
      </form>
    );
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
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
