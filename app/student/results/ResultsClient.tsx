"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ResultFilter, StudentResultItem, StudentResultsPayload } from "@/lib/student-results";

const filters = ["all", "TEST", "SPEAKING", "WRITING"] as const;

function getResultTypeLabel(type: ResultFilter) {
  if (type === "TEST") return "Bài test";
  if (type === "SPEAKING") return "Bài nói";
  if (type === "WRITING") return "Bài viết";
  return "Tất cả";
}

function truncateSummary(value: string, limit = 20) {
  const summary = value.trim();
  const usesUnspacedCjkText = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(summary);
  const units = usesUnspacedCjkText ? Array.from(summary) : summary.split(/\s+/u);
  return units.length <= limit ? summary : `${units.slice(0, limit).join(usesUnspacedCjkText ? "" : " ")}...`;
}

function buildPeriodData(data: StudentResultsPayload["scoreTrend"], mode: "week" | "month") {
  const buckets = new Map<string, { label: string; sum: number; count: number }>();
  for (const item of data) {
    const date = new Date(item.submittedAt);
    let key: string;
    let label: string;
    if (mode === "month") {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      label = `${date.getMonth() + 1}/${date.getFullYear()}`;
    } else {
      const monday = new Date(date);
      const day = monday.getDay() || 7;
      monday.setDate(monday.getDate() - day + 1);
      monday.setHours(0, 0, 0, 0);
      key = monday.toISOString().slice(0, 10);
      label = `${monday.getDate()}/${monday.getMonth() + 1}`;
    }
    const current = buckets.get(key) ?? { label, sum: 0, count: 0 };
    current.sum += item.scorePercent;
    current.count += 1;
    buckets.set(key, current);
  }
  return [...buckets.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([, value]) => ({ ...value, average: value.sum / value.count }));
}

