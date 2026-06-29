"use client";

import { useRef, useState, type FormEvent, type ReactNode, type UIEvent } from "react";
import { useRouter } from "next/navigation";

const currency = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

type ComplaintReason = "NOT_RECEIVED" | "WRONG_AMOUNT" | "OTHER";
type ComplaintStatus = "OPEN" | "RESOLVED" | "REJECTED";
type ActivityTab = "notifications" | "withdrawals";
type RevenueNotification = { id: string; title: string; body: string; createdAt: string };

const NOTIFICATION_PAGE_SIZE = 20;

type WithdrawalComplaint = {
  id: string;
  reason: ComplaintReason;
  reportedAmount: number | null;
  message: string;
  status: ComplaintStatus;
  adminNote: string | null;
  resolvedAt: string | null;
  createdAt: string;
};

type Withdrawal = {
  id: string;
  amount: number;
  bankName: string;
  accountNumber: string;
  accountName: string;
  status: "PENDING" | "APPROVED" | "PAID" | "REJECTED";
  note: string | null;
  createdAt: string;
  complaint: WithdrawalComplaint | null;
};

const statusLabel = {
  PENDING: "Chờ xử lý",
  APPROVED: "Đã duyệt",
  PAID: "Đã thanh toán",
  REJECTED: "Từ chối",
};

const complaintReasonLabel: Record<ComplaintReason, string> = {
  NOT_RECEIVED: "Tiền chưa về tài khoản",
  WRONG_AMOUNT: "Số tiền nhận chưa đúng",
  OTHER: "Vấn đề khác",
};

