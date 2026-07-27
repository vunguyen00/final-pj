"use client";

import { Fragment, useMemo, useState, useSyncExternalStore, type ButtonHTMLAttributes } from "react";
import { createPollingStore } from "@/lib/client-polling-store";
import { readJsonResponse } from "@/lib/http-response";
import { ModalDialog } from "@/app/components/ModalDialog";

type WithdrawalComplaint = {
  id: string;
  reason: "NOT_RECEIVED" | "WRONG_AMOUNT" | "OTHER";
  reportedAmount: number | null;
  message: string;
  evidenceImageUrl: string | null;
  evidenceImageName: string | null;
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
  status: "PENDING" | "APPROVED" | "PAID" | "COMPLETED" | "REJECTED";
  note: string | null;
  createdAt: string;
  processedAt: string | null;
  teacher: { id: string; username: string; email: string };
  complaint: WithdrawalComplaint | null;
};

type ActionDialog =
  | { kind: "withdrawal"; item: AdminWithdrawal; action: "APPROVE" | "PAY" | "REJECT" }
  | { kind: "complaint"; item: AdminWithdrawal; action: "RESOLVE" | "REJECT" };

const money = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });
const dateTime = new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" });
const statusText = { PENDING: "Chờ duyệt", APPROVED: "Đã duyệt", PAID: "Đã thanh toán", COMPLETED: "Đã hoàn thành", REJECTED: "Đã từ chối" };
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

function formatDate(value: string | null) {
  return value ? dateTime.format(new Date(value)) : "-";
}

function useAdminRevenueWithdrawals(initialWithdrawals: AdminWithdrawal[]) {
  const [withdrawalStore] = useState(() => createPollingStore({
    initialValue: initialWithdrawals,
    intervalMs: 8000,
    load: async () => {
      const response = await fetch("/api/admin/revenue-withdrawals", { cache: "no-store" });
      const data = (await readJsonResponse(response).catch(() => ({}))) as { withdrawals?: AdminWithdrawal[] };
      if (!response.ok || !data.withdrawals) return initialWithdrawals;
      return data.withdrawals;
    },
  }));
  const withdrawals = useSyncExternalStore(withdrawalStore.subscribe, withdrawalStore.getSnapshot, withdrawalStore.getSnapshot);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionDialog, setActionDialog] = useState<ActionDialog | null>(null);
  const [actionForm, setActionForm] = useState({ note: "", transferTransactionCode: "" });
  const [actionError, setActionError] = useState("");
  const pendingCount = useMemo(() => withdrawals.filter((item) => item.status === "PENDING").length, [withdrawals]);
  const approvedCount = useMemo(() => withdrawals.filter((item) => item.status === "APPROVED").length, [withdrawals]);
  const openComplaintCount = useMemo(() => withdrawals.filter((item) => item.complaint?.status === "OPEN").length, [withdrawals]);
  const paidCount = useMemo(() => withdrawals.filter((item) => item.status === "PAID" || item.status === "COMPLETED").length, [withdrawals]);
  const totalPendingAmount = useMemo(() => withdrawals.filter((item) => item.status === "PENDING").reduce((sum, item) => sum + item.amount, 0), [withdrawals]);
  const totalApprovedAmount = useMemo(() => withdrawals.filter((item) => item.status === "APPROVED").reduce((sum, item) => sum + item.amount, 0), [withdrawals]);
  const totalPaidAmount = useMemo(() => withdrawals.filter((item) => item.status === "PAID" || item.status === "COMPLETED").reduce((sum, item) => sum + item.amount, 0), [withdrawals]);
  const openComplaintAmount = useMemo(() => withdrawals.filter((item) => item.complaint?.status === "OPEN").reduce((sum, item) => sum + item.amount, 0), [withdrawals]);

  function openActionDialog(dialog: ActionDialog) {
    setActionDialog(dialog);
    setActionForm({ note: "", transferTransactionCode: "" });
    setActionError("");
  }

  async function processWithdrawal(item: AdminWithdrawal, action: "APPROVE" | "PAY" | "REJECT", note: string, transferTransactionCode: string) {
    setProcessingId(`withdrawal:${item.id}`);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/revenue-withdrawals/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note, transferTransactionCode }),
      });
      const data = (await readJsonResponse(response)) as { error?: string; withdrawal?: AdminWithdrawal };
      if (!response.ok || !data.withdrawal) {
        setActionError(data.error ?? "Không thể xử lý yêu cầu.");
        return;
      }
      withdrawalStore.setValue((current) => current.map((entry) => entry.id === item.id ? data.withdrawal! : entry));
      setMessage(action === "APPROVE" ? "Đã duyệt yêu cầu và thông báo cho giảng viên." : action === "PAY" ? "Đã xác nhận thanh toán và thông báo cho giảng viên." : "Đã từ chối yêu cầu và thông báo cho giảng viên.");
      setActionDialog(null);
    } catch {
      setActionError("Lỗi mạng. Vui lòng thử lại.");
    } finally {
      setProcessingId(null);
    }
  }

  async function processComplaint(item: AdminWithdrawal, action: "RESOLVE" | "REJECT", note: string) {
    if (!item.complaint) return;

    setProcessingId(`complaint:${item.complaint.id}`);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/revenue-withdrawals/${item.id}/complaints/${item.complaint.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note }),
      });
      const data = (await readJsonResponse(response)) as { error?: string; complaint?: WithdrawalComplaint };
      if (!response.ok || !data.complaint) {
        setActionError(data.error ?? "Không thể xử lý khiếu nại.");
        return;
      }
      withdrawalStore.setValue((current) => current.map((entry) => entry.id === item.id ? { ...entry, complaint: data.complaint! } : entry));
      setMessage(action === "RESOLVE" ? "Đã đóng khiếu nại và thông báo cho giảng viên." : "Đã từ chối khiếu nại và thông báo cho giảng viên.");
      setActionDialog(null);
    } catch {
      setActionError("Lỗi mạng. Vui lòng thử lại.");
    } finally {
      setProcessingId(null);
    }
  }

  async function submitActionDialog(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!actionDialog) return;
    const note = actionForm.note.trim();
    const transferTransactionCode = actionForm.transferTransactionCode.trim();
    if (actionDialog.action === "REJECT" && !note) {
      setActionError("Vui lòng nhập lý do từ chối.");
      return;
    }
    if (actionDialog.kind === "withdrawal" && actionDialog.action === "PAY" && !transferTransactionCode) {
      setActionError("Vui lòng nhập mã giao dịch chuyển khoản.");
      return;
    }
    setActionError("");
    if (actionDialog.kind === "withdrawal") {
      await processWithdrawal(actionDialog.item, actionDialog.action, note, transferTransactionCode);
    } else {
      await processComplaint(actionDialog.item, actionDialog.action, note);
    }
  }

  return {
    withdrawals,
    processingId,
    message,
    expandedId,
    actionDialog,
    actionForm,
    actionError,
    pendingCount,
    approvedCount,
    openComplaintCount,
    paidCount,
    totalPendingAmount,
    totalApprovedAmount,
    totalPaidAmount,
    openComplaintAmount,
    setExpandedId,
    setActionDialog,
    setActionForm,
    openActionDialog,
    submitActionDialog,
  };
}