export default function ResultsClient({ initialData }: { initialData: StudentResultsPayload }) {
  const [data, setData] = useState(initialData);
  const [filter, setFilter] = useState<ResultFilter>("all");
  const [periodMode, setPeriodMode] = useState<"week" | "month">("week");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const periodData = useMemo(() => buildPeriodData(data.scoreTrend, periodMode), [data.scoreTrend, periodMode]);
  const visiblePages = useMemo(() => {
    const pages: number[] = [];
    for (let page = 1; page <= data.totalPages; page += 1) {
      if (Math.abs(page - data.page) <= 2 || page === 1 || page === data.totalPages) pages.push(page);
    }
    return pages;
  }, [data.page, data.totalPages]);

  async function load(page: number, nextFilter = filter) {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/student/results?type=${nextFilter}&page=${page}&pageSize=10`, { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Không thể tải kết quả.");
      setData(payload);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không thể tải kết quả.");
    } finally {
      setLoading(false);
    }
  }

  function changeFilter(nextFilter: ResultFilter) {
    setFilter(nextFilter);
    void load(1, nextFilter);
  }

  return (
    <main className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-7xl space-y-6 px-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div><p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Lịch sử kết quả</p><h1 className="mt-2 text-3xl font-bold text-slate-950">Kết quả học tập</h1><p className="mt-2 max-w-2xl text-slate-600">Theo dõi điểm số, xu hướng tiến bộ và xem lại từng bài đã làm.</p><p className="mt-2 max-w-3xl text-sm text-amber-700">IELTS, HSK, JLPT và TOPIK chỉ là mức tham chiếu nội bộ, không thay thế chứng chỉ chính thức.</p></div>
            <Link href="/student/rewards" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Trung tâm điểm</Link>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <Stat label="Tổng bài" value={data.overview.total} />
          <Stat label="Điểm trung bình" value={`${data.overview.average}%`} />
          <Stat label="Điểm cao nhất" value={`${data.overview.highest}%`} />
          <Stat label="Điểm thấp nhất" value={`${data.overview.lowest}%`} />
          <Stat label="Tỷ lệ đạt" value={`${data.overview.passRate}%`} />
          <Stat label="Đạt / chưa đạt" value={`${data.overview.passed} / ${data.overview.failed}`} />
        </section>

        {data.scoreTrend.length ? (
          <section className="grid gap-5 xl:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="text-lg font-bold text-slate-950">Xu hướng điểm số</h2><p className="mt-1 text-sm text-slate-500">Điểm đã chuẩn hóa theo phần trăm và sắp xếp theo ngày làm bài.</p><ScoreLineChart data={data.scoreTrend} /></div>
            <div className="rounded-xl border border-slate-200 bg-white p-5"><div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-bold text-slate-950">Điểm trung bình theo kỳ</h2><p className="mt-1 text-sm text-slate-500">Mỗi cột hiển thị điểm trung bình và số bài trong kỳ.</p></div><select aria-label="Khoảng tổng hợp điểm" value={periodMode} onChange={(event) => setPeriodMode(event.target.value as "week" | "month")} className="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="week">Theo tuần</option><option value="month">Theo tháng</option></select></div><PeriodBarChart data={periodData} /></div>
          </section>
        ) : null}

        <section className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex flex-wrap gap-2">{filters.map((item) => <button key={item} type="button" disabled={loading} onClick={() => changeFilter(item)} className={`rounded-full px-4 py-2 text-sm font-semibold ${filter === item ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"}`}>{getResultTypeLabel(item)}</button>)}</div></section>
        {error ? <p className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700" role="alert">{error}</p> : null}
        {loading ? <p className="rounded-lg bg-blue-50 p-4 text-sm font-semibold text-blue-700" role="status">Đang tải 10 kết quả...</p> : null}

        <section className={`space-y-3 ${loading ? "opacity-60" : ""}`}>
          {data.items.map((item) => <ResultCard key={item.id} item={item} />)}
          {!loading && data.items.length === 0 ? <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500"><p className="font-semibold text-slate-700">Chưa có kết quả cho bộ lọc này.</p><p className="mt-2 text-sm">Hãy làm bài kiểm tra hoặc tiếp tục khóa học để tạo dữ liệu học tập.</p></div> : null}
        </section>

        {data.totalPages > 1 ? <nav className="flex flex-wrap items-center justify-center gap-2" aria-label="Phân trang kết quả"><button type="button" disabled={loading || data.page <= 1} onClick={() => void load(data.page - 1)} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold disabled:opacity-40">Trang trước</button>{visiblePages.map((page, index, pages) => <span key={page} className="contents">{index > 0 && page - pages[index - 1] > 1 ? <span className="px-1 text-slate-400">…</span> : null}<button type="button" disabled={loading} onClick={() => void load(page)} aria-current={page === data.page ? "page" : undefined} className={`rounded-lg px-3 py-2 text-sm font-semibold ${page === data.page ? "bg-blue-600 text-white" : "border border-slate-200 bg-white text-slate-700"}`}>{page}</button></span>)}<button type="button" disabled={loading || data.page >= data.totalPages} onClick={() => void load(data.page + 1)} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold disabled:opacity-40">Trang sau</button></nav> : null}
        <p className="text-center text-xs text-slate-500">Trang {data.page}/{data.totalPages} · {data.totalItems} kết quả · tối đa 10 kết quả mỗi trang</p>
      </div>
    </main>
  );
}

function ScoreLineChart({ data }: { data: StudentResultsPayload["scoreTrend"] }) {
  const width = 720;
  const points = data.map((item, index) => `${30 + (index / Math.max(1, data.length - 1)) * (width - 60)},${210 - (item.scorePercent / 100) * 170}`).join(" ");
  return <div className="mt-4 overflow-x-auto rounded-xl bg-slate-50 p-2"><svg viewBox={`0 0 ${width} 240`} className="min-w-[620px]" role="img" aria-label="Biểu đồ đường điểm số theo thời gian">{[0, 25, 50, 75, 100].map((value) => <g key={value}><line x1="30" x2={width - 30} y1={210 - (value / 100) * 170} y2={210 - (value / 100) * 170} stroke="#e2e8f0" /><text x="2" y={214 - (value / 100) * 170} fontSize="10" fill="#64748b">{value}</text></g>)}<polyline points={points} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />{data.map((item, index) => <circle key={item.id} cx={30 + (index / Math.max(1, data.length - 1)) * (width - 60)} cy={210 - (item.scorePercent / 100) * 170} r="3" fill="#2563eb"><title>{new Date(item.submittedAt).toLocaleDateString("vi-VN", { timeZone: "Asia/Bangkok" })}: {item.scorePercent}%</title></circle>)}</svg></div>;
}

function PeriodBarChart({ data }: { data: Array<{ label: string; average: number; count: number }> }) {
  return <div className="mt-4 overflow-x-auto"><div className="flex h-56 min-w-[520px] items-end gap-2 rounded-xl bg-slate-50 p-4" role="img" aria-label="Biểu đồ cột điểm trung bình theo kỳ">{data.slice(-12).map((item) => <div key={item.label} className="flex h-full flex-1 flex-col items-center justify-end gap-2" title={`${item.label}: ${item.average.toFixed(1)}%, ${item.count} bài`}><span className="text-[10px] font-bold text-slate-700">{item.average.toFixed(0)}%</span><div className="w-full rounded-t bg-emerald-500" style={{ height: `${Math.max(2, item.average)}%` }} /><span className="text-[10px] text-slate-500">{item.label}</span><span className="text-[9px] text-slate-400">{item.count} bài</span></div>)}</div></div>;
}

function ResultCard({ item }: { item: StudentResultItem }) {
  const percent = item.maxScore > 0 ? Math.round((item.score / item.maxScore) * 100) : 0;
  return <article className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><div className="flex flex-wrap gap-2"><span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">{getResultTypeLabel(item.type)}</span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">Tham chiếu: {item.certificate.label}</span>{item.language ? <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">{item.language.name}</span> : null}</div><h2 className="mt-3 text-lg font-bold text-slate-950">{item.title}</h2><p className="mt-1 text-sm text-slate-500">{item.course?.name || "Luyện tập độc lập"} · {new Date(item.submittedAt).toLocaleString("vi-VN", { timeZone: "Asia/Bangkok" })}</p>{item.scoreOnly ? <p className="mt-2 text-sm font-medium text-slate-600">Kết quả này chỉ gồm điểm số.</p> : item.summary ? <p className="mt-2 text-sm text-slate-600" title={item.summary}>{truncateSummary(item.summary)}</p> : null}</div><div className="md:text-right"><p className="text-2xl font-bold text-slate-950">{item.score.toFixed(1)} / {item.maxScore}</p><p className="text-sm font-semibold text-blue-600">{percent}%</p><Link href={`/student/results/${item.id}`} className="mt-3 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Xem chi tiết</Link></div></div></article>;
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold uppercase text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold text-slate-950">{value}</p></div>;
}
