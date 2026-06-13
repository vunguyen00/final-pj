"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getLevelLabel } from "@/app/components/learningMarketplace";

type ResultItem = {
  id: string;
  type: "TEST" | "SPEAKING" | "WRITING";
  title: string;
  course: { id: string; name: string } | null;
  score: number;
  maxScore: number;
  bandSystem: string;
  bandLevel: string;
  bandScore: number;
  submittedAt: string;
  durationSeconds: number | null;
  summary: string;
  scoreOnly?: boolean;
};

const filters = ["all", "TEST", "SPEAKING", "WRITING"] as const;

function getResultTypeLabel(type: (typeof filters)[number]) {
  if (type === "TEST") return "Bài test";
  if (type === "SPEAKING") return "Bài nói";
  if (type === "WRITING") return "Bài viết";
  return "Tất cả";
}

export default function StudentResultsPage() {
  const [filter, setFilter] = useState<(typeof filters)[number]>("all");
  const [results, setResults] = useState<ResultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchResults() {
      setLoading(true);
      try {
        const query = filter === "all" ? "" : `?type=${filter}`;
        const response = await fetch(`/api/student/results${query}`, { cache: "no-store" });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          setError(data.error || "Không tải được lịch sử kết quả.");
          return;
        }
        setResults(data.results || []);
        setError("");
      } catch {
        setError("Không tải được lịch sử kết quả.");
      } finally {
        setLoading(false);
      }
    }

    void fetchResults();
  }, [filter]);

  const stats = useMemo(() => {
    const avg = results.length
      ? Math.round(results.reduce((sum, item) => sum + (item.maxScore > 0 ? (item.score / item.maxScore) * 100 : 0), 0) / results.length)
      : 0;
    return {
      total: results.length,
      average: avg,
      ai: results.filter((item) => item.type === "SPEAKING" || item.type === "WRITING").length,
    };
  }, [results]);

  return (
    <main className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-7xl space-y-6 px-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Lịch sử kết quả</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-950">Kết quả học tập</h1>
              <p className="mt-2 max-w-2xl text-slate-600">
                Xem lại bài test, bài nói, bài viết, điểm số, cấp độ và phản hồi AI đã lưu.
              </p>
            </div>
            <Link href="/student/rewards" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
              Trung tâm điểm
            </Link>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <Stat label="Tổng kết quả" value={stats.total} />
          <Stat label="Điểm trung bình" value={`${stats.average}%`} />
          <Stat label="Bài nộp cho AI" value={stats.ai} />
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap gap-2">
            {filters.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setFilter(item)}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${filter === item ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"}`}
              >
                {getResultTypeLabel(item)}
              </button>
            ))}
          </div>
        </section>

        {loading ? <div className="h-32 animate-pulse rounded-xl bg-slate-200" /> : null}
        {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

        {!loading && !error ? (
          <section className="space-y-3">
            {results.map((item) => {
              const percent = item.maxScore > 0 ? Math.round((item.score / item.maxScore) * 100) : 0;
              return (
                <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">{getResultTypeLabel(item.type)}</span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                          {item.bandSystem === "GENERAL" ? "Tổng quát" : item.bandSystem} {getLevelLabel(item.bandLevel)}
                        </span>
                      </div>
                      <h2 className="mt-3 text-lg font-bold text-slate-950">{item.title}</h2>
                      <p className="mt-1 text-sm text-slate-500">
                        {item.course?.name || "Luyện tập độc lập"} - {new Date(item.submittedAt).toLocaleString("vi-VN")}
                      </p>
                      {item.scoreOnly ? (
                        <p className="mt-2 text-sm font-medium text-slate-600">
                          Khóa học đã hoàn thành. Kết quả này chỉ gồm điểm số.
                        </p>
                      ) : item.summary ? (
                        <p className="mt-2 text-sm text-slate-600">{item.summary}</p>
                      ) : null}
                    </div>
                    <div className="md:text-right">
                      <p className="text-2xl font-bold text-slate-950">{item.score.toFixed(1)} / {item.maxScore}</p>
                      <p className="text-sm font-semibold text-blue-600">{percent}%</p>
                      <Link href={`/student/results/${item.id}`} className="mt-3 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
                        Xem chi tiết
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
            {results.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
                Chưa có kết quả nào cho bộ lọc này.
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-950">{value}</p>
    </div>
  );
}
