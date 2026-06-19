"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const currency = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

type Withdrawal = {
  id: string;
  amount: number;
  bankName: string;
  accountNumber: string;
  accountName: string;
  status: "PENDING" | "APPROVED" | "PAID" | "REJECTED";
  note: string | null;
  createdAt: string;
};

const statusLabel = {
  PENDING: "Chờ xử lý",
  APPROVED: "Đã duyệt",
  PAID: "Đã thanh toán",
  REJECTED: "Từ chối",
};

export function RevenueWithdrawalPanel({
  availableRevenue,
  withdrawals,
  notifications,
}: {
  availableRevenue: number;
  withdrawals: Withdrawal[];
  notifications: Array<{ id: string; title: string; body: string; createdAt: string }>;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/teacher/revenue-withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(amount), bankName, accountNumber, accountName }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Không thể tạo yêu cầu rút tiền.");
        return;
      }
      setAmount("");
      setMessage("Yêu cầu rút doanh thu đã được ghi nhận.");
      router.refresh();
    } catch {
      setError("Lỗi mạng. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mt-6">
      {notifications.length > 0 ? (
        <div className="mb-5 rounded-2xl border border-blue-200 bg-blue-50 p-5">
          <h2 className="font-bold text-blue-950">Thông báo rút doanh thu</h2>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {notifications.map((item) => (
              <article key={item.id} className="rounded-xl bg-white/80 p-3 ring-1 ring-blue-100">
                <p className="text-sm font-bold text-blue-900">{item.title}</p>
                <p className="mt-1 text-sm text-slate-600">{item.body}</p>
                <p className="mt-1 text-xs text-slate-400">{new Date(item.createdAt).toLocaleString("vi-VN")}</p>
              </article>
            ))}
          </div>
        </div>
      ) : null}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
      <form onSubmit={submit} className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Rút doanh thu</p>
        <h2 className="mt-1 text-xl font-bold text-slate-950">Tạo yêu cầu rút tiền</h2>
        <p className="mt-2 text-sm text-slate-600">
          Khả dụng: <strong className="text-emerald-700">{currency.format(availableRevenue)}</strong>. Khoản này chỉ đến từ doanh thu bán khóa học, hoàn toàn tách biệt với ví nạp tiền.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Số tiền (VND)">
            <input aria-label="Số tiền muốn rút" inputMode="numeric" min="1" max={availableRevenue} required value={amount} onChange={(event) => setAmount(event.target.value.replace(/\D/g, ""))} className="field" placeholder="Ví dụ: 500000" />
          </Field>
          <Field label="Ngân hàng">
            <input required maxLength={100} value={bankName} onChange={(event) => setBankName(event.target.value)} className="field" placeholder="Tên ngân hàng" />
          </Field>
          <Field label="Số tài khoản">
            <input inputMode="numeric" required minLength={6} maxLength={30} value={accountNumber} onChange={(event) => setAccountNumber(event.target.value.replace(/\D/g, ""))} className="field" placeholder="Số tài khoản nhận tiền" />
          </Field>
          <Field label="Tên chủ tài khoản">
            <input required maxLength={100} value={accountName} onChange={(event) => setAccountName(event.target.value.toUpperCase())} className="field uppercase" placeholder="NGUYEN VAN A" />
          </Field>
        </div>

        {error ? <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-sm font-medium text-rose-700">{error}</p> : null}
        {message ? <p role="status" className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm font-medium text-emerald-700">{message}</p> : null}
        <button disabled={loading || availableRevenue <= 0} className="mt-5 w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300">
          {loading ? "Đang gửi yêu cầu..." : "Yêu cầu rút doanh thu"}
        </button>
      </form>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-bold text-slate-950">Lịch sử rút doanh thu</h2>
          <p className="mt-1 text-sm text-slate-500">Các yêu cầu đang chờ cũng được giữ lại khỏi số dư khả dụng.</p>
        </div>
        <div className="divide-y divide-slate-100">
          {withdrawals.map((item) => (
            <article key={item.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-bold text-slate-950">{currency.format(item.amount)}</p>
                <p className="text-sm text-slate-500">{item.bankName} · ••••{item.accountNumber.slice(-4)} · {new Date(item.createdAt).toLocaleString("vi-VN")}</p>
                {item.note ? <p className="mt-1 text-xs text-rose-600">{item.note}</p> : null}
              </div>
              <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${item.status === "REJECTED" ? "bg-rose-50 text-rose-700" : item.status === "PAID" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                {statusLabel[item.status]}
              </span>
            </article>
          ))}
          {withdrawals.length === 0 ? <p className="px-5 py-10 text-center text-sm text-slate-500">Chưa có yêu cầu rút doanh thu.</p> : null}
        </div>
      </div>
      <style jsx>{`.field { width: 100%; border-radius: .5rem; border: 1px solid #cbd5e1; padding: .7rem .85rem; color: #0f172a; outline: none; } .field:focus { border-color: #10b981; box-shadow: 0 0 0 3px rgb(16 185 129 / .12); }`}</style>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm font-semibold text-slate-700"><span className="mb-1.5 block">{label}</span>{children}</label>;
}
