"use client";

import { useState } from "react";
import Link from "next/link";
import { useUser } from "@/app/components/header/useUser";
import { IeltsEvaluationResult } from "@/app/components/IeltsEvaluationResult";
import { TestMaterialPanel } from "@/app/components/TestMaterialPanel";
import {
  describeChartData,
  type ChartMaterialData,
} from "@/lib/test-material";
import type {
  IeltsWritingEvaluation,
  IeltsWritingTaskType,
} from "@/lib/ielts-rubric";
import {
  getWritingLanguageLabel,
  WRITING_LANGUAGES,
  type WritingLanguage,
} from "@/lib/writing-languages";

type EvaluationResponse = {
  assessmentId: string;
  scoreOnly?: boolean;
  points?: { spent: number; available: number };
  streak?: number;
  data: {
    ielts?: IeltsWritingEvaluation;
    evaluation?: {
      scores: Record<string, number>;
      overall: number;
      normalizedOverall?: number;
      taskRelevance?: number;
      language: string;
      exam?: string;
      maxScore?: number;
      band: {
        system: string;
        level: string;
        score: number;
        rationale: string;
      };
      summary: string;
      onTopic?: boolean;
      offTopicReason?: string;
      detailedComment?: string;
    };
    analysis?: {
      strengths: string[];
      weaknesses: string[];
      feedback: string[];
      suggestions: string[];
    };
    mistakes?: {
      grammar: string[];
      vocabulary: string[];
      corrections: Array<{
        original: string;
        improved: string;
        reason: string;
      }>;
    };
    improvements?: {
      suggestions: string[];
      sampleAnswer?: string;
    };
  };
};

const DEFAULT_TASK_PROMPTS: Record<
  WritingLanguage,
  Record<IeltsWritingTaskType, string>
> = {
  ENGLISH: {
    task_1:
      "The chart shows changes in household internet access in three countries between 2000 and 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
    task_2:
      "Some people believe online learning is better than classroom learning. Discuss both views and give your opinion.",
  },
  CHINESE: {
    task_1:
      "图表展示了2000年至2020年三个国家家庭互联网普及率的变化。请概括主要特征，说明重要数据，并进行适当比较。",
    task_2:
      "有人认为在线学习比课堂学习更好。请讨论双方观点，并说明你自己的看法。",
  },
  JAPANESE: {
    task_1:
      "グラフは2000年から2020年までの3か国における家庭のインターネット普及率の変化を示しています。主な特徴を要約し、重要なデータを説明して比較してください。",
    task_2:
      "オンライン学習は教室での学習より優れているという意見があります。両方の見方を論じ、あなた自身の意見を述べてください。",
  },
  KOREAN: {
    task_1:
      "그래프는 2000년부터 2020년까지 3개국의 가정 인터넷 보급률 변화를 보여 줍니다. 주요 특징과 중요한 수치를 설명하고 적절히 비교하십시오.",
    task_2:
      "일부 사람들은 온라인 학습이 교실 학습보다 더 낫다고 생각합니다. 양쪽 견해를 논의하고 자신의 의견을 제시하십시오.",
  },
};

function isDefaultTaskPrompt(prompt: string) {
  return Object.values(DEFAULT_TASK_PROMPTS).some((prompts) =>
    Object.values(prompts).includes(prompt),
  );
}

function toDisplayCriterionName(key: string) {
  const labels: Record<string, string> = {
    task_response: "Đáp ứng đề bài",
    coherence: "Mạch lạc và liên kết",
    vocabulary: "Từ vựng",
    grammar: "Ngữ pháp",
  };
  return labels[key] || key.replace(/_/g, " ");
}

