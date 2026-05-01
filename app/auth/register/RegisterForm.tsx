"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function RegisterForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    if (password !== confirmPassword) {
      setError("Xac nhan mat khau khong khop.");
      setLoading(false);
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
        setError(data.error ?? "Dang ky that bai.");
        return;
      }

      router.push(data.redirectTo ?? "/");
      // Sử dụng window.location để force full reload,
      // đảm bảo useUser re-fetch và hiển thị đúng menu admin/teacher
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
        <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="username">
          Username
        </label>
        <input
          id="username"
          type="text"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none ring-slate-200 focus:ring"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          required
        />
      </div>

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

      <div>
        <label
          className="mb-1 block text-sm font-medium text-slate-700"
          htmlFor="password"
        >
          Mat khau
        </label>
        <input
          id="password"
          type="password"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none ring-slate-200 focus:ring"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          minLength={8}
        />
        <p className="mt-1 text-xs text-slate-500">
          Toi thieu 8 ky tu, co chu thuong, chu hoa, so va ky tu dac biet.
        </p>
      </div>

      <div>
        <label
          className="mb-1 block text-sm font-medium text-slate-700"
          htmlFor="confirmPassword"
        >
          Nhap lai mat khau
        </label>
        <input
          id="confirmPassword"
          type="password"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none ring-slate-200 focus:ring"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
        />
      </div>

      {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {loading ? "Dang xu ly..." : "Dang ky"}
      </button>
    </form>
  );
}
