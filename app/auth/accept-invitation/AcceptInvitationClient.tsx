"use client";

import { useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { readJsonResponse } from "@/lib/http-response";

type Invitation = {
  email: string;
  username: string;
  language: { name: string } | null;
  expiresAt: string;
};

export default function AcceptInvitationClient() {
  const token = useSearchParams().get("token") ?? "";
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const response = await fetch(`/api/auth/invitations?token=${encodeURIComponent(token)}`, { cache: "no-store" });
      const data = await readJsonResponse(response).catch(() => ({}));
      if (cancelled) return;
      if (!response.ok) setMessage(data.error ?? "Lời mời không hợp lệ.");
      else setInvitation(data.invitation);
      setLoading(false);
    }
    void load();
    return () => { cancelled = true; };
  }, [token]);

  async function accept(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const response = await fetch("/api/auth/invitations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password, confirmPassword }),
    });
    const data = await readJsonResponse(response).catch(() => ({}));
    if (!response.ok) {
      setMessage(data.error ?? "Không thể nhận lời mời.");
      setLoading(false);
      return;
    }
    window.location.href = data.redirectTo ?? "/";
  }

  if (loading && !invitation) return <p className="text-sm text-slate-600">Đang kiểm tra lời mời...</p>;
  if (!invitation) return <p className="rounded-xl bg-red-50 p-5 text-sm font-medium text-red-700">{message}</p>;

  return (
    <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
      <p className="text-sm font-bold uppercase tracking-wide text-blue-700">Lời mời FinnCenter</p>
      <h1 className="mt-2 text-2xl font-bold text-slate-950">Thiết lập tài khoản giảng viên</h1>
      <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
        <p><strong>Tên:</strong> {invitation.username}</p>
        <p className="mt-1"><strong>Email:</strong> {invitation.email}</p>
        <p className="mt-1"><strong>Ngôn ngữ dạy:</strong> {invitation.language?.name ?? "Chưa xác định"}</p>
      </div>
      <form className="mt-5 space-y-4" onSubmit={accept}>
        <label className="block text-sm font-semibold text-slate-700">
          Mật khẩu
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="new-password" className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3" />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Xác nhận mật khẩu
          <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required autoComplete="new-password" className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3" />
        </label>
        {message ? <p className="text-sm font-medium text-red-700">{message}</p> : null}
        <button type="submit" disabled={loading} className="w-full rounded-xl bg-blue-600 px-4 py-3 font-bold text-white hover:bg-blue-700 disabled:opacity-60">
          {loading ? "Đang tạo tài khoản..." : "Đặt mật khẩu và vào hệ thống"}
        </button>
      </form>
    </section>
  );
}