export default function WritingAiPage() {
  const { user } = useUser();
  const [writingLanguage, setWritingLanguage] =
    useState<WritingLanguage>("ENGLISH");
  const [taskType, setTaskType] =
    useState<IeltsWritingTaskType>("task_2");
  const [taskPrompt, setTaskPrompt] = useState(
    DEFAULT_TASK_PROMPTS.ENGLISH.task_2,
  );
  const [essay, setEssay] = useState("");
  const [chartData, setChartData] =
    useState<ChartMaterialData | null>(null);
  const [setupOpen, setSetupOpen] = useState(true);
  const [topicMode, setTopicMode] = useState<"custom" | "random">("custom");
  const [topicInput, setTopicInput] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("");
  const [generatingPrompt, setGeneratingPrompt] = useState(false);
  const [promptError, setPromptError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitAction, setSubmitAction] = useState<
    "score" | "feedback" | null
  >(null);
  const [error, setError] = useState("");
  const [result, setResult] = useState<EvaluationResponse | null>(null);

  function changeTaskType(nextTaskType: IeltsWritingTaskType) {
    const promptIsDefault = isDefaultTaskPrompt(taskPrompt);
    setTaskType(nextTaskType);
    setChartData(null);
    setSelectedTopic("");
    if (promptIsDefault) {
      setTaskPrompt(DEFAULT_TASK_PROMPTS[writingLanguage][nextTaskType]);
    }
    setResult(null);
    setError("");
    setPromptError("");
  }

  function changeWritingLanguage(nextLanguage: WritingLanguage) {
    const promptIsDefault = isDefaultTaskPrompt(taskPrompt);
    setWritingLanguage(nextLanguage);
    setChartData(null);
    setSelectedTopic("");
    if (promptIsDefault) {
      setTaskPrompt(DEFAULT_TASK_PROMPTS[nextLanguage][taskType]);
    }
    setResult(null);
    setError("");
    setPromptError("");
  }

  async function generateWritingPrompt() {
    const topic = topicInput.trim();
    if (topicMode === "custom" && !topic) {
      setPromptError("Hãy nhập topic hoặc chọn chế độ đề ngẫu nhiên.");
      return;
    }

    setGeneratingPrompt(true);
    setPromptError("");
    try {
      const response = await fetch("/api/ai/writing-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskType,
          language: writingLanguage,
          topic: topicMode === "custom" ? topic : "",
          randomTopic: topicMode === "random",
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        topic?: string;
        prompt?: string;
        chart?: ChartMaterialData | null;
        error?: string;
      };

      if (!response.ok || !data.prompt) {
        setPromptError(data.error || "Không thể tạo đề Writing.");
        return;
      }
      if (taskType === "task_1" && !data.chart) {
        setPromptError(
          "Đề Task 1 chưa có dữ liệu minh họa hợp lệ. Vui lòng tạo lại.",
        );
        return;
      }

      setTaskPrompt(data.prompt);
      setChartData(data.chart || null);
      setSelectedTopic(data.topic || topic || "Random");
      setEssay("");
      setResult(null);
      setError("");
      setSetupOpen(false);
    } catch {
      setPromptError("Không thể tạo đề Writing. Vui lòng thử lại.");
    } finally {
      setGeneratingPrompt(false);
    }
  }

  async function submitWriting(includeAiFeedback: boolean) {
    if (loading) return;

    setLoading(true);
    setSubmitAction(includeAiFeedback ? "feedback" : "score");
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
          language: writingLanguage,
          includeAiFeedback,
          referenceData:
            taskType === "task_1" && chartData
              ? describeChartData(chartData)
              : undefined,
          courseId:
            new URLSearchParams(window.location.search).get("courseId") ||
            undefined,
          title: `Writing AI - ${
            taskType === "task_1" ? "Task 1" : "Task 2"
          }`,
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
      setSubmitAction(null);
    }
  }

  const hasChart = taskType === "task_1" && Boolean(chartData);
  const usesCharacterCount =
    writingLanguage === "CHINESE" || writingLanguage === "JAPANESE";
  const essayLength = usesCharacterCount
    ? Array.from(essay).filter((character) => !/\s/.test(character)).length
    : essay.trim()
      ? essay.trim().split(/\s+/).length
      : 0;
  const targetLength = usesCharacterCount
    ? taskType === "task_1"
      ? 300
      : 500
    : taskType === "task_1"
      ? 150
      : 250;

  return (
    <main className="min-h-screen bg-slate-50 py-8">
      <div
        className={`mx-auto space-y-6 px-4 ${
          hasChart ? "max-w-[1500px]" : "max-w-6xl"
        }`}
      >
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
                Chấm điểm miễn phí · Nhận xét AI{" "}
                {user?.role === "STUDENT"
                  ? "-3 điểm"
                  : "miễn phí cho giảng viên và quản trị viên"}
              </p>
              <h1 className="mt-2 text-3xl font-bold text-slate-950">
                Chấm bài viết theo tiêu chuẩn bài thi thật
              </h1>
              <p className="mt-2 max-w-3xl text-slate-600">
                Task 1 dùng dữ liệu do AI tạo với ít nhất hai năm và hai
                chuỗi để so sánh. Chấm điểm chỉ trả kết quả số; nhận xét AI cung
                cấp lỗi, cách cải thiện và bài mẫu.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSetupOpen(true)}
                disabled={loading}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Tạo đề bằng AI
              </button>
              <Link
                href="/student/results"
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Lịch sử kết quả
              </Link>
            </div>
          </div>
        </section>

        <div
          className={
            hasChart
              ? "grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(520px,1fr)]"
              : ""
          }
        >
          {chartData && taskType === "task_1" ? (
            <aside className="lg:sticky lg:top-24">
              <TestMaterialPanel
                material={{
                  title: "Dữ liệu Writing Task 1",
                  data: chartData,
                }}
              />
            </aside>
          ) : null}

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void submitWriting(false);
            }}
            className="rounded-xl border border-slate-200 bg-white p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="text-sm font-semibold text-slate-700">
                Dạng bài Writing
              </label>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  {getWritingLanguageLabel(writingLanguage)}
                </span>
                {selectedTopic ? (
                  <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                    Topic: {selectedTopic}
                  </span>
                ) : null}
              </div>
            </div>
            <select
              value={taskType}
              onChange={(event) =>
                changeTaskType(
                  event.target.value as IeltsWritingTaskType,
                )
              }
              className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="task_1">Writing Task 1</option>
              <option value="task_2">Writing Task 2</option>
            </select>

            <label className="mt-4 block text-sm font-semibold text-slate-700">
              Đề bài
            </label>
            <textarea
              value={taskPrompt}
              onChange={(event) => setTaskPrompt(event.target.value)}
              rows={4}
              className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

            {taskType === "task_1" && !chartData ? (
              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                Task 1 hiện chưa có dữ liệu minh họa. Hãy bấm Tạo đề bằng AI
                để hệ thống tạo biểu đồ, hoặc tự mô tả đầy đủ số liệu trong đề.
              </p>
            ) : null}

            <label className="mt-4 block text-sm font-semibold text-slate-700">
              Bài viết
            </label>
            <textarea
              value={essay}
              onChange={(event) => setEssay(event.target.value)}
              rows={16}
              placeholder="Nhập bài viết của bạn..."
              className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm leading-7 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            <p className="mt-2 text-right text-xs font-semibold text-slate-500">
              {essayLength} {usesCharacterCount ? "ký tự" : "từ"} · mục tiêu
              tham khảo {targetLength} {usesCharacterCount ? "ký tự" : "từ"}
            </p>

            {error ? (
              <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:bg-slate-300"
              >
                {loading && submitAction === "score"
                  ? "Đang chấm điểm..."
                  : "Chấm điểm miễn phí"}
              </button>
              <button
                type="button"
                onClick={() => void submitWriting(true)}
                disabled={loading}
                className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white disabled:bg-slate-300"
              >
                {loading && submitAction === "feedback"
                  ? "AI đang nhận xét..."
                  : user?.role === "STUDENT"
                    ? "Nhận xét AI (-3 điểm)"
                    : "Nhận xét AI"}
              </button>
            </div>
          </form>
        </div>

        {result ? (
          <section className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-red-600">
                {result.scoreOnly
                  ? "Chấm điểm miễn phí · Không trừ điểm"
                  : user?.role === "STUDENT"
                    ? `Nhận xét AI · -${result.points?.spent ?? 3} điểm`
                    : "Nhận xét AI · Không trừ điểm"}
              </p>
              <Link
                href={`/student/results/${result.assessmentId}`}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
              >
                Xem chi tiết đã lưu
              </Link>
            </div>
            {result.data.ielts ? (
              <IeltsEvaluationResult
                evaluation={result.data.ielts}
                scoreOnly={Boolean(result.scoreOnly)}
              />
            ) : result.data.evaluation ? (
              <>
                <section className="rounded-2xl border border-slate-200 bg-white p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-blue-600">
                        {result.data.evaluation.language} ·{" "}
                        {result.data.evaluation.band.system}
                      </p>
                      <h2 className="mt-1 text-2xl font-bold text-slate-950">
                        Cấp độ {result.data.evaluation.band.level}
                      </h2>
                      {!result.scoreOnly ? (
                        <p className="mt-2 text-sm text-slate-600">
                          {result.data.evaluation.summary}
                        </p>
                      ) : (
                        <p className="mt-2 text-sm text-slate-600">
                          Lần chấm này chỉ trả về điểm số.
                        </p>
                      )}
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-5xl font-bold text-slate-950">
                        {result.data.evaluation.overall.toFixed(1)}
                      </p>
                      <p className="text-sm font-semibold text-slate-600">
                        / {result.data.evaluation.maxScore ?? 10}
                      </p>
                    </div>
                  </div>
                </section>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {Object.entries(result.data.evaluation.scores).map(
                    ([key, value]) => (
                      <div
                        key={key}
                        className="rounded-xl border border-slate-200 bg-white p-4"
                      >
                        <p className="text-sm text-slate-500">
                          {toDisplayCriterionName(key)}
                        </p>
                        <p className="mt-2 text-2xl font-bold text-slate-950">
                          {Number(value).toFixed(1)}
                        </p>
                      </div>
                    ),
                  )}
                </div>

                {!result.scoreOnly ? (
                  <section className="grid gap-6 lg:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-white p-5">
                      <h2 className="text-lg font-bold text-slate-950">
                        Nhận xét chi tiết
                      </h2>
                      <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-700">
                        {result.data.evaluation.detailedComment ||
                          result.data.evaluation.summary}
                      </p>
                      {result.data.analysis?.suggestions.length ? (
                        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-700">
                          {result.data.analysis.suggestions.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-5">
                      <h2 className="text-lg font-bold text-slate-950">
                        Bài mẫu
                      </h2>
                      <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-700">
                        {result.data.improvements?.sampleAnswer ||
                          "Chưa có bài mẫu."}
                      </p>
                    </div>
                  </section>
                ) : null}
              </>
            ) : null}
          </section>
        ) : null}
      </div>

      {setupOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-8">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="writing-setup-title"
            className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
          >
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
              Tạo đề Writing bằng AI
            </p>
            <h2
              id="writing-setup-title"
              className="mt-2 text-2xl font-bold text-slate-950"
            >
              Chọn ngôn ngữ và dạng bài
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Với Task 1, AI tạo ít nhất hai năm và hai chuỗi dữ liệu để phân
              tích, so sánh. Với Task 2, AI tạo đề luận theo topic đã chọn.
            </p>

            <label className="mt-5 block text-sm font-semibold text-slate-700">
              Ngôn ngữ
            </label>
            <select
              value={writingLanguage}
              onChange={(event) =>
                changeWritingLanguage(
                  event.target.value as WritingLanguage,
                )
              }
              disabled={generatingPrompt}
              className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm"
            >
              {WRITING_LANGUAGES.map((language) => (
                <option key={language.value} value={language.value}>
                  {language.label}
                </option>
              ))}
            </select>

            <label className="mt-5 block text-sm font-semibold text-slate-700">
              Writing Task
            </label>
            <select
              value={taskType}
              onChange={(event) =>
                changeTaskType(
                  event.target.value as IeltsWritingTaskType,
                )
              }
              disabled={generatingPrompt}
              className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm"
            >
              <option value="task_1">
                Task 1 - Phân tích biểu đồ hoặc bảng số liệu
              </option>
              <option value="task_2">Task 2 - Viết bài luận</option>
            </select>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  setTopicMode("custom");
                  setPromptError("");
                }}
                className={`rounded-xl border p-4 text-left ${
                  topicMode === "custom"
                    ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100"
                    : "border-slate-200"
                }`}
              >
                <span className="block text-sm font-bold text-slate-900">
                  Chọn topic
                </span>
                <span className="mt-1 block text-xs text-slate-600">
                  AI tạo đề dựa trên chủ đề bạn nhập.
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTopicMode("random");
                  setPromptError("");
                }}
                className={`rounded-xl border p-4 text-left ${
                  topicMode === "random"
                    ? "border-violet-500 bg-violet-50 ring-2 ring-violet-100"
                    : "border-slate-200"
                }`}
              >
                <span className="block text-sm font-bold text-slate-900">
                  Random đề
                </span>
                <span className="mt-1 block text-xs text-slate-600">
                  AI tự chọn một chủ đề phù hợp.
                </span>
              </button>
            </div>

            {topicMode === "custom" ? (
              <>
                <label className="mt-4 block text-sm font-semibold text-slate-700">
                  Topic
                </label>
                <input
                  value={topicInput}
                  onChange={(event) => {
                    setTopicInput(event.target.value);
                    setPromptError("");
                  }}
                  maxLength={100}
                  placeholder={
                    taskType === "task_1"
                      ? "Ví dụ: internet access, transport, energy..."
                      : "Ví dụ: education, technology, environment..."
                  }
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm"
                />
              </>
            ) : null}

            {promptError ? (
              <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {promptError}
              </p>
            ) : null}

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setSetupOpen(false)}
                disabled={generatingPrompt}
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700"
              >
                Tự nhập đề
              </button>
              <button
                type="button"
                onClick={() => void generateWritingPrompt()}
                disabled={generatingPrompt}
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:bg-slate-300"
              >
                {generatingPrompt
                  ? "AI đang tạo đề..."
                  : taskType === "task_1"
                    ? "Tạo đề và biểu đồ"
                    : "Tạo đề bằng AI"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
