"use client";

import { useMemo, useState } from "react";

export type AdminWithdrawal = {
  id: string;
  amount: number;
  bankName: string;
  accountNumber: string;
  accountName: string;
  status: "PENDING" | "APPROVED" | "PAID" | "REJECTED";
  note: string | null;
  createdAt: string;
  processedAt: string | null;
  teacher: { id: string; username: string; email: string };
};

const money = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });
const statusText = { PENDING: "Chờ duyệt", APPROVED: "Đã duyệt", PAID: "Đã thanh toán", REJECTED: "Đã từ chối" };

export default function AdminRevenueWithdrawals({ initialWithdrawals }: { initialWithdrawals: AdminWithdrawal[] }) {
  const [withdrawals, setWithdrawals] = useState(initialWithdrawals);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const pendingCount = useMemo(() => withdrawals.filter((item) => item.status === "PENDING").length, [withdrawals]);
  const approvedCount = useMemo(() => withdrawals.filter((item) => item.status === "APPROVED").length, [withdrawals]);

  async function processWithdrawal(item: AdminWithdrawal, action: "APPROVE" | "PAY" | "REJECT") {
    const note = action === "REJECT" ? window.prompt("Lý do từ chối yêu cầu rút tiền?")?.trim() : "";
    if (action === "REJECT" && !note) return;

    setProcessingId(item.id);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/revenue-withdrawals/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note }),
      });
      const data = (await response.json()) as { error?: string; withdrawal?: AdminWithdrawal };
      if (!response.ok || !data.withdrawal) {
        setMessage(data.error ?? "Không thể xử lý yêu cầu.");
        return;
      }
      setWithdrawals((current) => current.map((entry) => entry.id === item.id ? data.withdrawal! : entry));
      setMessage(action === "APPROVE" ? "Đã duyệt yêu cầu và thông báo cho giảng viên." : action === "PAY" ? "Đã xác nhận thanh toán và thông báo cho giảng viên." : "Đã từ chối yêu cầu và thông báo cho giảng viên.");
    } catch {
      setMessage("Lỗi mạng. Vui lòng thử lại.");
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <div className="space-y-5">
      {message ? <p role="status" className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">{message}</p> : null}
      <section className="grid gap-4 sm:grid-cols-3">
        <Summary label="Chờ duyệt" value={pendingCount} tone="amber" />
        <Summary label="Chờ chuyển tiền" value={approvedCount} tone="blue" />
        <Summary label="Tổng yêu cầu" value={withdrawals.length} tone="slate" />
      </section>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-xl font-bold text-slate-950">Yêu cầu rút doanh thu giảng viên</h2>
          <p className="mt-1 text-sm text-slate-500">Duyệt thông tin nhận tiền, sau đó xác nhận khi đã chuyển khoản. Mỗi trạng thái đều được thông báo tới giảng viên.</p>
        </div>
        <div className="divide-y divide-slate-100">
          {withdrawals.map((item) => (
            <article key={item.id} className="grid gap-4 px-5 py-5 xl:grid-cols-[1.1fr_.8fr_.8fr_auto] xl:items-center">
              <div>
                <p className="font-bold text-slate-950">{item.teacher.username}</p>
                <p className="text-sm text-slate-500">{item.teacher.email}</p>
                <p className="mt-1 text-xs text-slate-400">Gửi lúc {new Date(item.createdAt).toLocaleString("vi-VN")}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-slate-400">Số tiền</p>
                <p className="mt-1 text-lg font-black text-emerald-700">{money.format(item.amount)}</p>
              </div>
              <div className="text-sm">
                <p className="font-bold text-slate-900">{item.bankName}</p>
                <p className="text-slate-600">{item.accountNumber}</p>
                <p className="text-xs font-semibold text-slate-500">{item.accountName}</p>
                {item.note ? <p className="mt-1 text-xs text-rose-600">{item.note}</p> : null}
              </div>
              <div className="flex min-w-48 flex-col items-stretch gap-2">
                <span className={`rounded-full px-3 py-1 text-center text-xs font-bold ${item.status === "PAID" ? "bg-emerald-50 text-emerald-700" : item.status === "REJECTED" ? "bg-rose-50 text-rose-700" : item.status === "APPROVED" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"}`}>{statusText[item.status]}</span>
                {item.status === "PENDING" ? <div className="grid grid-cols-2 gap-2"><Action disabled={processingId === item.id} onClick={() => void processWithdrawal(item, "APPROVE")}>Duyệt</Action><Action danger disabled={processingId === item.id} onClick={() => void processWithdrawal(item, "REJECT")}>Từ chối</Action></div> : null}
                {item.status === "APPROVED" ? <div className="grid grid-cols-2 gap-2"><Action disabled={processingId === item.id} onClick={() => void processWithdrawal(item, "PAY")}>Đã chuyển</Action><Action danger disabled={processingId === item.id} onClick={() => void processWithdrawal(item, "REJECT")}>Từ chối</Action></div> : null}
              </div>
            </article>
          ))}
          {withdrawals.length === 0 ? <p className="px-5 py-12 text-center text-sm text-slate-500">Chưa có yêu cầu rút doanh thu.</p> : null}
        </div>
      </section>
    </div>
  );
}

function Action({ children, danger = false, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { danger?: boolean }) {
  return <button type="button" {...props} className={`rounded-lg px-3 py-2 text-xs font-bold text-white disabled:opacity-50 ${danger ? "bg-rose-600 hover:bg-rose-700" : "bg-blue-600 hover:bg-blue-700"}`}>{children}</button>;
}

function Summary({ label, value, tone }: { label: string; value: number; tone: "amber" | "blue" | "slate" }) {
  const colors = { amber: "border-amber-200 bg-amber-50 text-amber-900", blue: "border-blue-200 bg-blue-50 text-blue-900", slate: "border-slate-200 bg-white text-slate-900" };
  return <article className={`rounded-2xl border p-5 shadow-sm ${colors[tone]}`}><p className="text-sm font-semibold opacity-70">{label}</p><p className="mt-2 text-3xl font-black">{value}</p></article>;
}
