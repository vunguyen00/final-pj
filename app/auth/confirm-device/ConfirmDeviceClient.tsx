"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { readJsonResponse } from "@/lib/http-response";

export default function ConfirmDeviceClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function confirmDevice() {
    if (!token || loading) return;
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/confirm-device", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await readJsonResponse(response).catch(() => ({}));
      if (!response.ok) {
        setMessage(data.error ?? "Không thể xác nhận thiết bị.");
        return;
      }
      window.location.href = data.redirectTo ?? "/";
    } catch {
      setMessage("Lỗi mạng. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
      <p className="text-sm font-bold uppercase tracking-wide text-blue-700">Bảo mật tài khoản</p>
      <h1 className="mt-2 text-2xl font-bold text-slate-950">Xác nhận thiết bị đăng nhập</h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        Sau khi xác nhận, thiết bị này sẽ được ghi nhớ. Mọi phiên đăng nhập đang hoạt động trên thiết bị khác sẽ bị thu hồi.
      </p>
      {!token ? (
        <p className="mt-5 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700">Liên kết thiếu mã xác nhận.</p>
      ) : (
        <button
          type="button"
          onClick={() => void confirmDevice()}
          disabled={loading}
          className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3 font-bold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? "Đang xác nhận..." : "Đây là thiết bị của tôi"}
        </button>
      )}
      {message ? <p className="mt-4 text-sm font-medium text-red-700">{message}</p> : null}
    </section>
  );
}
