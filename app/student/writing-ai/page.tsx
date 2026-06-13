"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useUser } from "@/app/components/header/useUser";
import { IeltsEvaluationResult } from "@/app/components/IeltsEvaluationResult";
import type {
  IeltsWritingEvaluation,
  IeltsWritingTaskType,
} from "@/lib/ielts-rubric";

type EvaluationResponse = {
  assessmentId: string;
  points?: { spent: number; available: number };
  streak?: number;
  data: {
    ielts: IeltsWritingEvaluation;
  };
};

const DEFAULT_TASK_PROMPTS: Record<IeltsWritingTaskType, string> = {
  task_1:
    "The chart below shows the percentage of households with internet access in three countries from 2000 to 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
  task_2:
    "Some people believe online learning is better than classroom learning. Discuss both views and give your opinion.",
};

export default function WritingAiPage() {
  const { user } = useUser();
  const [taskType, setTaskType] = useState<IeltsWritingTaskType>("task_2");
  const [taskPrompt, setTaskPrompt] = useState(DEFAULT_TASK_PROMPTS.task_2);
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
        body: JSON.stringify({
          essay,
          taskPrompt,
          taskType,
          title: `Writing AI - ${taskType === "task_1" ? "Task 1" : "Task 2"}`,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "Không chấm được bài viết.");
        return;
      }
      setResult(data);
    } catch {
      setError("Không chấm được bài viết.");
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
                Writing AI - {user?.role === "STUDENT" ? "3 điểm" : "miễn phí cho giảng viên và quản trị viên"}
              </p>
              <h1 className="mt-2 text-3xl font-bold text-slate-950">Chấm bài viết theo tiêu chuẩn bài thi thật</h1>
              <p className="mt-2 max-w-2xl text-slate-600">
                AI đánh giá mức độ hoàn thành yêu cầu, tính mạch lạc, vốn từ vựng, phạm vi ngữ pháp và độ chính xác.
              </p>
            </div>
            <Link href="/student/results" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Lịch sử kết quả</Link>
          </div>
        </section>

        <form onSubmit={submitWriting} className="rounded-xl border border-slate-200 bg-white p-5">
          <label className="text-sm font-semibold text-slate-700">Dạng bài IELTS</label>
          <select
            value={taskType}
            onChange={(event) => {
              const nextTaskType = event.target.value as IeltsWritingTaskType;
              const promptIsDefault = Object.values(DEFAULT_TASK_PROMPTS).includes(
                taskPrompt,
              );
              setTaskType(nextTaskType);
              if (promptIsDefault) {
                setTaskPrompt(DEFAULT_TASK_PROMPTS[nextTaskType]);
              }
              setResult(null);
              setError("");
            }}
            className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="task_1">Writing Task 1</option>
            <option value="task_2">Writing Task 2</option>
          </select>
          <label className="mt-4 block text-sm font-semibold text-slate-700">Đề bài</label>
          <textarea
            value={taskPrompt}
            onChange={(event) => setTaskPrompt(event.target.value)}
            rows={3}
            className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          <label className="mt-4 block text-sm font-semibold text-slate-700">Bài viết</label>
          <textarea
            value={essay}
            onChange={(event) => setEssay(event.target.value)}
            rows={12}
            placeholder="Nhập bài viết của bạn..."
            className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          <p className="mt-2 text-right text-xs font-semibold text-slate-500">
            {essay.trim() ? essay.trim().split(/\s+/).length : 0} từ
            {" · "}
            mục tiêu tối thiểu {taskType === "task_1" ? 150 : 250} từ
          </p>
          {error ? <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
          <button disabled={loading} className="mt-4 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:bg-slate-300">
            {loading ? "Đang chấm..." : "Nộp bài viết"}
          </button>
        </form>

        {result ? (
          <section className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-red-600">
                {user?.role === "STUDENT"
                  ? `-${result.points?.spent ?? 3} điểm`
                  : "Không trừ điểm"}
              </p>
              <Link href={`/student/results/${result.assessmentId}`} className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
                Xem chi tiết đã lưu
              </Link>
            </div>
            <IeltsEvaluationResult evaluation={result.data.ielts} />
          </section>
        ) : null}
      </div>
    </main>
  );
}
