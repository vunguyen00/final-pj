"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

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
        />
      </div>

      {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {loading ? "Dang xu ly..." : "Dang nhap"}
      </button>
    </form>
  );
}