const complaintStatusUi: Record<ComplaintStatus, { label: string; className: string }> = {
  OPEN: { label: "Đang xem xét", className: "bg-amber-50 text-amber-700 ring-amber-200" },
  RESOLVED: { label: "Đã xử lý", className: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  REJECTED: { label: "Bị từ chối", className: "bg-rose-50 text-rose-700 ring-rose-200" },
};

const fieldClassName = "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-950 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10";

export function RevenueWithdrawalPanel({
  availableRevenue,
  withdrawals,
  notifications,
}: {
  availableRevenue: number;
  withdrawals: Withdrawal[];
  notifications: RevenueNotification[];
}) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [withdrawalLoading, setWithdrawalLoading] = useState(false);
  const [complaintLoading, setComplaintLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [withdrawalOpen, setWithdrawalOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [activityTab, setActivityTab] = useState<ActivityTab>("notifications");
  const [loadedNotifications, setLoadedNotifications] = useState(notifications);
  const [hasMoreNotifications, setHasMoreNotifications] = useState(notifications.length >= NOTIFICATION_PAGE_SIZE);
  const [loadingMoreNotifications, setLoadingMoreNotifications] = useState(false);
  const loadingMoreNotificationsRef = useRef(false);
  const [complaintTarget, setComplaintTarget] = useState<Withdrawal | null>(null);
  const [complaintReason, setComplaintReason] = useState<ComplaintReason>("NOT_RECEIVED");
  const [reportedAmount, setReportedAmount] = useState("");
  const [complaintMessage, setComplaintMessage] = useState("");

  async function submitWithdrawal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWithdrawalLoading(true);
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
      setWithdrawalOpen(false);
      router.refresh();
    } catch {
      setError("Lỗi mạng. Vui lòng thử lại.");
    } finally {
      setWithdrawalLoading(false);
    }
  }

  function openComplaint(item: Withdrawal) {
    setActivityOpen(false);
    setComplaintTarget(item);
    setComplaintReason("NOT_RECEIVED");
    setReportedAmount("");
    setComplaintMessage("");
    setError("");
    setMessage("");
  }

  function openWithdrawal() {
    setWithdrawalOpen(true);
    setError("");
    setMessage("");
  }

  async function submitComplaint(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!complaintTarget) return;

    setComplaintLoading(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/teacher/revenue-withdrawals/${complaintTarget.id}/complaints`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: complaintReason,
          reportedAmount: reportedAmount ? Number(reportedAmount) : null,
          message: complaintMessage,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Không thể gửi khiếu nại.");
        return;
      }
      setComplaintTarget(null);
      setMessage("Khiếu nại đã được gửi tới admin để kiểm tra.");
      router.refresh();
    } catch {
      setError("Lỗi mạng. Vui lòng thử lại.");
    } finally {
      setComplaintLoading(false);
    }
  }

  async function loadMoreNotifications() {
    if (loadingMoreNotificationsRef.current || !hasMoreNotifications) return;

    loadingMoreNotificationsRef.current = true;
    setLoadingMoreNotifications(true);
    try {
      const response = await fetch(`/api/teacher/revenue-notifications?skip=${loadedNotifications.length}&take=${NOTIFICATION_PAGE_SIZE}`);
      const data = (await response.json()) as {
        error?: string;
        notifications?: RevenueNotification[];
        hasMore?: boolean;
      };
      if (!response.ok || !data.notifications) {
        setHasMoreNotifications(false);
        return;
      }
      setLoadedNotifications((current) => {
        const seen = new Set(current.map((item) => item.id));
        const nextItems = data.notifications!.filter((item) => !seen.has(item.id));
        return [...current, ...nextItems];
      });
      setHasMoreNotifications(Boolean(data.hasMore));
    } catch {
      setHasMoreNotifications(false);
    } finally {
      loadingMoreNotificationsRef.current = false;
      setLoadingMoreNotifications(false);
    }
  }

  function handleActivityScroll(event: UIEvent<HTMLDivElement>) {
    if (activityTab !== "notifications") return;
    const target = event.currentTarget;
    const distanceToBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
    if (distanceToBottom < 96) {
      void loadMoreNotifications();
    }
  }

  return (
    <section className="mt-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-slate-600">
          Khả dụng: <strong className="text-emerald-700">{currency.format(availableRevenue)}</strong>
        </div>
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={openWithdrawal}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700"
          >
            <BanknoteIcon />
            <span>Rút doanh thu</span>
          </button>
          <button
            type="button"
            aria-label="Thông báo rút doanh thu"
            onClick={() => {
              setActivityTab("notifications");
              setActivityOpen(true);
            }}
            className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-blue-200 bg-white text-blue-700 shadow-sm hover:bg-blue-50"
          >
            <BellIcon />
            <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-blue-600 px-1.5 py-0.5 text-center text-xs font-bold text-white">{loadedNotifications.length}</span>
          </button>
        </div>
      </div>

      {message ? <p role="status" className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm font-medium text-emerald-700">{message}</p> : null}

      {withdrawalOpen ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70 px-4 py-6 backdrop-blur-sm">
          <form onSubmit={submitWithdrawal} className="flex max-h-[86vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-white/20">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Rút doanh thu</p>
                <h2 className="mt-1 text-xl font-bold text-slate-950">Tạo yêu cầu rút tiền</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Khả dụng: <strong className="text-emerald-700">{currency.format(availableRevenue)}</strong>
                </p>
              </div>
              <button type="button" onClick={() => setWithdrawalOpen(false)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">
                Đóng
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5">
              <p className="text-sm text-slate-600">Khoản này chỉ đến từ doanh thu bán khóa học, hoàn toàn tách biệt với ví nạp tiền.</p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Field label="Số tiền (VND)">
                  <input aria-label="Số tiền muốn rút" inputMode="numeric" min="1" max={availableRevenue} required value={amount} onChange={(event) => setAmount(event.target.value.replace(/\D/g, ""))} className={fieldClassName} placeholder="Ví dụ: 500000" />
                </Field>
                <Field label="Ngân hàng">
                  <input required maxLength={100} value={bankName} onChange={(event) => setBankName(event.target.value)} className={fieldClassName} placeholder="Tên ngân hàng" />
                </Field>
                <Field label="Số tài khoản">
                  <input inputMode="numeric" required minLength={6} maxLength={30} value={accountNumber} onChange={(event) => setAccountNumber(event.target.value.replace(/\D/g, ""))} className={fieldClassName} placeholder="Số tài khoản nhận tiền" />
                </Field>
                <Field label="Tên chủ tài khoản">
                  <input required maxLength={100} value={accountName} onChange={(event) => setAccountName(event.target.value.toUpperCase())} className={`${fieldClassName} uppercase`} placeholder="NGUYEN VAN A" />
                </Field>
              </div>
              {error && !complaintTarget ? <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-sm font-medium text-rose-700">{error}</p> : null}
            </div>

            <div className="border-t border-slate-200 bg-slate-50 px-5 py-4">
              <button disabled={withdrawalLoading || availableRevenue <= 0} className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300">
                {withdrawalLoading ? "Đang gửi yêu cầu..." : "Yêu cầu rút doanh thu"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {activityOpen ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70 px-4 py-6 backdrop-blur-sm">
          <div className="flex h-[84vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-white/20">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-blue-700">Teacher revenue</p>
                <h2 className="mt-1 text-xl font-bold text-slate-950">Thông báo rút doanh thu</h2>
                <p className="mt-1 text-sm text-slate-500">Xem thông báo và lịch sử rút tiền trong một cửa sổ riêng.</p>
              </div>
              <button type="button" onClick={() => setActivityOpen(false)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">
                Đóng
              </button>
            </div>

            <div className="flex gap-2 border-b border-slate-200 bg-slate-50 px-5 py-3">
              <button
                type="button"
                onClick={() => setActivityTab("notifications")}
                className={`rounded-lg px-3 py-2 text-sm font-bold ${activityTab === "notifications" ? "bg-blue-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}
              >
                Thông báo ({loadedNotifications.length})
              </button>
              <button
                type="button"
                onClick={() => setActivityTab("withdrawals")}
                className={`rounded-lg px-3 py-2 text-sm font-bold ${activityTab === "withdrawals" ? "bg-blue-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}
              >
                Lịch sử rút tiền({withdrawals.length})
              </button>
            </div>

            <div onScroll={handleActivityScroll} className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-slate-50 p-5">
              {activityTab === "notifications" ? (
                <div className="space-y-2">
                  {loadedNotifications.map((item) => (
                    <article key={item.id} className="grid gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-blue-900">{item.title}</p>
                        <p className="mt-1 text-sm text-slate-600">{item.body}</p>
                      </div>
                      <p className="whitespace-nowrap text-xs text-slate-400">{new Date(item.createdAt).toLocaleString("vi-VN")}</p>
                    </article>
                  ))}
                  {loadedNotifications.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">Chưa có thông báo rút doanh thu.</p> : null}
                  {loadingMoreNotifications ? <p className="py-3 text-center text-sm font-semibold text-blue-700">Đang tải thêm thông báo...</p> : null}
                  {!loadingMoreNotifications && !hasMoreNotifications && loadedNotifications.length > 0 ? <p className="py-3 text-center text-xs font-semibold uppercase text-slate-400">Đã hết thông báo</p> : null}
                </div>
              ) : (
                <div className="space-y-2">
                  {withdrawals.map((item) => {
                    const complaintUi = item.complaint ? complaintStatusUi[item.complaint.status] : null;

                    return (
                      <article key={item.id} className="grid gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-bold text-slate-950">{currency.format(item.amount)}</p>
                            <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-bold ${item.status === "REJECTED" ? "bg-rose-50 text-rose-700" : item.status === "PAID" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                              {statusLabel[item.status]}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-slate-500">{item.bankName} · ••••{item.accountNumber.slice(-4)} · {new Date(item.createdAt).toLocaleString("vi-VN")}</p>
                          {item.note ? <p className="mt-1 text-xs text-rose-600">{item.note}</p> : null}
                          {item.complaint && complaintUi ? (
                            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-bold text-amber-900">Khiếu nại: {complaintReasonLabel[item.complaint.reason]}</p>
                                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${complaintUi.className}`}>{complaintUi.label}</span>
                              </div>
                              {item.complaint.reportedAmount !== null ? (
                                <p className="mt-1 text-xs text-amber-800">Số tiền thực nhận: {currency.format(item.complaint.reportedAmount)}</p>
                              ) : null}
                              <p className="mt-1 text-xs text-slate-600">{item.complaint.message}</p>
                              {item.complaint.adminNote ? <p className="mt-1 text-xs font-semibold text-slate-700">Phản hồi admin: {item.complaint.adminNote}</p> : null}
                            </div>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 items-start justify-end">
                          {item.status === "PAID" && !item.complaint ? (
                            <button type="button" onClick={() => openComplaint(item)} className="rounded-lg border border-amber-300 px-3 py-2 text-xs font-bold text-amber-700 hover:bg-amber-50">
                              Khiếu nại
                            </button>
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
                  {withdrawals.length === 0 ? <p className="py-10 text-center text-sm text-slate-500">Chưa có yêu cầu rút doanh thu.</p> : null}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {complaintTarget ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70 px-4 py-6 backdrop-blur-sm">
          <form onSubmit={submitComplaint} className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-amber-700">Khiếu nại rút tiền</p>
                <h3 className="mt-1 text-lg font-bold text-slate-950">{currency.format(complaintTarget.amount)}</h3>
                <p className="mt-1 text-sm text-slate-500">{complaintTarget.bankName} · ••••{complaintTarget.accountNumber.slice(-4)}</p>
              </div>
              <button type="button" onClick={() => setComplaintTarget(null)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">
                Đóng
              </button>
            </div>

            <div className="mt-5 grid gap-4">
              <Field label="Lý do khiếu nại">
                <select value={complaintReason} onChange={(event) => setComplaintReason(event.target.value as ComplaintReason)} className={fieldClassName}>
                  <option value="NOT_RECEIVED">Tiền chưa về tài khoản</option>
                  <option value="WRONG_AMOUNT">Số tiền nhận chưa đúng</option>
                  <option value="OTHER">Vấn đề khác</option>
                </select>
              </Field>
              <Field label={complaintReason === "WRONG_AMOUNT" ? "Số tiền thực nhận (VND)" : "Số tiền thực nhận (nếu có)"}>
                <input inputMode="numeric" min="0" required={complaintReason === "WRONG_AMOUNT"} value={reportedAmount} onChange={(event) => setReportedAmount(event.target.value.replace(/\D/g, ""))} className={fieldClassName} placeholder="Ví dụ: 450000" />
              </Field>
              <Field label="Mô tả chi tiết">
                <textarea required minLength={20} maxLength={1000} value={complaintMessage} onChange={(event) => setComplaintMessage(event.target.value)} className={`${fieldClassName} min-h-28 resize-y`} placeholder="Mô tả giao dịch, thời điểm kiểm tra tài khoản hoặc số tiền thực nhận..." />
              </Field>
            </div>

            {error ? <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-sm font-medium text-rose-700">{error}</p> : null}
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setComplaintTarget(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">
                Hủy
              </button>
              <button disabled={complaintLoading} className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-bold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-slate-300">
                {complaintLoading ? "Đang gửi..." : "Gửi khiếu nại"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block text-sm font-semibold text-slate-700"><span className="mb-1.5 block">{label}</span>{children}</label>;
}

function BellIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function BanknoteIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="12" x="2" y="6" rx="2" />
      <circle cx="12" cy="12" r="2" />
      <path d="M6 12h.01M18 12h.01" />
    </svg>
  );
}
