"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type PointHistoryItem = {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
};

type PointsSummary = {
  earned: number;
  spent: number;
  available: number;
  streak: number;
  speakingUses: number;
  writingUses: number;
  history: PointHistoryItem[];
};

export default function RewardCenterPage() {
  const [summary, setSummary] = useState<PointsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchPoints() {
      try {
        const response = await fetch("/api/ai/points", { cache: "no-store" });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          setError(data.error || "Không tải được thông tin điểm.");
          return;
        }
        setSummary(data);
      } catch {
        setError("Không tải được thông tin điểm.");
      } finally {
        setLoading(false);
      }
    }

    void fetchPoints();
  }, []);

  const stats = useMemo(() => {
    if (!summary) return [];
    return [
      ["Điểm hiện tại", summary.available],
      ["Chuỗi học hiện tại", `${summary.streak} ngày`],
      ["Speaking AI", `${summary.speakingUses} lần`],
      ["Writing AI", `${summary.writingUses} lần`],
    ];
  }, [summary]);

  return (
    <main className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-7xl space-y-6 px-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Trung tâm điểm</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-950">Điểm của tôi</h1>
              <p className="mt-2 max-w-2xl text-slate-600">
                Theo dõi điểm tích lũy, chuỗi ngày học và lịch sử cộng hoặc trừ điểm AI.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/student/speaking-ai" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Speaking AI</Link>
              <Link href="/student/writing-ai" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Writing AI</Link>
            </div>
          </div>
        </section>

        {loading ? <div className="h-28 animate-pulse rounded-xl bg-slate-200" /> : null}
        {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

        {summary ? (
          <>
            <section className="grid gap-4 md:grid-cols-4">
              {stats.map(([label, value]) => (
                <div key={label} className="rounded-xl border border-slate-200 bg-white p-5">
                  <p className="text-sm text-slate-500">{label}</p>
                  <p className="mt-2 text-3xl font-bold text-slate-950">{value}</p>
                </div>
              ))}
            </section>

            <section className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h2 className="text-lg font-bold text-slate-950">Quy tắc điểm</h2>
                <div className="mt-4 space-y-3 text-sm text-slate-700">
                  <Rule label="Hoàn thành khóa học" value="+50" />
                  <Rule label="Speaking AI" value="-7" />
                  <Rule label="Writing AI" value="-3" />
                  <Rule label="Chuỗi học 3 ngày" value="+7" />
                  <Rule label="Chuỗi học 7 ngày" value="+20" />
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h2 className="text-lg font-bold text-slate-950">Tổng quan</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Metric label="Tổng điểm cộng" value={summary.earned} />
                  <Metric label="Tổng điểm trừ" value={summary.spent} />
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-bold text-slate-950">Lịch sử hoạt động điểm</h2>
              <div className="mt-4 space-y-3">
                {summary.history.map((item) => (
                  <article key={item.id} className="flex flex-col gap-2 rounded-lg border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-slate-950">{item.description}</p>
                      <p className="text-sm text-slate-500">{new Date(item.createdAt).toLocaleString("vi-VN")} - {item.type}</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className={`text-lg font-bold ${item.amount > 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {item.amount > 0 ? "+" : ""}{item.amount}
                      </p>
                      <p className="text-xs text-slate-500">Còn lại: {item.balanceAfter}</p>
                    </div>
                  </article>
                ))}
                {summary.history.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                    Chưa có giao dịch điểm.
                  </div>
                ) : null}
              </div>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}

function Rule({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
      <span>{label}</span>
      <span className={value.startsWith("+") ? "font-bold text-emerald-600" : "font-bold text-red-600"}>{value}</span>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-slate-50 p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-950">{value}</p>
    </div>
  );
}
