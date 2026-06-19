"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const labelClass = "mb-1.5 block text-sm font-bold text-slate-700";
const inputClass = "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Dang nhap that bai.");
        return;
      }

      router.push(data.redirectTo ?? "/");
      window.location.href = data.redirectTo ?? "/";
    } catch {
      setError("Loi mang. Vui long thu lai.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
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
          onChange={(event) => setPassword(event.target.value)}
          required
          autoComplete="current-password"
          placeholder="Nhập mật khẩu"
        />
      </div>

      {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-blue-600 px-4 py-3 font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Đang đăng nhập..." : "Đăng nhập"}
      </button>
    </form>
  );
}
