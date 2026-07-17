"use client";

import { useRef, useState, useSyncExternalStore, type Dispatch, type FormEvent, type ReactNode, type SetStateAction, type UIEvent } from "react";
import { useRouter } from "next/navigation";
import { createPollingStore } from "@/lib/client-polling-store";

const currency = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});
const revenueDateTime = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "Asia/Ho_Chi_Minh",
});

type ComplaintReason = "NOT_RECEIVED" | "WRONG_AMOUNT" | "OTHER";
type ComplaintStatus = "OPEN" | "RESOLVED" | "REJECTED";
type ActivityTab = "notifications" | "withdrawals";
type RevenueNotification = { id: string; title: string; body: string; readAt: string | null; createdAt: string };
type TeacherBankAccount = {
  bankName: string;
  accountNumber: string;
  accountName: string;
  branch: string | null;
  verificationStatus: "UNVERIFIED" | "VERIFIED" | "REJECTED";
  updatedAt: string;
};

const NOTIFICATION_PAGE_SIZE = 20;

type WithdrawalComplaint = {
  id: string;
  reason: ComplaintReason;
  reportedAmount: number | null;
  message: string;
  evidenceImageUrl: string | null;
  evidenceImageName: string | null;
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
  status: "PENDING" | "APPROVED" | "PAID" | "COMPLETED" | "REJECTED";
  note: string | null;
  createdAt: string;
  complaint: WithdrawalComplaint | null;
};

type TeacherRevenueSnapshot = {
  availableRevenue: number;
  bankAccount: TeacherBankAccount | null;
  unreadNotificationCount: number;
  withdrawals: Withdrawal[];
  notifications: RevenueNotification[];
};

