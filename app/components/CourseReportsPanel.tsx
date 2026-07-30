"use client";

import { useCallback, useEffect, useReducer, useState } from "react";
import { readJsonResponse } from "@/lib/http-response";

type ReportItem = {
  id: string;
  category: string;
  title: string;
  description: string;
  status: "PENDING" | "IN_REVIEW" | "RESOLVED" | "REJECTED";
  response: string | null;
  createdAt: string;
  course: { id: string; name: string };
  reporter: { id: string; username: string; email: string };
  lesson: { id: string; title: string } | null;
  respondedBy: { id: string; username: string } | null;
};

const categoryLabels: Record<string, string> = {
  INACCURATE_CONTENT: "Nội dung chưa chính xác",
  BROKEN_RESOURCE: "Video/tài liệu bị lỗi",
  ACCESS_PROBLEM: "Không truy cập được",
  INAPPROPRIATE_CONTENT: "Nội dung không phù hợp",
  QUALITY_MISMATCH: "Chất lượng không đúng mô tả",
  INSTRUCTOR_PROBLEM: "Vấn đề với giảng viên",
  OTHER: "Vấn đề khác",
};

const statusLabels = {
  PENDING: "Chờ xử lý",
  IN_REVIEW: "Đang xem xét",
  RESOLVED: "Đã giải quyết",
  REJECTED: "Từ chối",
};

const REPORTS_PER_PAGE = 5;

type ReportDataState = {
  items: ReportItem[];
  page: number;
  totalPages: number;
  totalItems: number;
  viewerId: string;
  responses: Record<string, string>;
};

type ReportDataAction =
  | { type: "loaded"; data: { items?: ReportItem[]; page?: number; totalPages?: number; totalItems?: number; viewerId?: string }; requestedPage: number }
  | { type: "responseChanged"; reportId: string; response: string };

const initialReportData: ReportDataState = {
  items: [],
  page: 1,
  totalPages: 1,
  totalItems: 0,
  viewerId: "",
  responses: {},
};

function reportDataReducer(state: ReportDataState, action: ReportDataAction): ReportDataState {
  if (action.type === "responseChanged") {
    return { ...state, responses: { ...state.responses, [action.reportId]: action.response } };
  }

  const items = action.data.items ?? [];
  return {
    items,
    viewerId: action.data.viewerId ?? "",
    page: action.data.page ?? action.requestedPage,
    totalPages: action.data.totalPages ?? 1,
    totalItems: action.data.totalItems ?? 0,
    responses: Object.fromEntries(items.map((item) => [item.id, item.response ?? ""])),
  };
}

