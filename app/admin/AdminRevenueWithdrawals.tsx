"use client";

import { useMemo, useState, type ButtonHTMLAttributes } from "react";

type WithdrawalComplaint = {
  id: string;
  reason: "NOT_RECEIVED" | "WRONG_AMOUNT" | "OTHER";
  reportedAmount: number | null;
  message: string;
  status: "OPEN" | "RESOLVED" | "REJECTED";
  adminNote: string | null;
  resolvedAt: string | null;
  createdAt: string;
};

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
  complaint: WithdrawalComplaint | null;
};

const money = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });
const statusText = { PENDING: "Chờ duyệt", APPROVED: "Đã duyệt", PAID: "Đã thanh toán", REJECTED: "Đã từ chối" };
const complaintReasonText = {
  NOT_RECEIVED: "Tiền chưa về tài khoản",
  WRONG_AMOUNT: "Số tiền nhận chưa đúng",
  OTHER: "Vấn đề khác",
};
const complaintStatusUi = {
  OPEN: { label: "Đang xem xét", className: "bg-amber-50 text-amber-700" },
  RESOLVED: { label: "Đã đóng", className: "bg-emerald-50 text-emerald-700" },
  REJECTED: { label: "Bị từ chối", className: "bg-rose-50 text-rose-700" },
};
const summaryColors = {
  amber: "border-amber-200 bg-amber-50 text-amber-900",
  blue: "border-blue-200 bg-blue-50 text-blue-900",
  rose: "border-rose-200 bg-rose-50 text-rose-900",
  slate: "border-slate-200 bg-white text-slate-900",
};