const statusLabel = {
  PENDING: "Chờ xử lý",
  APPROVED: "Đã duyệt",
  PAID: "Đã thanh toán",
  COMPLETED: "Đã hoàn thành",
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

async function readApiJson<T extends object>(response: Response): Promise<T> {
  try {
    return (await response.json()) as T;
  } catch {
    return {} as T;
  }
}

function useRevenueWithdrawalPanel({
  availableRevenue,
  bankAccount,
  unreadNotificationCount,
  withdrawals,
  notifications,
}: {
  availableRevenue: number;
  bankAccount: TeacherBankAccount | null;
  unreadNotificationCount: number;
  withdrawals: Withdrawal[];
  notifications: RevenueNotification[];
}) {
  const router = useRouter();
  const [revenueStore] = useState(() => createPollingStore<TeacherRevenueSnapshot>({
    initialValue: { availableRevenue, bankAccount, unreadNotificationCount, withdrawals, notifications },
    intervalMs: 8000,
    load: async () => {
      const response = await fetch("/api/teacher/revenue-withdrawals", { cache: "no-store" });
      const data = await readApiJson<Partial<TeacherRevenueSnapshot> & { error?: string }>(response);
      if (!response.ok || !data.withdrawals || typeof data.availableRevenue !== "number") {
        return { availableRevenue, bankAccount, unreadNotificationCount, withdrawals, notifications };
      }
      return {
        availableRevenue: data.availableRevenue,
        bankAccount: data.bankAccount ?? null,
        unreadNotificationCount: data.unreadNotificationCount ?? unreadNotificationCount,
        withdrawals: data.withdrawals,
        notifications: data.notifications ?? notifications,
      };
    },
  }));
  const revenueSnapshot = useSyncExternalStore(revenueStore.subscribe, revenueStore.getSnapshot, revenueStore.getSnapshot);
  const liveAvailableRevenue = revenueSnapshot.availableRevenue;
  const liveWithdrawals = revenueSnapshot.withdrawals;
  const [bankAccountState, setBankAccountState] = useState(bankAccount);
  const [amount, setAmount] = useState("");
  const [bankName, setBankName] = useState(bankAccount?.bankName ?? "");
  const [bankBranch, setBankBranch] = useState(bankAccount?.branch ?? "");
  const [accountNumber, setAccountNumber] = useState(bankAccount?.accountNumber ?? "");
  const [accountName, setAccountName] = useState(bankAccount?.accountName ?? "");
  const [bankAccountOpen, setBankAccountOpen] = useState(false);
  const [bankAccountLoading, setBankAccountLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [bankAccountOtp, setBankAccountOtp] = useState("");
  const [withdrawalLoading, setWithdrawalLoading] = useState(false);
  const [complaintLoading, setComplaintLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [withdrawalOpen, setWithdrawalOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [activityTab, setActivityTab] = useState<ActivityTab>("notifications");
  const [loadedNotifications, setLoadedNotifications] = useState(notifications);
  const [unreadCount, setUnreadCount] = useState(unreadNotificationCount);
  const [hasMoreNotifications, setHasMoreNotifications] = useState(notifications.length >= NOTIFICATION_PAGE_SIZE);
  const [loadingMoreNotifications, setLoadingMoreNotifications] = useState(false);
  const loadingMoreNotificationsRef = useRef(false);
  const [complaintTarget, setComplaintTarget] = useState<Withdrawal | null>(null);
  const [complaintReason, setComplaintReason] = useState<ComplaintReason>("NOT_RECEIVED");
  const [reportedAmount, setReportedAmount] = useState("");
  const [complaintMessage, setComplaintMessage] = useState("");
  const [complaintEvidenceFile, setComplaintEvidenceFile] = useState<File | null>(null);

  async function submitWithdrawal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!bankAccountState) {
      setError("Vui lòng lưu và xác nhận OTP tài khoản nhận tiền trước khi rút doanh thu.");
      setBankAccountOpen(true);
      return;
    }
    setWithdrawalLoading(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/teacher/revenue-withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(amount) }),
      });
      const data = await readApiJson<{ error?: string }>(response);
      if (!response.ok) {
        setError(data.error ?? "Không thể tạo yêu cầu rút tiền.");
        return;
      }
      setAmount("");
      setMessage("Yêu cầu rút doanh thu đã được ghi nhận.");
      setWithdrawalOpen(false);
      void revenueStore.refresh();
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
    setComplaintEvidenceFile(null);
    setError("");
    setMessage("");
  }

  function openWithdrawal() {
    setWithdrawalOpen(true);
    setError("");
    setMessage("");
  }

  function openBankAccountForm() {
    setBankName(bankAccountState?.bankName ?? "");
    setBankBranch(bankAccountState?.branch ?? "");
    setAccountNumber(bankAccountState?.accountNumber ?? "");
    setAccountName(bankAccountState?.accountName ?? "");
    setBankAccountOtp("");
    setOtpSent(false);
    setBankAccountOpen(true);
    setError("");
    setMessage("");
  }

  async function requestBankAccountOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBankAccountLoading(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/teacher/bank-account/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bankName, bankBranch, accountNumber, accountName }),
      });
      const data = await readApiJson<{ error?: string }>(response);
      if (!response.ok) {
        setError(data.error ?? "Không gửi được OTP xác nhận tài khoản.");
        return;
      }
      setOtpSent(true);
      setMessage("OTP đã được gửi về email tài khoản của bạn.");
    } catch {
      setError("Lỗi mạng. Vui lòng thử lại.");
    } finally {
      setBankAccountLoading(false);
    }
  }

  async function verifyBankAccountOtp() {
    setBankAccountLoading(true);
    setError("");
    try {
      const response = await fetch("/api/teacher/bank-account/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp: bankAccountOtp }),
      });
      const data = await readApiJson<{ error?: string; bankAccount?: TeacherBankAccount }>(response);
      if (!response.ok || !data.bankAccount) {
        setError(data.error ?? "Không xác nhận được OTP.");
        return;
      }
      setBankAccountState(data.bankAccount);
      setBankAccountOpen(false);
      setOtpSent(false);
      setBankAccountOtp("");
      setMessage("Đã cập nhật tài khoản nhận tiền sau khi xác nhận OTP.");
      router.refresh();
    } catch {
      setError("Lỗi mạng. Vui lòng thử lại.");
    } finally {
      setBankAccountLoading(false);
    }
  }

  async function markNotificationsAsRead() {
    if (unreadCount <= 0) return;

    const readAt = new Date().toISOString();
    setUnreadCount(0);
    setLoadedNotifications((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? readAt })));

    try {
      await fetch("/api/teacher/revenue-notifications", { method: "PATCH" });
    } catch {
      // The next server render will restore the unread count if the update fails.
    }
  }

  function openNotifications() {
    setActivityTab("notifications");
    setActivityOpen(true);
    void markNotificationsAsRead();
  }

  function openWithdrawalHistory() {
    setActivityTab("withdrawals");
    setActivityOpen(true);
  }

  async function submitComplaint(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!complaintTarget) return;

    setComplaintLoading(true);
    setError("");
    setMessage("");
    try {
      const formData = new FormData();
      formData.set("reason", complaintReason);
      formData.set("reportedAmount", reportedAmount ? String(Number(reportedAmount)) : "");
      formData.set("message", complaintMessage);
      if (complaintEvidenceFile) formData.set("evidenceImage", complaintEvidenceFile);

      const response = await fetch(`/api/teacher/revenue-withdrawals/${complaintTarget.id}/complaints`, {
        method: "POST",
        body: formData,
      });
      const data = await readApiJson<{ error?: string }>(response);
      if (!response.ok) {
        setError(data.error ?? "Không thể gửi khiếu nại.");
        return;
      }
      setComplaintTarget(null);
      setComplaintEvidenceFile(null);
      setMessage("Khiếu nại đã được gửi tới admin để kiểm tra.");
      void revenueStore.refresh();
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
      const data = await readApiJson<{
        error?: string;
        notifications?: RevenueNotification[];
        hasMore?: boolean;
      }>(response);
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

  return {
    liveAvailableRevenue,
    liveWithdrawals,
    bankAccountState,
    amount,
    bankName,
    bankBranch,
    accountNumber,
    accountName,
    bankAccountOpen,
    bankAccountLoading,
    otpSent,
    bankAccountOtp,
    withdrawalLoading,
    complaintLoading,
    error,
    message,
    withdrawalOpen,
    activityOpen,
    activityTab,
    loadedNotifications,
    unreadCount,
    hasMoreNotifications,
    loadingMoreNotifications,
    complaintTarget,
    complaintReason,
    reportedAmount,
    complaintMessage,
    complaintEvidenceFile,
    setAmount,
    setBankName,
    setBankBranch,
    setAccountNumber,
    setAccountName,
    setBankAccountOpen,
    setBankAccountOtp,
    setWithdrawalOpen,
    setActivityOpen,
    setComplaintTarget,
    setComplaintReason,
    setReportedAmount,
    setComplaintMessage,
    setComplaintEvidenceFile,
    submitWithdrawal,
    openComplaint,
    openWithdrawal,
    openBankAccountForm,
    requestBankAccountOtp,
    verifyBankAccountOtp,
    openNotifications,
    openWithdrawalHistory,
    submitComplaint,
    handleActivityScroll,
  };
}