export default function AdminRevenueWithdrawals({ initialWithdrawals }: { initialWithdrawals: AdminWithdrawal[] }) {
  const {
    withdrawals,
    processingId,
    message,
    expandedId,
    actionDialog,
    actionForm,
    actionError,
    pendingCount,
    approvedCount,
    openComplaintCount,
    paidCount,
    totalPendingAmount,
    totalApprovedAmount,
    totalPaidAmount,
    openComplaintAmount,
    setExpandedId,
    setActionDialog,
    setActionForm,
    openActionDialog,
    submitActionDialog,
  } = useAdminRevenueWithdrawals(initialWithdrawals);

  return (
    <div className="space-y-5">
      {message ? <p role="status" className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">{message}</p> : null}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Summary label="Chờ duyệt" value={pendingCount} tone="amber" />
        <Summary label="Chờ chuyển tiền" value={approvedCount} tone="blue" />
        <Summary label="Khiếu nại mở" value={openComplaintCount} tone="rose" />
        <Summary label="Tổng yêu cầu" value={withdrawals.length} tone="slate" />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950">So do xu ly rut doanh thu</h2>
            <p className="text-sm text-slate-500">Theo doi nhanh tu luc giang vien gui yeu cau den khi da chuyen tien.</p>
          </div>
          <p className="text-sm font-semibold text-slate-500">{withdrawals.length} yeu cau</p>
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-4">
          <PipelineStep label="1. Cho duyet" count={pendingCount} amount={totalPendingAmount} tone="amber" />
          <PipelineStep label="2. Cho chuyen" count={approvedCount} amount={totalApprovedAmount} tone="blue" />
          <PipelineStep label="3. Da thanh toan" count={paidCount} amount={totalPaidAmount} tone="emerald" />
          <PipelineStep label="4. Can xem lai" count={openComplaintCount} amount={openComplaintAmount} tone="rose" />
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-xl font-bold text-slate-950">Yêu cầu rút doanh thu giảng viên</h2>
          <p className="mt-1 text-sm text-slate-500">Duyệt thông tin nhận tiền, xác nhận chuyển khoản và xử lý khiếu nại nếu giao dịch đã đóng nhưng giáo viên báo chưa nhận đủ.</p>
        </div>
        {withdrawals.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-slate-500">Chưa có yêu cầu rút doanh thu.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1180px] w-full border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Giảng viên</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Thời gian gửi</th>
                  <th className="px-4 py-3 text-right font-semibold">Số tiền</th>
                  <th className="px-4 py-3 font-semibold">Ngân hàng</th>
                  <th className="px-4 py-3 font-semibold">Số tài khoản</th>
                  <th className="px-4 py-3 font-semibold">Chủ tài khoản</th>
                  <th className="px-4 py-3 font-semibold">Trạng thái</th>
                  <th className="px-4 py-3 text-right font-semibold">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {withdrawals.map((item) => {
                  const complaintUi = item.complaint ? complaintStatusUi[item.complaint.status] : null;
                  const expanded = expandedId === item.id;

                  return (
                    <Fragment key={item.id}>
                      <tr className="align-top hover:bg-slate-50/70">
                        <td className="max-w-[180px] px-4 py-4">
                          <p className="truncate font-bold text-slate-950">{item.teacher.username}</p>
                          {item.complaint ? <p className="mt-1 text-xs font-semibold text-amber-700">Có khiếu nại</p> : null}
                        </td>
                        <td className="max-w-[240px] px-4 py-4">
                          <p className="truncate text-slate-600">{item.teacher.email}</p>
                        </td>
                        <td className="px-4 py-4 text-slate-600">{formatDate(item.createdAt)}</td>
                        <td className="px-4 py-4 text-right text-base font-black text-emerald-700">{money.format(item.amount)}</td>
                        <td className="max-w-[180px] px-4 py-4 font-semibold text-slate-900">
                          <p className="truncate">{item.bankName}</p>
                        </td>
                        <td className="px-4 py-4 font-mono text-sm text-slate-700">{item.accountNumber}</td>
                        <td className="max-w-[200px] px-4 py-4">
                          <p className="truncate text-slate-700">{item.accountName}</p>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${item.status === "PAID" || item.status === "COMPLETED" ? "bg-emerald-50 text-emerald-700" : item.status === "REJECTED" ? "bg-rose-50 text-rose-700" : item.status === "APPROVED" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"}`}>
                            {statusText[item.status]}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setExpandedId(expanded ? null : item.id)}
                              className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50"
                            >
                              {expanded ? "Thu gọn" : "Chi tiết"}
                            </button>
                            {item.status === "PENDING" ? (
                              <>
                                <Action disabled={processingId === `withdrawal:${item.id}`} onClick={() => openActionDialog({ kind: "withdrawal", item, action: "APPROVE" })}>Duyệt</Action>
                                <Action danger disabled={processingId === `withdrawal:${item.id}`} onClick={() => openActionDialog({ kind: "withdrawal", item, action: "REJECT" })}>Từ chối</Action>
                              </>
                            ) : null}
                            {item.status === "APPROVED" ? (
                              <>
                                <Action disabled={processingId === `withdrawal:${item.id}`} onClick={() => openActionDialog({ kind: "withdrawal", item, action: "PAY" })}>Đã chuyển</Action>
                                <Action danger disabled={processingId === `withdrawal:${item.id}`} onClick={() => openActionDialog({ kind: "withdrawal", item, action: "REJECT" })}>Từ chối</Action>
                              </>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                      {expanded ? (
                        <tr>
                          <td colSpan={9} className="bg-slate-50 px-4 py-4">
                            <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
                              <div className="rounded-lg border border-slate-200 bg-white p-4">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ghi chú giao dịch</p>
                                <p className="mt-2 text-sm leading-6 text-slate-700">{item.note || "Không có ghi chú."}</p>
                                {item.processedAt ? <p className="mt-2 text-xs text-slate-500">Xử lý lúc {formatDate(item.processedAt)}</p> : null}
                              </div>
                              <div className="rounded-lg border border-amber-200 bg-white p-4">
                                {item.complaint && complaintUi ? (
                                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                    <div>
                                      <div className="flex flex-wrap items-center gap-2">
                                        <p className="text-sm font-bold text-amber-950">Khiếu nại: {complaintReasonText[item.complaint.reason]}</p>
                                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${complaintUi.className}`}>{complaintUi.label}</span>
                                      </div>
                                      <p className="mt-2 text-sm leading-6 text-slate-700">{item.complaint.message}</p>
                                      {item.complaint.evidenceImageUrl ? (
                                        <a href={item.complaint.evidenceImageUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-xs font-bold text-blue-700 hover:text-blue-900">
                                          Xem ảnh minh chứng{item.complaint.evidenceImageName ? `: ${item.complaint.evidenceImageName}` : ""}
                                        </a>
                                      ) : null}
                                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-600">
                                        <span>Gửi lúc {formatDate(item.complaint.createdAt)}</span>
                                        {item.complaint.reportedAmount !== null ? <span>Thực nhận {money.format(item.complaint.reportedAmount)}</span> : null}
                                        {item.complaint.resolvedAt ? <span>Xử lý lúc {formatDate(item.complaint.resolvedAt)}</span> : null}
                                      </div>
                                      {item.complaint.adminNote ? <p className="mt-2 text-xs font-semibold text-slate-700">Ghi chú admin: {item.complaint.adminNote}</p> : null}
                                    </div>
                                    {item.complaint.status === "OPEN" ? (
                                      <div className="grid shrink-0 grid-cols-2 gap-2">
                                        <Action disabled={processingId === `complaint:${item.complaint.id}`} onClick={() => openActionDialog({ kind: "complaint", item, action: "RESOLVE" })}>Đóng</Action>
                                        <Action danger disabled={processingId === `complaint:${item.complaint.id}`} onClick={() => openActionDialog({ kind: "complaint", item, action: "REJECT" })}>Từ chối</Action>
                                      </div>
                                    ) : null}
                                  </div>
                                ) : (
                                  <p className="text-sm text-slate-500">Yêu cầu này chưa có khiếu nại.</p>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="hidden">
          {withdrawals.map((item) => {
            const complaintUi = item.complaint ? complaintStatusUi[item.complaint.status] : null;

            return (
              <article key={item.id} className="grid gap-4 px-5 py-5 xl:grid-cols-[1.1fr_.8fr_.8fr_auto] xl:items-center">
                <div>
                  <p className="font-bold text-slate-950">{item.teacher.username}</p>
                  <p className="text-sm text-slate-500">{item.teacher.email}</p>
                  <p className="mt-1 text-xs text-slate-400">Gửi lúc {formatDate(item.createdAt)}</p>
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
                  <span className={`rounded-full px-3 py-1 text-center text-xs font-bold ${item.status === "PAID" || item.status === "COMPLETED" ? "bg-emerald-50 text-emerald-700" : item.status === "REJECTED" ? "bg-rose-50 text-rose-700" : item.status === "APPROVED" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"}`}>{statusText[item.status]}</span>
                  {item.status === "PENDING" ? <div className="grid grid-cols-2 gap-2"><Action disabled={processingId === `withdrawal:${item.id}`} onClick={() => openActionDialog({ kind: "withdrawal", item, action: "APPROVE" })}>Duyệt</Action><Action danger disabled={processingId === `withdrawal:${item.id}`} onClick={() => openActionDialog({ kind: "withdrawal", item, action: "REJECT" })}>Từ chối</Action></div> : null}
                  {item.status === "APPROVED" ? <div className="grid grid-cols-2 gap-2"><Action disabled={processingId === `withdrawal:${item.id}`} onClick={() => openActionDialog({ kind: "withdrawal", item, action: "PAY" })}>Đã chuyển</Action><Action danger disabled={processingId === `withdrawal:${item.id}`} onClick={() => openActionDialog({ kind: "withdrawal", item, action: "REJECT" })}>Từ chối</Action></div> : null}
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
                        {item.complaint.evidenceImageUrl ? (
                          <a href={item.complaint.evidenceImageUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-xs font-bold text-blue-700 hover:text-blue-900">
                            Xem ảnh minh chứng{item.complaint.evidenceImageName ? `: ${item.complaint.evidenceImageName}` : ""}
                          </a>
                        ) : null}
                        <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-600">
                          <span>Gửi lúc {formatDate(item.complaint.createdAt)}</span>
                          {item.complaint.reportedAmount !== null ? <span>Thực nhận {money.format(item.complaint.reportedAmount)}</span> : null}
                          {item.complaint.resolvedAt ? <span>Xử lý lúc {formatDate(item.complaint.resolvedAt)}</span> : null}
                        </div>
                        {item.complaint.adminNote ? <p className="mt-2 text-xs font-semibold text-slate-700">Ghi chú admin: {item.complaint.adminNote}</p> : null}
                      </div>
                      {item.complaint.status === "OPEN" ? (
                        <div className="grid shrink-0 grid-cols-2 gap-2">
                          <Action disabled={processingId === `complaint:${item.complaint.id}`} onClick={() => openActionDialog({ kind: "complaint", item, action: "RESOLVE" })}>Đóng khiếu nại</Action>
                          <Action danger disabled={processingId === `complaint:${item.complaint.id}`} onClick={() => openActionDialog({ kind: "complaint", item, action: "REJECT" })}>Từ chối</Action>
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

      {actionDialog ? (
        <ModalDialog labelledBy="withdrawal-action-title" onClose={() => { if (!processingId) setActionDialog(null); }}>
          <form onSubmit={submitActionDialog} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <h2 id="withdrawal-action-title" className="text-lg font-bold text-slate-950">
              {actionDialog.kind === "complaint" ? (actionDialog.action === "RESOLVE" ? "Đóng khiếu nại" : "Từ chối khiếu nại") : actionDialog.action === "APPROVE" ? "Duyệt yêu cầu rút tiền" : actionDialog.action === "PAY" ? "Xác nhận đã chuyển tiền" : "Từ chối yêu cầu rút tiền"}
            </h2>
            <div className="mt-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
              <p className="font-semibold">{actionDialog.item.teacher.username}</p>
              <p className="mt-1">Số tiền: <strong>{money.format(actionDialog.item.amount)}</strong></p>
              <p className="mt-1">Nhận tại: {actionDialog.item.bankName} · {actionDialog.item.accountNumber}</p>
            </div>
            {actionDialog.kind === "withdrawal" && actionDialog.action === "PAY" ? (
              <div className="mt-4">
                <label className="text-sm font-semibold text-slate-700">Mã giao dịch *<input autoFocus value={actionForm.transferTransactionCode} onChange={(event) => setActionForm((current) => ({ ...current, transferTransactionCode: event.target.value }))} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" /></label>
              </div>
            ) : null}
            <label className="mt-4 block text-sm font-semibold text-slate-700">
              {actionDialog.action === "REJECT" ? "Lý do từ chối *" : "Ghi chú xử lý (không bắt buộc)"}
              <textarea autoFocus={actionDialog.action === "REJECT"} rows={3} maxLength={500} value={actionForm.note} onChange={(event) => setActionForm((current) => ({ ...current, note: event.target.value }))} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" />
            </label>
            {actionError ? <p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-sm font-semibold text-rose-700">{actionError}</p> : null}
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" disabled={processingId !== null} onClick={() => setActionDialog(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">Hủy</button>
              <button type="submit" disabled={processingId !== null} className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${actionDialog.action === "REJECT" ? "bg-rose-600" : "bg-blue-600"}`}>
                {processingId ? "Đang xử lý..." : "Xác nhận"}
              </button>
            </div>
          </form>
        </ModalDialog>
      ) : null}
    </div>
  );
}

function Action({ children, danger = false, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { danger?: boolean }) {
  return <button type="button" {...props} className={`rounded-lg px-3 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 ${danger ? "bg-rose-600 hover:bg-rose-700" : "bg-blue-600 hover:bg-blue-700"}`}>{children}</button>;
}

function PipelineStep({ label, count, amount, tone }: { label: string; count: number; amount: number; tone: "amber" | "blue" | "emerald" | "rose" }) {
  const toneClass = {
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    blue: "border-blue-200 bg-blue-50 text-blue-900",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
    rose: "border-rose-200 bg-rose-50 text-rose-900",
  }[tone];

  return (
    <article className={`rounded-xl border p-4 ${toneClass}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold">{label}</p>
        <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-black">{count}</span>
      </div>
      <p className="mt-4 text-xl font-black">{money.format(amount)}</p>
      <div className="mt-3 h-2 rounded-full bg-white/70">
        <div className="h-2 rounded-full bg-current" style={{ width: `${Math.min(100, Math.max(8, count * 18))}%` }} />
      </div>
    </article>
  );
}

function Summary({ label, value, tone }: { label: string; value: number; tone: "amber" | "blue" | "rose" | "slate" }) {
  return <article className={`rounded-xl border p-4 shadow-sm ${summaryColors[tone]}`}><p className="text-sm font-semibold opacity-70">{label}</p><p className="mt-2 text-3xl font-black">{value}</p></article>;
}
