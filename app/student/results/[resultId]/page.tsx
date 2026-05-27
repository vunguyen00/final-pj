"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type ResultDetail = {
  id: string;
  type: "TEST" | "SPEAKING" | "WRITING";
  title: string;
  course: { id: string; name: string } | null;
  score: number;
  maxScore: number;
  band: { system: string; level: string; score: number };
  criteria: Record<string, unknown>;
  feedback: Record<string, unknown>;
  mistakes: Record<string, unknown> | null;
  improvements: Record<string, unknown> | null;
  sampleAnswer?: string | null;
  prompt?: string | null;
  submissionText?: string | null;
  audioUrl?: string | null;
  durationSeconds?: number | null;
  submittedAt: string;
  testId?: string;
};

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item)).filter(Boolean);
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

function flattenFeedback(detail: ResultDetail) {
  const feedback = detail.feedback || {};
  const analysis = (feedback.analysis || {}) as Record<string, unknown>;
  const evaluation = (feedback.evaluation || {}) as Record<string, unknown>;
  return {
    summary: String(feedback.summary || evaluation.summary || ""),
    strengths: asStringArray(analysis.strengths),
    weaknesses: asStringArray(analysis.weaknesses),
    feedback: asStringArray(analysis.feedback || feedback.feedback),
    suggestions: asStringArray(analysis.suggestions || detail.improvements?.suggestions),
  };
}

function formatDuration(seconds?: number | null) {
  if (!seconds) return "Khong ro";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

export default function ResultDetailPage() {
  const params = useParams();
  const resultId = params.resultId as string;
  const [detail, setDetail] = useState<ResultDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchDetail() {
      try {
        const response = await fetch(`/api/student/results/${resultId}`, { cache: "no-store" });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          setError(data.error || "Khong tim thay ket qua.");
          return;
        }
        setDetail(data);
      } catch {
        setError("Khong tai duoc chi tiet ket qua.");
      } finally {
        setLoading(false);
      }
    }

    void fetchDetail();
  }, [resultId]);

  const parsed = useMemo(() => (detail ? flattenFeedback(detail) : null), [detail]);
  const percent = detail && detail.maxScore > 0 ? Math.round((detail.score / detail.maxScore) * 100) : 0;

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
      </main>
    );
  }

  if (error || !detail || !parsed) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="rounded-xl border border-red-200 bg-white p-8 text-center">
          <p className="text-red-600">{error || "Khong tim thay ket qua."}</p>
          <Link href="/student/results" className="mt-4 inline-block text-blue-600">Quay lai lich su</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-6xl space-y-6 px-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">{detail.type} result</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-950">{detail.title}</h1>
              <p className="mt-2 text-slate-600">
                {detail.course?.name || "Independent practice"} - {new Date(detail.submittedAt).toLocaleString("vi-VN")} - {formatDuration(detail.durationSeconds)}
              </p>
            </div>
            <div className="text-left lg:text-right">
              <p className="text-5xl font-bold text-slate-950">{detail.score.toFixed(1)}</p>
              <p className="font-semibold text-blue-600">{percent}% - {detail.band.system} {detail.band.level}</p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          {Object.entries(detail.criteria || {}).map(([key, value]) => (
            <div key={key} className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-sm capitalize text-slate-500">{key.replace(/([A-Z])/g, " $1")}</p>
              <p className="mt-2 text-2xl font-bold text-slate-950">{String(value)}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <Panel title="Nhan xet AI">
            {parsed.summary ? <p className="text-sm leading-6 text-slate-700">{parsed.summary}</p> : null}
            <List title="Diem manh" items={parsed.strengths} />
            <List title="Diem yeu" items={parsed.weaknesses} />
            <List title="Feedback chi tiet" items={parsed.feedback} />
          </Panel>

          <Panel title="Loi sai va goi y">
            <ObjectList data={detail.mistakes} fallback="Chua co loi cu the." />
            <List title="Cach cai thien" items={parsed.suggestions} />
            <ObjectList data={detail.improvements} fallback="Chua co goi y bo sung." />
          </Panel>
        </section>

        {(detail.submissionText || detail.audioUrl || detail.prompt) ? (
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-bold text-slate-950">Bai lam da luu</h2>
            {detail.prompt ? <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700"><span className="font-semibold">De bai:</span> {detail.prompt}</p> : null}
            {detail.audioUrl ? (
              <audio controls className="mt-4 w-full">
                <source src={detail.audioUrl} />
              </audio>
            ) : null}
            {detail.submissionText ? <p className="mt-4 whitespace-pre-line rounded-lg bg-slate-50 p-4 text-sm leading-6 text-slate-700">{detail.submissionText}</p> : null}
          </section>
        ) : null}

        {detail.sampleAnswer ? (
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-bold text-slate-950">Sample answer tham khao</h2>
            <p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-700">{detail.sampleAnswer}</p>
          </section>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Link href="/student/results" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Lich su ket qua</Link>
          {detail.type === "TEST" ? (
            <Link href={`/student/tests/${detail.testId || ""}`} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
              Lam lai test
            </Link>
          ) : null}
        </div>
      </div>
    </main>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-bold text-slate-950">{title}</h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <h3 className="font-semibold text-slate-900">{title}</h3>
      <ul className="mt-2 space-y-2 text-sm text-slate-700">
        {items.map((item, index) => <li key={`${title}-${index}`}>- {item}</li>)}
      </ul>
    </div>
  );
}

function ObjectList({ data, fallback }: { data: Record<string, unknown> | null; fallback: string }) {
  if (!data || Object.keys(data).length === 0) return <p className="text-sm text-slate-500">{fallback}</p>;

  return (
    <div className="space-y-3">
      {Object.entries(data).map(([key, value]) => {
        const items = asStringArray(value);
        if (!items.length) return null;
        return <List key={key} title={key.replace(/([A-Z])/g, " $1")} items={items} />;
      })}
    </div>
  );
}
