"use client";

import { useState } from "react";

type AiPoints = {
  earned: number;
  spent: number;
  available: number;
};

type WalletTx = {
  id: string;
  type: "TOP_UP" | "PURCHASE";
  amount: number;
  status: string;
  createdAt: string;
  courseName?: string;
};

export type WalletData = {
  balance: number;
  aiPoints: AiPoints;
  transactions: WalletTx[];
};

type Notice = {
  message: string;
  isError: boolean;
};

type Props = {
  initialData: WalletData;
  initialNotice: Notice;
  canTopUp?: boolean;
};

const QUICK_AMOUNTS = [10000, 50000, 100000, 200000];
const MIN_TOP_UP_AMOUNT = 10000;

function formatVnd(value: number) {
  return `${Math.round(value).toLocaleString("vi-VN")}đ`;
}

function statusLabel(status: string) {
  if (status === "SUCCESS") return "Thành công";
  if (status === "PENDING") return "Đang chờ";
  if (status === "FAILED") return "Thất bại";
  return status;
}

function statusClass(status: string) {
  if (status === "SUCCESS") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "PENDING") return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "FAILED") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

export default function WalletClient({ initialData, initialNotice, canTopUp = true }: Props) {
  const { balance, aiPoints, transactions } = initialData;
  const [amount, setAmount] = useState("50000");
  const [loading, setLoading] = useState(false);
  const [noticeOverride, setNoticeOverride] = useState<Notice | null>(null);
  const notice = noticeOverride ?? initialNotice;

  async function handleTopUp() {
    if (!canTopUp) {
      setNoticeOverride({ message: "Tài khoản này không thể nạp ví.", isError: true });
      return;
    }

    const topUpAmount = Number(amount);
    if (!Number.isFinite(topUpAmount) || !Number.isInteger(topUpAmount) || topUpAmount < MIN_TOP_UP_AMOUNT) {
      setNoticeOverride({ message: "Vui lòng nhập số tiền hợp lệ, tối thiểu 10.000đ.", isError: true });
      return;
    }

    setLoading(true);
    setNoticeOverride({ message: "", isError: false });

    try {
      const res = await fetch("/api/wallet/top-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: topUpAmount }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNoticeOverride({ message: data?.error || "Không tạo được giao dịch nạp tiền.", isError: true });
        return;
      }

      if (!data?.paymentUrl) {
        setNoticeOverride({ message: "Không tạo được URL thanh toán.", isError: true });
        return;
      }

      window.location.href = data.paymentUrl;
    } catch {
      setNoticeOverride({ message: "Lỗi mạng. Vui lòng thử lại.", isError: true });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Ví của tôi</h1>
          <p className="mt-1 text-sm text-slate-600">Quản lý số dư và lịch sử giao dịch FinnCenter.</p>
        </div>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Số dư ví</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{formatVnd(balance)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Điểm AI khả dụng</p>
            <p className="mt-2 text-2xl font-bold text-blue-700">{aiPoints.available.toLocaleString("vi-VN")}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Tổng điểm đã tích lũy</p>
            <p className="mt-2 text-2xl font-bold text-emerald-700">{aiPoints.earned.toLocaleString("vi-VN")}</p>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Nạp tiền qua VNPAY Sandbox</h2>
              <p className="text-sm text-slate-500">Số tiền tối thiểu: {formatVnd(MIN_TOP_UP_AMOUNT)}</p>
            </div>
            <p className="text-sm font-medium text-slate-700">Số dư hiện tại: {formatVnd(balance)}</p>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
            <input
              type="number"
              min={MIN_TOP_UP_AMOUNT}
              step={1000}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-11 w-full rounded-lg border border-slate-300 px-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="Nhập số tiền"
              aria-label="Số tiền nạp"
            />
            <button
              type="button"
              onClick={handleTopUp}
              disabled={loading || !canTopUp}
              className="h-11 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {loading ? "Đang tạo..." : "Nạp tiền"}
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {QUICK_AMOUNTS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setAmount(String(value))}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                  Number(amount) === value
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {formatVnd(value)}
              </button>
            ))}
          </div>

          {notice.message ? (
            <p
              className={`mt-3 rounded-lg border px-3 py-2 text-sm ${
                notice.isError ? "border-rose-200 bg-rose-50 text-rose-700" : "border-blue-200 bg-blue-50 text-blue-700"
              }`}
            >
              {notice.message}
            </p>
          ) : null}
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-900">Lịch sử giao dịch</h2>
          <div className="mt-3 space-y-2">
            {transactions.length === 0 ? (
              <p className="text-sm text-slate-500">Chưa có giao dịch nào.</p>
            ) : (
              transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-slate-900">
                        {tx.type === "TOP_UP" ? "Nạp tiền" : `Mua khóa học${tx.courseName ? `: ${tx.courseName}` : ""}`}
                      </p>
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${statusClass(tx.status)}`}>
                        {statusLabel(tx.status)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">{new Date(tx.createdAt).toLocaleString("vi-VN")}</p>
                  </div>
                  <p className={`shrink-0 font-semibold ${tx.type === "TOP_UP" ? "text-emerald-700" : "text-rose-700"}`}>
                    {tx.type === "TOP_UP" && tx.status === "SUCCESS" ? "+" : tx.type === "PURCHASE" ? "-" : ""}
                    {formatVnd(tx.amount)}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
