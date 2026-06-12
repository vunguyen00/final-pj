"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useUser } from "@/app/components/header/useUser";

type EvaluationResponse = {
  assessmentId: string;
  points?: { spent: number; available: number };
  streak?: number;
  data: {
    evaluation: {
      scores: Record<string, number>;
      summary: string;
      language: string;
      band: { system: string; level: string; score: number; rationale: string };
      taskRelevance?: number;
      onTopic?: boolean;
      offTopicReason?: string;
      detailedComment?: string;
    };
    analysis: {
      strengths: string[];
      weaknesses: string[];
      feedback: string[];
      suggestions: string[];
    };
    improvements: {
      corrections: Array<{ original: string; improved: string; reason: string }>;
      improved_version: string;
      sample_answer?: string;
    };
  };
};

export default function WritingAiPage() {
  const { user } = useUser();
  const [taskPrompt, setTaskPrompt] = useState("Some people believe online learning is better than classroom learning. Discuss both views and give your opinion.");
  const [essay, setEssay] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<EvaluationResponse | null>(null);

  async function submitWriting(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/ai/essay-evaluation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ essay, taskPrompt, title: "Writing AI" }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "Khong cham duoc bai writing.");
        return;
      }
      setResult(data);
    } catch {
      setError("Khong cham duoc bai writing.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-6xl space-y-6 px-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
                Writing AI - {user?.role === "STUDENT" ? "3 points" : "mien phi cho giao vien/admin"}
              </p>
              <h1 className="mt-2 text-3xl font-bold text-slate-950">Cham writing nhu bai thi that</h1>
              <p className="mt-2 max-w-2xl text-slate-600">
                AI cham theo Task Achievement, Coherence & Cohesion, Lexical Resource, Grammar Range & Accuracy.
              </p>
            </div>
            <Link href="/student/results" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Lich su ket qua</Link>
          </div>
        </section>

        <form onSubmit={submitWriting} className="rounded-xl border border-slate-200 bg-white p-5">
          <label className="text-sm font-semibold text-slate-700">De bai</label>
          <textarea
            value={taskPrompt}
            onChange={(event) => setTaskPrompt(event.target.value)}
            rows={3}
            className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          <label className="mt-4 block text-sm font-semibold text-slate-700">Bai viet</label>
          <textarea
            value={essay}
            onChange={(event) => setEssay(event.target.value)}
            rows={12}
            placeholder="Nhap bai writing cua ban..."
            className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          {error ? <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
          <button disabled={loading} className="mt-4 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:bg-slate-300">
            {loading ? "Dang cham..." : "Submit writing"}
          </button>
        </form>

        {result ? (
          <section className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-blue-600">{result.data.evaluation.language} - {result.data.evaluation.band.system}</p>
                  <h2 className="mt-1 text-2xl font-bold text-slate-950">Band {result.data.evaluation.band.level}</h2>
                  <p className="mt-2 text-sm text-slate-600">{result.data.evaluation.summary}</p>
                  {result.data.evaluation.onTopic === false ? (
                    <p className="mt-2 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">
                      Bai lam bi lac de: {result.data.evaluation.offTopicReason || "Noi dung chua tra loi dung yeu cau de bai."}
                    </p>
                  ) : null}
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-5xl font-bold text-slate-950">{result.data.evaluation.scores.overall}</p>
                  <p className="text-sm font-semibold text-red-600">
                    {user?.role === "STUDENT" ? `-${result.points?.spent ?? 3} diem` : "Khong tru diem"}
                  </p>
                </div>
              </div>
              <Link href={`/student/results/${result.assessmentId}`} className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
                Xem chi tiet da luu
              </Link>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              {Object.entries(result.data.evaluation.scores).filter(([key]) => key !== "overall").map(([key, value]) => (
                <div key={key} className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-sm capitalize text-slate-500">{key.replace("_", " ")}</p>
                  <p className="mt-2 text-2xl font-bold text-slate-950">{value}/10</p>
                </div>
              ))}
            </div>

            <FeedbackBlock title="Nhan xet AI" items={result.data.analysis.feedback} />
            {result.data.evaluation.detailedComment ? (
              <section className="rounded-xl border border-blue-200 bg-blue-50 p-5">
                <h2 className="text-lg font-bold text-blue-950">Nhan xet tong hop</h2>
                <p className="mt-3 text-sm leading-6 text-blue-900">{result.data.evaluation.detailedComment}</p>
                <p className="mt-2 text-sm font-semibold text-blue-800">
                  Do bam de: {Math.round(result.data.evaluation.taskRelevance ?? 0)}/100
                </p>
              </section>
            ) : null}
            <FeedbackBlock title="Loi va cau nen viet lai" items={result.data.improvements.corrections.map((item) => `${item.original} -> ${item.improved}: ${item.reason}`)} />
            <FeedbackBlock title="Goi y cai thien" items={result.data.analysis.suggestions} />
            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-bold text-slate-950">Sample answer tham khao</h2>
              <p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-700">
                {result.data.improvements.sample_answer || result.data.improvements.improved_version}
              </p>
            </section>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function FeedbackBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-bold text-slate-950">{title}</h2>
      <ul className="mt-4 space-y-2 text-sm text-slate-700">
        {items.map((item, index) => <li key={index}>- {item}</li>)}
      </ul>
    </section>
  );
}