export function RevenueWithdrawalPanel(props: {
  availableRevenue: number;
  bankAccount: TeacherBankAccount | null;
  unreadNotificationCount: number;
  withdrawals: Withdrawal[];
  notifications: RevenueNotification[];
}) {
  const controller = useRevenueWithdrawalPanel(props);
  const {
    liveAvailableRevenue,
    liveWithdrawals,
    bankAccountState,
    amount,
    bankName,
    bankBranch,
    accountNumber,
    accountName,
    bankAccountOpen,
    bankAccountLoading,
    otpSent,
    bankAccountOtp,
    withdrawalLoading,
    complaintLoading,
    error,
    message,
    withdrawalOpen,
    activityOpen,
    activityTab,
    loadedNotifications,
    unreadCount,
    hasMoreNotifications,
    loadingMoreNotifications,
    complaintTarget,
    complaintReason,
    reportedAmount,
    complaintMessage,
    complaintEvidenceFile,
    setAmount,
    setBankName,
    setBankBranch,
    setAccountNumber,
    setAccountName,
    setBankAccountOpen,
    setBankAccountOtp,
    setWithdrawalOpen,
    setActivityOpen,
    setComplaintTarget,
    setComplaintReason,
    setReportedAmount,
    setComplaintMessage,
    setComplaintEvidenceFile,
    submitWithdrawal,
    openComplaint,
    openWithdrawal,
    openBankAccountForm,
    requestBankAccountOtp,
    verifyBankAccountOtp,
    openNotifications,
    openWithdrawalHistory,
    submitComplaint,
    handleActivityScroll,
  } = controller;

  return (
    <section className="mt-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-slate-600">
          Khả dụng: <strong className="text-emerald-700">{currency.format(liveAvailableRevenue)}</strong>
        </div>
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={openBankAccountForm}
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-white px-4 py-2.5 text-sm font-bold text-emerald-700 shadow-sm hover:bg-emerald-50"
          >
            <BanknoteIcon />
            <span>{bankAccountState ? "Tài khoản nhận tiền" : "Lưu tài khoản"}</span>
          </button>
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
            onClick={openNotifications}
            className="relative inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-4 py-2.5 text-sm font-bold text-blue-700 shadow-sm hover:bg-blue-50"
          >
            <BellIcon />
            <span>Thông báo</span>
            {unreadCount > 0 ? (
              <span className="absolute -right-2 -top-2 min-w-5 rounded-full bg-blue-600 px-1.5 py-0.5 text-center text-xs font-bold leading-4 text-white">
                {unreadCount}
              </span>
            ) : null}
          </button>
          <button
            type="button"
            onClick={openWithdrawalHistory}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <HistoryIcon />
            <span>Lịch sử rút tiền</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">{liveWithdrawals.length}</span>
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
                  Khả dụng: <strong className="text-emerald-700">{currency.format(liveAvailableRevenue)}</strong>
                </p>
              </div>
              <button type="button" onClick={() => setWithdrawalOpen(false)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">
                Đóng
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5">
              <p className="text-sm text-slate-600">Khoản này chỉ đến từ doanh thu bán khóa học, tách biệt với các thanh toán mua khóa học hoặc thanh toán AI theo lượt.</p>
              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-950">Tài khoản nhận tiền cố định</p>
                    {bankAccountState ? (
                      <p className="mt-1 text-sm text-slate-600">
                        {bankAccountState.bankName} · ••••{bankAccountState.accountNumber.slice(-4)} · {bankAccountState.accountName}
                      </p>
                    ) : (
                      <p className="mt-1 text-sm text-rose-600">Chưa lưu tài khoản nhận tiền.</p>
                    )}
                  </div>
                  <button type="button" onClick={openBankAccountForm} className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50">
                    {bankAccountState ? "Đổi tài khoản" : "Lưu tài khoản"}
                  </button>
                </div>
              </div>
              <div className="mt-5 grid gap-4">
                <Field label="Số tiền (VND)">
                  <input aria-label="Số tiền muốn rút" inputMode="numeric" min="1" max={liveAvailableRevenue} required value={amount} onChange={(event) => setAmount(event.target.value.replace(/\D/g, ""))} className={fieldClassName} placeholder="Ví dụ: 500000" />
                </Field>
              </div>
              {error && !complaintTarget ? <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-sm font-medium text-rose-700">{error}</p> : null}
            </div>

            <div className="border-t border-slate-200 bg-slate-50 px-5 py-4">
              <button disabled={withdrawalLoading || liveAvailableRevenue <= 0 || !bankAccountState} className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300">
                {withdrawalLoading ? "Đang gửi yêu cầu..." : "Yêu cầu rút doanh thu"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {bankAccountOpen ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/70 px-4 py-6 backdrop-blur-sm">
          <form onSubmit={requestBankAccountOtp} className="flex max-h-[86vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-white/20">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Tài khoản nhận tiền</p>
                <h2 className="mt-1 text-xl font-bold text-slate-950">Lưu tài khoản rút doanh thu</h2>
                <p className="mt-1 text-sm text-slate-600">Mọi thay đổi đều cần OTP gửi về email và được ghi nhật ký.</p>
              </div>
              <button type="button" onClick={() => setBankAccountOpen(false)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">
                Đóng
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Ngân hàng">
                  <input required maxLength={100} value={bankName} onChange={(event) => setBankName(event.target.value)} className={fieldClassName} placeholder="Tên ngân hàng" />
                </Field>
                <Field label="Chi nhánh">
                  <input maxLength={100} value={bankBranch} onChange={(event) => setBankBranch(event.target.value)} className={fieldClassName} placeholder="Chi nhánh (nếu có)" />
                </Field>
                <Field label="Số tài khoản">
                  <input inputMode="numeric" required minLength={6} maxLength={30} value={accountNumber} onChange={(event) => setAccountNumber(event.target.value.replace(/\D/g, ""))} className={fieldClassName} placeholder="Số tài khoản nhận tiền" />
                </Field>
                <Field label="Tên chủ tài khoản">
                  <input required maxLength={100} value={accountName} onChange={(event) => setAccountName(event.target.value.toUpperCase())} className={`${fieldClassName} uppercase`} placeholder="NGUYEN VAN A" />
                </Field>
              </div>

              {otpSent ? (
                <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <Field label="OTP xác nhận">
                    <input inputMode="numeric" maxLength={6} value={bankAccountOtp} onChange={(event) => setBankAccountOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} className={fieldClassName} placeholder="Nhập OTP 6 chữ số" />
                  </Field>
                  <p className="mt-2 text-xs text-emerald-800">Chỉ khi OTP hợp lệ, hệ thống mới cập nhật tài khoản và ghi nhật ký thay đổi.</p>
                </div>
              ) : null}

              {error && !complaintTarget ? <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-sm font-medium text-rose-700">{error}</p> : null}
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end">
              <button type="submit" disabled={bankAccountLoading} className="rounded-lg border border-emerald-200 bg-white px-4 py-3 text-sm font-bold text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60">
                {otpSent ? "Gửi lại OTP" : "Gửi OTP xác nhận"}
              </button>
              {otpSent ? (
                <button type="button" onClick={() => void verifyBankAccountOtp()} disabled={bankAccountLoading || bankAccountOtp.length !== 6} className="rounded-lg bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300">
                  {bankAccountLoading ? "Đang xác nhận..." : "Xác nhận và lưu"}
                </button>
              ) : null}
            </div>
          </form>
        </div>
      ) : null}

      <RevenueActivityDialog
        controller={{
          activityOpen,
          activityTab,
          loadedNotifications,
          loadingMoreNotifications,
          hasMoreNotifications,
          liveWithdrawals,
          setActivityOpen,
          handleActivityScroll,
          openComplaint,
        }}
      />
      <RevenueComplaintDialog
        controller={{
          complaintTarget,
          complaintReason,
          reportedAmount,
          complaintMessage,
          complaintEvidenceFile,
          complaintLoading,
          error,
          setComplaintTarget,
          setComplaintReason,
          setReportedAmount,
          setComplaintMessage,
          setComplaintEvidenceFile,
          submitComplaint,
        }}
      />
    </section>
  );
}

type RevenueActivityController = {
  activityOpen: boolean;
  activityTab: ActivityTab;
  loadedNotifications: RevenueNotification[];
  loadingMoreNotifications: boolean;
  hasMoreNotifications: boolean;
  liveWithdrawals: Withdrawal[];
  setActivityOpen: Dispatch<SetStateAction<boolean>>;
  handleActivityScroll: (event: UIEvent<HTMLDivElement>) => void;
  openComplaint: (item: Withdrawal) => void;
};

function RevenueActivityDialog({ controller }: { controller: RevenueActivityController }) {
  const {
    activityOpen,
    activityTab,
    loadedNotifications,
    loadingMoreNotifications,
    hasMoreNotifications,
    liveWithdrawals,
    setActivityOpen,
    handleActivityScroll,
    openComplaint,
  } = controller;

  return activityOpen ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70 px-4 py-6 backdrop-blur-sm">
          <div className="flex h-[84vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-white/20">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-blue-700">Teacher revenue</p>
                <h2 className="mt-1 text-xl font-bold text-slate-950">
                  {activityTab === "notifications" ? "Thông báo rút doanh thu" : "Lịch sử rút tiền"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {activityTab === "notifications"
                    ? "Các thông báo mới sẽ tự chuyển sang đã đọc sau khi bạn mở danh sách."
                    : "Theo dõi trạng thái các yêu cầu rút doanh thu đã gửi."}
                </p>
              </div>
              <button type="button" onClick={() => setActivityOpen(false)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">
                Đóng
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
                      <p className="whitespace-nowrap text-xs text-slate-400">{revenueDateTime.format(new Date(item.createdAt))}</p>
                    </article>
                  ))}
                  {loadedNotifications.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">Chưa có thông báo rút doanh thu.</p> : null}
                  {loadingMoreNotifications ? <p className="py-3 text-center text-sm font-semibold text-blue-700">Đang tải thêm thông báo...</p> : null}
                  {!loadingMoreNotifications && !hasMoreNotifications && loadedNotifications.length > 0 ? <p className="py-3 text-center text-xs font-semibold uppercase text-slate-400">Đã hết thông báo</p> : null}
                </div>
              ) : (
                <div className="space-y-2">
                  {liveWithdrawals.map((item) => {
                    const complaintUi = item.complaint ? complaintStatusUi[item.complaint.status] : null;

                    return (
                      <article key={item.id} className="grid gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-bold text-slate-950">{currency.format(item.amount)}</p>
                            <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-bold ${item.status === "REJECTED" ? "bg-rose-50 text-rose-700" : item.status === "PAID" || item.status === "COMPLETED" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                              {statusLabel[item.status]}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-slate-500">{item.bankName} · ••••{item.accountNumber.slice(-4)} · {revenueDateTime.format(new Date(item.createdAt))}</p>
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
                              {item.complaint.evidenceImageUrl ? (
                                <a href={item.complaint.evidenceImageUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-xs font-bold text-blue-700 hover:text-blue-900">
                                  Xem ảnh minh chứng{item.complaint.evidenceImageName ? `: ${item.complaint.evidenceImageName}` : ""}
                                </a>
                              ) : null}
                              {item.complaint.adminNote ? <p className="mt-1 text-xs font-semibold text-slate-700">Phản hồi admin: {item.complaint.adminNote}</p> : null}
                            </div>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 items-start justify-end">
                          {(item.status === "PAID" || item.status === "COMPLETED") && !item.complaint ? (
                            <button type="button" onClick={() => openComplaint(item)} className="rounded-lg border border-amber-300 px-3 py-2 text-xs font-bold text-amber-700 hover:bg-amber-50">
                              Khiếu nại
                            </button>
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
                  {liveWithdrawals.length === 0 ? <p className="py-10 text-center text-sm text-slate-500">Chưa có yêu cầu rút doanh thu.</p> : null}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null;
}

type RevenueComplaintController = {
  complaintTarget: Withdrawal | null;
  complaintReason: ComplaintReason;
  reportedAmount: string;
  complaintMessage: string;
  complaintEvidenceFile: File | null;
  complaintLoading: boolean;
  error: string;
  setComplaintTarget: Dispatch<SetStateAction<Withdrawal | null>>;
  setComplaintReason: Dispatch<SetStateAction<ComplaintReason>>;
  setReportedAmount: Dispatch<SetStateAction<string>>;
  setComplaintMessage: Dispatch<SetStateAction<string>>;
  setComplaintEvidenceFile: Dispatch<SetStateAction<File | null>>;
  submitComplaint: (event: FormEvent<HTMLFormElement>) => Promise<void>;
};

function RevenueComplaintDialog({ controller }: { controller: RevenueComplaintController }) {
  const {
    complaintTarget,
    complaintReason,
    reportedAmount,
    complaintMessage,
    complaintEvidenceFile,
    complaintLoading,
    error,
    setComplaintTarget,
    setComplaintReason,
    setReportedAmount,
    setComplaintMessage,
    setComplaintEvidenceFile,
    submitComplaint,
  } = controller;

  return complaintTarget ? (
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
              <Field label="Ảnh minh chứng">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(event) => setComplaintEvidenceFile(event.target.files?.[0] ?? null)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 file:mr-3 file:rounded-md file:border-0 file:bg-amber-100 file:px-3 file:py-1.5 file:text-sm file:font-bold file:text-amber-800 hover:file:bg-amber-200"
                />
                {complaintEvidenceFile ? <span className="mt-1.5 block text-xs font-semibold text-slate-500">{complaintEvidenceFile.name}</span> : null}
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
      ) : null;
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

function HistoryIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 3v6h6" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