export default function AdminRevenueWithdrawals({ initialWithdrawals }: { initialWithdrawals: AdminWithdrawal[] }) {
  const [withdrawals, setWithdrawals] = useState(initialWithdrawals);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const pendingCount = useMemo(() => withdrawals.filter((item) => item.status === "PENDING").length, [withdrawals]);
  const approvedCount = useMemo(() => withdrawals.filter((item) => item.status === "APPROVED").length, [withdrawals]);
  const openComplaintCount = useMemo(() => withdrawals.filter((item) => item.complaint?.status === "OPEN").length, [withdrawals]);

  async function processWithdrawal(item: AdminWithdrawal, action: "APPROVE" | "PAY" | "REJECT") {
    const note = action === "REJECT" ? window.prompt("Lý do từ chối yêu cầu rút tiền?")?.trim() : "";
    if (action === "REJECT" && !note) return;

    setProcessingId(`withdrawal:${item.id}`);
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

  async function processComplaint(item: AdminWithdrawal, action: "RESOLVE" | "REJECT") {
    if (!item.complaint) return;

    const promptText = action === "RESOLVE"
      ? "Ghi chú đóng khiếu nại (không bắt buộc):"
      : "Lý do từ chối khiếu nại?";
    const promptValue = window.prompt(promptText, "");
    if (promptValue === null) return;
    const note = promptValue.trim();
    if (action === "REJECT" && !note) return;

    setProcessingId(`complaint:${item.complaint.id}`);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/revenue-withdrawals/${item.id}/complaints/${item.complaint.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note }),
      });
      const data = (await response.json()) as { error?: string; complaint?: WithdrawalComplaint };
      if (!response.ok || !data.complaint) {
        setMessage(data.error ?? "Không thể xử lý khiếu nại.");
        return;
      }
      setWithdrawals((current) => current.map((entry) => entry.id === item.id ? { ...entry, complaint: data.complaint! } : entry));
      setMessage(action === "RESOLVE" ? "Đã đóng khiếu nại và thông báo cho giảng viên." : "Đã từ chối khiếu nại và thông báo cho giảng viên.");
    } catch {
      setMessage("Lỗi mạng. Vui lòng thử lại.");
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <div className="space-y-5">
      {message ? <p role="status" className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">{message}</p> : null}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Summary label="Chờ duyệt" value={pendingCount} tone="amber" />
        <Summary label="Chờ chuyển tiền" value={approvedCount} tone="blue" />
        <Summary label="Khiếu nại mở" value={openComplaintCount} tone="rose" />
        <Summary label="Tổng yêu cầu" value={withdrawals.length} tone="slate" />
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-xl font-bold text-slate-950">Yêu cầu rút doanh thu giảng viên</h2>
          <p className="mt-1 text-sm text-slate-500">Duyệt thông tin nhận tiền, xác nhận chuyển khoản và xử lý khiếu nại nếu giao dịch đã đóng nhưng giáo viên báo chưa nhận đủ.</p>
        </div>
        <div className="divide-y divide-slate-100">
          {withdrawals.map((item) => {
            const complaintUi = item.complaint ? complaintStatusUi[item.complaint.status] : null;

            return (
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
                  {item.status === "PENDING" ? <div className="grid grid-cols-2 gap-2"><Action disabled={processingId === `withdrawal:${item.id}`} onClick={() => void processWithdrawal(item, "APPROVE")}>Duyệt</Action><Action danger disabled={processingId === `withdrawal:${item.id}`} onClick={() => void processWithdrawal(item, "REJECT")}>Từ chối</Action></div> : null}
                  {item.status === "APPROVED" ? <div className="grid grid-cols-2 gap-2"><Action disabled={processingId === `withdrawal:${item.id}`} onClick={() => void processWithdrawal(item, "PAY")}>Đã chuyển</Action><Action danger disabled={processingId === `withdrawal:${item.id}`} onClick={() => void processWithdrawal(item, "REJECT")}>Từ chối</Action></div> : null}
                </div>
                {item.complaint && complaintUi ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 xl:col-span-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-bold text-amber-950">Khiếu nại: {complaintReasonText[item.complaint.reason]}</p>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${complaintUi.className}`}>{complaintUi.label}</span>
                        </div>
                        <p className="mt-1 text-sm text-slate-700">{item.complaint.message}</p>
                        <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-600">
                          <span>Gửi lúc {new Date(item.complaint.createdAt).toLocaleString("vi-VN")}</span>
                          {item.complaint.reportedAmount !== null ? <span>Thực nhận {money.format(item.complaint.reportedAmount)}</span> : null}
                          {item.complaint.resolvedAt ? <span>Xử lý lúc {new Date(item.complaint.resolvedAt).toLocaleString("vi-VN")}</span> : null}
                        </div>
                        {item.complaint.adminNote ? <p className="mt-2 text-xs font-semibold text-slate-700">Ghi chú admin: {item.complaint.adminNote}</p> : null}
                      </div>
                      {item.complaint.status === "OPEN" ? (
                        <div className="grid shrink-0 grid-cols-2 gap-2">
                          <Action disabled={processingId === `complaint:${item.complaint.id}`} onClick={() => void processComplaint(item, "RESOLVE")}>Đóng khiếu nại</Action>
                          <Action danger disabled={processingId === `complaint:${item.complaint.id}`} onClick={() => void processComplaint(item, "REJECT")}>Từ chối</Action>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
          {withdrawals.length === 0 ? <p className="px-5 py-12 text-center text-sm text-slate-500">Chưa có yêu cầu rút doanh thu.</p> : null}
        </div>
      </section>
    </div>
  );
}

function Action({ children, danger = false, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { danger?: boolean }) {
  return <button type="button" {...props} className={`rounded-lg px-3 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 ${danger ? "bg-rose-600 hover:bg-rose-700" : "bg-blue-600 hover:bg-blue-700"}`}>{children}</button>;
}

function Summary({ label, value, tone }: { label: string; value: number; tone: "amber" | "blue" | "rose" | "slate" }) {
  return <article className={`rounded-2xl border p-5 shadow-sm ${summaryColors[tone]}`}><p className="text-sm font-semibold opacity-70">{label}</p><p className="mt-2 text-3xl font-black">{value}</p></article>;
}
