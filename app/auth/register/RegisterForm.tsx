"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const labelClass = "mb-1 block text-sm font-medium text-foreground";
const inputClass = "w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground outline-none ring-primary/20 focus:ring-2";

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
        <label className={labelClass} htmlFor="username">
          Username
        </label>
        <input
          id="username"
          type="text"
          className={inputClass}
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          required
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
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="password">
          Mat khau
        </label>
        <input
          id="password"
          type="password"
          className={inputClass}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          minLength={8}
        />
        <p className="mt-1 text-xs text-muted-foreground">Toi thieu 8 ky tu, co chu thuong, chu hoa, so va ky tu dac biet.</p>
      </div>

      <div>
        <label className={labelClass} htmlFor="confirmPassword">
          Nhap lai mat khau
        </label>
        <input
          id="confirmPassword"
          type="password"
          className={inputClass}
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
        />
      </div>

      {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Dang xu ly..." : "Dang ky"}
      </button>
    </form>
  );
}