export default function CourseReportsPanel({ role }: { role: "ADMIN" | "TEACHER" }) {
  const [{ items, page, totalPages, totalItems, viewerId, responses }, dispatchReportData] = useReducer(reportDataReducer, initialReportData);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ type: "error" | "success"; message: string } | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [searchState, setSearchState] = useState({ value: "", applied: "" });
  const { value: search, applied: appliedSearch } = searchState;

  const load = useCallback(async (
    requestedPage: number,
    requestedSearch: string,
    signal?: AbortSignal,
  ) => {
    setLoading(true);
    setNotice((current) => current?.type === "error" ? null : current);
    try {
      const params = new URLSearchParams({
        page: String(requestedPage),
        pageSize: String(REPORTS_PER_PAGE),
      });
      if (requestedSearch) params.set("search", requestedSearch);
      const response = await fetch(`/api/course-reports?${params.toString()}`, {
        cache: "no-store",
        signal,
      });
      const data = await readJsonResponse(response).catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "Không thể tải báo cáo.");
      if (signal?.aborted) return;
      dispatchReportData({ type: "loaded", data, requestedPage });
    } catch (loadError) {
      if (signal?.aborted) return;
      setNotice({
        type: "error",
        message: loadError instanceof Error ? loadError.message : "Không thể tải báo cáo.",
      });
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(() => load(1, "", controller.signal));
    return () => {
      controller.abort();
    };
  }, [load]);

  async function updateReport(item: ReportItem, status?: ReportItem["status"], includeResponse = true) {
    setSavingId(item.id);
    setNotice(null);
    const response = await fetch(`/api/course-reports/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(includeResponse ? { response: responses[item.id] ?? "" } : {}),
        ...(status ? { status } : {}),
      }),
    });
    const data = await readJsonResponse(response).catch(() => ({}));
    setSavingId(null);
    if (!response.ok) {
      setNotice({ type: "error", message: data?.error || "Không thể cập nhật báo cáo." });
      return;
    }
    setNotice({
      type: "success",
      message: data?.notificationSent
        ? "Đã lưu thay đổi và gửi thông báo tới học viên."
        : "Không có nội dung hoặc trạng thái mới để gửi thông báo.",
    });
    await load(page, appliedSearch);
  }

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextSearch = search.trim();
    setSearchState((current) => ({ ...current, applied: nextSearch }));
    setNotice(null);
    void load(1, nextSearch);
  }

  function clearSearch() {
    setSearchState({ value: "", applied: "" });
    setNotice(null);
    void load(1, "");
  }

  return (
    <section className="rounded-2xl">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-950">Báo cáo khóa học</h2>
          <p className="mt-1 text-sm text-slate-500">{role === "ADMIN" ? "Xem toàn bộ báo cáo và quyết định trạng thái cuối." : "Chỉ hiển thị báo cáo thuộc khóa học do bạn phụ trách."}</p>
          <p className="mt-1 text-xs text-slate-500">Người tiếp nhận đầu tiên là người duy nhất được lưu phản hồi. Admin có thể đóng báo cáo nhưng không thể sửa phản hồi của người khác.</p>
        </div>
        <button type="button" onClick={() => void load(page, appliedSearch)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">Làm mới</button>
      </div>
      <form onSubmit={submitSearch} className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-end">
        <label htmlFor={`course-report-search-${role.toLowerCase()}`} className="flex-1 text-sm font-semibold text-slate-700">
          Tìm kiếm báo cáo
          <input
            id={`course-report-search-${role.toLowerCase()}`}
            type="search"
            value={search}
            onChange={(event) => setSearchState((current) => ({ ...current, value: event.target.value }))}
            placeholder="Tiêu đề, nội dung, khóa học, bài học hoặc người gửi"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>
        <div className="flex gap-2">
          <button type="submit" disabled={loading} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Tìm kiếm</button>
          {search || appliedSearch ? (
            <button type="button" disabled={loading} onClick={clearSearch} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">Xóa tìm kiếm</button>
          ) : null}
        </div>
      </form>
      {appliedSearch && !loading ? <p className="mt-3 text-sm text-slate-500">Tìm thấy {totalItems} báo cáo phù hợp với “{appliedSearch}”.</p> : null}
      {notice?.type === "error" ? <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700" role="alert">{notice.message}</p> : null}
      {notice?.type === "success" ? <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-700" role="status">{notice.message}</p> : null}
      {loading ? <p className="mt-5 text-sm font-semibold text-blue-700" role="status">Đang tải báo cáo...</p> : null}
      {!loading && items.length === 0 ? <p className="mt-5 rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">{appliedSearch ? "Không tìm thấy báo cáo phù hợp." : "Chưa có báo cáo khóa học."}</p> : null}
      <div className="mt-5 space-y-4">
        {items.map((item) => {
          const isFinal = item.status === "RESOLVED" || item.status === "REJECTED";
          const isResponseOwner = item.respondedBy?.id === viewerId;
          const canClaim = !item.respondedBy && !isFinal;
          const canWriteResponse = isResponseOwner && !isFinal;
          return (
          <article key={item.id} className="rounded-xl border border-slate-200 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap gap-2 text-xs font-bold">
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">{categoryLabels[item.category] ?? item.category}</span>
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">{statusLabels[item.status]}</span>
                </div>
                <h3 className="mt-3 font-bold text-slate-950">{item.title}</h3>
                <p className="mt-1 text-sm text-slate-500">{item.course.name}{item.lesson ? ` · ${item.lesson.title}` : ""}</p>
              </div>
              <p className="text-xs text-slate-500">{new Date(item.createdAt).toLocaleString("vi-VN", { timeZone: "Asia/Bangkok" })}</p>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{item.description}</p>
            <p className="mt-2 text-xs text-slate-500">Người gửi: {item.reporter.username} ({item.reporter.email})</p>
            <p className="mt-1 text-xs font-semibold text-slate-600">Người phản hồi: {item.respondedBy?.username ?? "Chưa có người tiếp nhận"}</p>
            <label className="mt-4 block text-sm font-semibold text-slate-700">Phản hồi
              <textarea disabled={!canWriteResponse} rows={3} value={responses[item.id] ?? ""} onChange={(event) => dispatchReportData({ type: "responseChanged", reportId: item.id, response: event.target.value })} placeholder={canClaim ? "Hãy tiếp nhận báo cáo trước khi phản hồi." : undefined} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500" />
            </label>
            {!canClaim && !isResponseOwner && item.respondedBy ? <p className="mt-2 text-xs text-amber-700">Báo cáo này đang do {item.respondedBy.username} phản hồi. Bạn chỉ có thể xem nội dung.</p> : null}
            <div className="mt-3 flex flex-wrap gap-2">
              {canClaim ? (
                <button type="button" disabled={savingId === item.id} onClick={() => void updateReport(item, "IN_REVIEW", false)} className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Đã tiếp nhận báo cáo</button>
              ) : null}
              <button type="button" title="Lưu nội dung phản hồi và gửi thông báo cho người báo cáo" disabled={savingId === item.id || !canWriteResponse} onClick={() => void updateReport(item)} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">Lưu và gửi phản hồi</button>
              {role === "ADMIN" && !isFinal ? (
                <>
                  <button type="button" title="Đóng báo cáo vì vấn đề đã được xử lý và gửi thông báo cho người báo cáo" disabled={savingId === item.id} onClick={() => void updateReport(item, "RESOLVED", false)} className="rounded-lg border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-700">Đánh dấu đã giải quyết</button>
                  <button type="button" title="Đóng báo cáo vì nội dung không hợp lệ và gửi thông báo cho người báo cáo" disabled={savingId === item.id} onClick={() => void updateReport(item, "REJECTED", false)} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700">Từ chối báo cáo</button>
                </>
              ) : null}
            </div>
          </article>
          );
        })}
      </div>
      {totalPages > 1 ? (
        <nav className="mt-5 flex items-center justify-center gap-3" aria-label="Phân trang báo cáo">
          <button type="button" disabled={page <= 1 || loading} onClick={() => void load(page - 1, appliedSearch)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold disabled:opacity-40">Trang trước</button>
          <span className="text-sm font-semibold text-slate-600">{page}/{totalPages}</span>
          <button type="button" disabled={page >= totalPages || loading} onClick={() => void load(page + 1, appliedSearch)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold disabled:opacity-40">Trang sau</button>
        </nav>
      ) : null}
    </section>
  );
}
