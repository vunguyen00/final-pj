"use client";

import { Fragment, useMemo, useState, useSyncExternalStore, type ButtonHTMLAttributes } from "react";
import { createPollingStore } from "@/lib/client-polling-store";
import { readJsonResponse } from "@/lib/http-response";
import { ModalDialog } from "@/app/components/ModalDialog";
import type { AdminCourseRefund } from "./types";

const money = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });
const dateTime = new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" });
const statusCopy = {
  PENDING: { label: "Chờ xử lý", className: "bg-amber-50 text-amber-700 border-amber-200" },
  APPROVED: { label: "Đã hoàn tiền", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  REJECTED: { label: "Đã từ chối", className: "bg-rose-50 text-rose-700 border-rose-200" },
} satisfies Record<AdminCourseRefund["status"], { label: string; className: string }>;

function formatDate(value: string | null) {
  return value ? dateTime.format(new Date(value)) : "-";
}

export default function AdminCourseRefunds({ initialRefunds }: { initialRefunds: AdminCourseRefund[] }) {
  const [refundStore] = useState(() => createPollingStore({
    initialValue: initialRefunds,
    intervalMs: 8000,
    load: async () => {
      const response = await fetch("/api/admin/course-refunds", { cache: "no-store" });
      const data = (await readJsonResponse(response).catch(() => ({}))) as { refunds?: AdminCourseRefund[] };
      if (!response.ok || !data.refunds) return initialRefunds;
      return data.refunds;
    },
  }));
  const refunds = useSyncExternalStore(refundStore.subscribe, refundStore.getSnapshot, refundStore.getSnapshot);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [currentTs] = useState(() => Date.now());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionTarget, setActionTarget] = useState<{ item: AdminCourseRefund; action: "APPROVE" | "REJECT" } | null>(null);
  const [actionNote, setActionNote] = useState("");
  const [actionError, setActionError] = useState("");

  const stats = useMemo(() => {
    const pending = refunds.filter((item) => item.status === "PENDING");
    const approved = refunds.filter((item) => item.status === "APPROVED");
    return {
      pendingCount: pending.length,
      approvedCount: approved.length,
      pendingAmount: pending.reduce((sum, item) => sum + item.amount, 0),
      approvedAmount: approved.reduce((sum, item) => sum + item.amount, 0),
    };
  }, [refunds]);

  function openRefundAction(item: AdminCourseRefund, action: "APPROVE" | "REJECT") {
    setActionTarget({ item, action });
    setActionNote("");
    setActionError("");
  }

  async function processRefund(item: AdminCourseRefund, action: "APPROVE" | "REJECT", note: string) {
    setProcessingId(item.id);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/course-refunds/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note }),
      });
      const data = (await readJsonResponse(response).catch(() => ({}))) as { error?: string; refund?: AdminCourseRefund };

      if (!response.ok || !data.refund) {
        setActionError(data.error ?? "Không thể xử lý yêu cầu hoàn tiền.");
        return;
      }

      refundStore.setValue((current) => current.map((entry) => entry.id === item.id ? data.refund! : entry));
      setMessage(action === "APPROVE" ? "Đã duyệt yêu cầu, hủy hẳn quyền truy cập và gửi thông báo xử lý hoàn tiền bên ngoài hệ thống." : "Đã từ chối yêu cầu và mở lại quyền học từ tiến độ trước đó.");
      setActionTarget(null);
    } catch {
      setActionError("Lỗi mạng. Vui lòng thử lại.");
    } finally {
      setProcessingId(null);
    }
  }

  async function submitRefundAction(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!actionTarget) return;
    const note = actionNote.trim();
    if (actionTarget.action === "REJECT" && !note) {
      setActionError("Vui lòng nhập lý do từ chối hoàn tiền.");
      return;
    }
    setActionError("");
    await processRefund(actionTarget.item, actionTarget.action, note);
  }

  return (
    <div className="space-y-5">
      {message ? <p role="status" className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">{message}</p> : null}

      <section className="grid gap-4 md:grid-cols-4">
        <Summary label="Chờ xử lý" value={stats.pendingCount.toLocaleString("vi-VN")} hint={money.format(stats.pendingAmount)} tone="amber" />
        <Summary label="Đã hoàn tiền" value={stats.approvedCount.toLocaleString("vi-VN")} hint={money.format(stats.approvedAmount)} tone="emerald" />
        <Summary label="Tổng yêu cầu" value={refunds.length.toLocaleString("vi-VN")} hint="Tất cả trạng thái" tone="slate" />
        <Summary label="Cần chú ý" value={refunds.filter((item) => item.status === "PENDING" && currentTs - new Date(item.createdAt).getTime() > 86400000).length.toString()} hint="Quá 24 giờ" tone="rose" />
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-xl font-bold text-slate-950">Yêu cầu hoàn tiền khóa học</h2>
          <p className="mt-1 text-sm text-slate-500">Quyền học được tạm khóa ngay khi gửi yêu cầu. Duyệt để hủy hẳn quyền truy cập; từ chối để mở lại khóa học.</p>
        </div>

        {refunds.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-slate-500">Chưa có yêu cầu hoàn tiền.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1040px] w-full border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Học viên</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Thời gian gửi</th>
                  <th className="px-4 py-3 font-semibold">Khóa học</th>
                  <th className="px-4 py-3 text-right font-semibold">Số tiền</th>
                  <th className="px-4 py-3 font-semibold">Trạng thái</th>
                  <th className="px-4 py-3 text-right font-semibold">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {refunds.map((item) => {
                  const status = statusCopy[item.status];
                  const expanded = expandedId === item.id;

                  return (
                    <Fragment key={item.id}>
                      <tr className="align-top hover:bg-slate-50/70">
                        <td className="max-w-[180px] px-4 py-4">
                          <p className="truncate font-bold text-slate-950">{item.student.username}</p>
                        </td>
                        <td className="max-w-[240px] px-4 py-4">
                          <p className="truncate text-slate-600">{item.student.email}</p>
                        </td>
                        <td className="px-4 py-4 text-slate-600">{formatDate(item.createdAt)}</td>
                        <td className="max-w-[320px] px-4 py-4">
                          <p className="truncate font-semibold text-slate-900">{item.course.name}</p>
                          <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{item.reason}</p>
                        </td>
                        <td className="px-4 py-4 text-right text-base font-black text-emerald-700">{money.format(item.amount)}</td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${status.className}`}>{status.label}</span>
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
                                <Action disabled={processingId === item.id} onClick={() => openRefundAction(item, "APPROVE")}>Duyệt</Action>
                                <Action danger disabled={processingId === item.id} onClick={() => openRefundAction(item, "REJECT")}>Từ chối</Action>
                              </>
                            ) : (
                              <span className="inline-flex h-9 items-center text-xs font-semibold text-slate-400">Đã xử lý</span>
                            )}
                          </div>
                        </td>
                      </tr>
                      {expanded ? (
                        <tr>
                          <td colSpan={7} className="bg-slate-50 px-4 py-4">
                            <div className="grid gap-4 lg:grid-cols-2">
                              <div className="rounded-lg border border-slate-200 bg-white p-4">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Lý do hoàn tiền</p>
                                <p className="mt-2 text-sm leading-6 text-slate-700">{item.reason}</p>
                              </div>
                              <div className="rounded-lg border border-slate-200 bg-white p-4">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ghi chú xử lý</p>
                                <p className="mt-2 text-sm leading-6 text-slate-700">{item.adminNote || "Không có ghi chú."}</p>
                                {item.processedAt ? <p className="mt-2 text-xs text-slate-500">Xử lý lúc {formatDate(item.processedAt)}</p> : null}
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
          {refunds.map((item) => {
            const status = statusCopy[item.status];
            return (
              <article key={item.id} className="grid gap-4 px-5 py-5 xl:grid-cols-[1fr_.9fr_.7fr_auto] xl:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-slate-950">{item.student.username}</p>
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${status.className}`}>{status.label}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{item.student.email}</p>
                  <p className="mt-1 text-xs text-slate-400">Gửi lúc {formatDate(item.createdAt)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400">Khóa học</p>
                  <p className="mt-1 font-semibold text-slate-900">{item.course.name}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-600">{item.reason}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400">Số tiền</p>
                  <p className="mt-1 text-lg font-black text-emerald-700">{money.format(item.amount)}</p>
                  {item.processedAt ? <p className="mt-1 text-xs text-slate-500">Xử lý lúc {formatDate(item.processedAt)}</p> : null}
                  {item.adminNote ? <p className="mt-1 text-xs text-slate-600">Ghi chú: {item.adminNote}</p> : null}
                </div>
                <div className="flex min-w-44 flex-col gap-2">
                  {item.status === "PENDING" ? (
                    <>
                      <Action disabled={processingId === item.id} onClick={() => openRefundAction(item, "APPROVE")}>Duyệt hoàn tiền</Action>
                      <Action danger disabled={processingId === item.id} onClick={() => openRefundAction(item, "REJECT")}>Từ chối</Action>
                    </>
                  ) : (
                    <span className="text-center text-xs font-semibold text-slate-400">Đã xử lý</span>
                  )}
                </div>
              </article>
            );
          })}
          {refunds.length === 0 ? <p className="px-5 py-12 text-center text-sm text-slate-500">Chưa có yêu cầu hoàn tiền.</p> : null}
        </div>
      </section>

      {actionTarget ? (
        <ModalDialog labelledBy="refund-action-title" onClose={() => { if (!processingId) setActionTarget(null); }}>
          <form onSubmit={submitRefundAction} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <h2 id="refund-action-title" className="text-lg font-bold text-slate-950">
              {actionTarget.action === "APPROVE" ? "Duyệt hoàn tiền khóa học" : "Từ chối hoàn tiền"}
            </h2>
            <div className="mt-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
              <p className="font-semibold">{actionTarget.item.student.username}</p>
              <p className="mt-1">Khóa học: {actionTarget.item.course.name}</p>
              <p className="mt-1">Số tiền: <strong>{money.format(actionTarget.item.amount)}</strong></p>
            </div>
            {actionTarget.action === "APPROVE" ? (
              <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-800">
                Quyền học hiện đã tạm khóa. Khi xác nhận, quyền truy cập sẽ bị hủy hẳn và yêu cầu được đánh dấu để hoàn tiền ngoài hệ thống.
              </p>
            ) : null}
            <label className="mt-4 block text-sm font-semibold text-slate-700">
              {actionTarget.action === "REJECT" ? "Lý do từ chối *" : "Ghi chú xử lý (không bắt buộc)"}
              <textarea autoFocus rows={3} maxLength={500} value={actionNote} onChange={(event) => setActionNote(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" />
            </label>
            {actionError ? <p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-sm font-semibold text-rose-700">{actionError}</p> : null}
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" disabled={processingId !== null} onClick={() => setActionTarget(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">Hủy</button>
              <button type="submit" disabled={processingId !== null} className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${actionTarget.action === "REJECT" ? "bg-rose-600" : "bg-blue-600"}`}>
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

function Summary({ label, value, hint, tone }: { label: string; value: string; hint: string; tone: "amber" | "emerald" | "rose" | "slate" }) {
  const className = {
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
    rose: "border-rose-200 bg-rose-50 text-rose-900",
    slate: "border-slate-200 bg-white text-slate-900",
  }[tone];

  return (
    <article className={`rounded-xl border p-4 shadow-sm ${className}`}>
      <p className="text-sm font-semibold opacity-70">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
      <p className="mt-1 text-xs font-semibold opacity-70">{hint}</p>
    </article>
  );
}
