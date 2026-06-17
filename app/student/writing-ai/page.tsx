"use client";

import { useReducer } from "react";
import Link from "next/link";
import { useUser } from "@/app/components/header/useUser";
import { IeltsEvaluationResult } from "@/app/components/IeltsEvaluationResult";
import { TestMaterialPanel } from "@/app/components/TestMaterialPanel";
import { describeChartData, type ChartMaterialData } from "@/lib/test-material";
import type { IeltsWritingEvaluation, IeltsWritingTaskType } from "@/lib/ielts-rubric";
import { getWritingLanguageLabel, WRITING_LANGUAGES, type WritingLanguage } from "@/lib/writing-languages";

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

type WritingState = {
  writingLanguage: WritingLanguage;
  taskType: IeltsWritingTaskType;
  taskPrompt: string;
  essay: string;
  chartData: ChartMaterialData | null;
  setupOpen: boolean;
  topicMode: "custom" | "random";
  topicInput: string;
  selectedTopic: string;
  generatingPrompt: boolean;
  promptError: string;
  loading: boolean;
  submitAction: "score" | "feedback" | null;
  error: string;
  result: EvaluationResponse | null;
};

type WritingAction =
  | { type: "SET_SETUP_OPEN"; setupOpen: boolean }
  | { type: "SET_TASK_TYPE"; taskType: IeltsWritingTaskType }
  | { type: "SET_LANGUAGE"; language: WritingLanguage }
  | { type: "SET_TASK_PROMPT"; prompt: string }
  | { type: "SET_ESSAY"; essay: string }
  | { type: "SET_TOPIC_MODE"; mode: "custom" | "random" }
  | { type: "SET_TOPIC_INPUT"; topicInput: string }
  | { type: "PROMPT_START" }
  | { type: "PROMPT_ERROR"; error: string }
  | { type: "PROMPT_SUCCESS"; prompt: string; chartData: ChartMaterialData | null; selectedTopic: string }
  | { type: "PROMPT_FINISH" }
  | { type: "SUBMIT_START"; submitAction: "score" | "feedback" }
  | { type: "SUBMIT_ERROR"; error: string }
  | { type: "SUBMIT_SUCCESS"; result: EvaluationResponse }
  | { type: "SUBMIT_FINISH" };

const DEFAULT_TASK_PROMPTS: Record<WritingLanguage, Record<IeltsWritingTaskType, string>> = {
  ENGLISH: {
    task_1:
      "The chart shows changes in household internet access in three countries between 2000 and 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
    task_2:
      "Some people believe online learning is better than classroom learning. Discuss both views and give your opinion.",
  },
  CHINESE: {
    task_1: "图表展示了2000年至2020年三个国家家庭互联网普及率的变化。请概括主要特征，说明重要数据，并进行适当比较。",
    task_2: "有人认为在线学习比课堂学习更好。请讨论双方观点，并说明你自己的看法。",
  },
  JAPANESE: {
    task_1: "グラフは2000年から2020年までの3か国における家庭のインターネット普及率の変化を示しています。主な特徴を要約し、重要なデータを説明して比較してください。",
    task_2: "オンライン学習は教室での学習より優れているという意見があります。両方の見方を論じ、あなた自身の意見を述べてください。",
  },
  KOREAN: {
    task_1: "그래프는 2000년부터 2020년까지 3개국의 가정 인터넷 보급률 변화를 보여 줍니다. 주요 특징과 중요한 수치를 설명하고 적절히 비교하십시오.",
    task_2: "일부 사람들은 온라인 학습이 교실 학습보다 더 낫다고 생각합니다. 양쪽 견해를 논의하고 자신의 의견을 제시하십시오.",
  },
};

function createInitialState(): WritingState {
  return {
    writingLanguage: "ENGLISH",
    taskType: "task_2",
    taskPrompt: DEFAULT_TASK_PROMPTS.ENGLISH.task_2,
    essay: "",
    chartData: null,
    setupOpen: true,
    topicMode: "custom",
    topicInput: "",
    selectedTopic: "",
    generatingPrompt: false,
    promptError: "",
    loading: false,
    submitAction: null,
    error: "",
    result: null,
  };
}

function isDefaultTaskPrompt(prompt: string) {
  return Object.values(DEFAULT_TASK_PROMPTS).some((prompts) => Object.values(prompts).includes(prompt));
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

function writingReducer(state: WritingState, action: WritingAction): WritingState {
  switch (action.type) {
    case "SET_SETUP_OPEN":
      return { ...state, setupOpen: action.setupOpen };
    case "SET_TASK_TYPE":
      return {
        ...state,
        taskType: action.taskType,
        taskPrompt: isDefaultTaskPrompt(state.taskPrompt) ? DEFAULT_TASK_PROMPTS[state.writingLanguage][action.taskType] : state.taskPrompt,
        chartData: null,
        selectedTopic: "",
        result: null,
        error: "",
        promptError: "",
      };
    case "SET_LANGUAGE":
      return {
        ...state,
        writingLanguage: action.language,
        taskPrompt: isDefaultTaskPrompt(state.taskPrompt) ? DEFAULT_TASK_PROMPTS[action.language][state.taskType] : state.taskPrompt,
        chartData: null,
        selectedTopic: "",
        result: null,
        error: "",
        promptError: "",
      };
    case "SET_TASK_PROMPT":
      return { ...state, taskPrompt: action.prompt };
    case "SET_ESSAY":
      return { ...state, essay: action.essay };
    case "SET_TOPIC_MODE":
      return { ...state, topicMode: action.mode, promptError: "" };
    case "SET_TOPIC_INPUT":
      return { ...state, topicInput: action.topicInput, promptError: "" };
    case "PROMPT_START":
      return { ...state, generatingPrompt: true, promptError: "" };
    case "PROMPT_ERROR":
      return { ...state, promptError: action.error };
    case "PROMPT_SUCCESS":
      return {
        ...state,
        taskPrompt: action.prompt,
        chartData: action.chartData,
        selectedTopic: action.selectedTopic,
        essay: "",
        result: null,
        error: "",
        setupOpen: false,
      };
    case "PROMPT_FINISH":
      return { ...state, generatingPrompt: false };
    case "SUBMIT_START":
      return { ...state, loading: true, submitAction: action.submitAction, error: "", result: null };
    case "SUBMIT_ERROR":
      return { ...state, error: action.error };
    case "SUBMIT_SUCCESS":
      return { ...state, result: action.result };
    case "SUBMIT_FINISH":
      return { ...state, loading: false, submitAction: null };
    default:
      return state;
  }
}

export default function WritingAiPage() {
  const { user } = useUser();
  const [state, dispatch] = useReducer(writingReducer, undefined, createInitialState);
  const hasChart = state.taskType === "task_1" && Boolean(state.chartData);
  const writingMeta = getWritingMeta(state);

  async function generateWritingPrompt() {
    const topic = state.topicInput.trim();
    if (state.topicMode === "custom" && !topic) {
      dispatch({ type: "PROMPT_ERROR", error: "Hãy nhập topic hoặc chọn chế độ đề ngẫu nhiên." });
      return;
    }

    dispatch({ type: "PROMPT_START" });
    try {
      const response = await fetch("/api/ai/writing-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskType: state.taskType,
          language: state.writingLanguage,
          topic: state.topicMode === "custom" ? topic : "",
          randomTopic: state.topicMode === "random",
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        topic?: string;
        prompt?: string;
        chart?: ChartMaterialData | null;
        error?: string;
      };

      if (!response.ok || !data.prompt) {
        dispatch({ type: "PROMPT_ERROR", error: data.error || "Không thể tạo đề Writing." });
        return;
      }
      if (state.taskType === "task_1" && !data.chart) {
        dispatch({ type: "PROMPT_ERROR", error: "Đề Task 1 chưa có dữ liệu minh họa hợp lệ. Vui lòng tạo lại." });
        return;
      }

      dispatch({
        type: "PROMPT_SUCCESS",
        prompt: data.prompt,
        chartData: data.chart || null,
        selectedTopic: data.topic || topic || "Random",
      });
    } catch {
      dispatch({ type: "PROMPT_ERROR", error: "Không thể tạo đề Writing. Vui lòng thử lại." });
    } finally {
      dispatch({ type: "PROMPT_FINISH" });
    }
  }

  async function submitWriting(includeAiFeedback: boolean) {
    if (state.loading) return;

    dispatch({ type: "SUBMIT_START", submitAction: includeAiFeedback ? "feedback" : "score" });

    try {
      const response = await fetch("/api/ai/essay-evaluation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          essay: state.essay,
          taskPrompt: state.taskPrompt,
          taskType: state.taskType,
          language: state.writingLanguage,
          includeAiFeedback,
          referenceData: state.taskType === "task_1" && state.chartData ? describeChartData(state.chartData) : undefined,
          courseId: new URLSearchParams(window.location.search).get("courseId") || undefined,
          title: `Writing AI - ${state.taskType === "task_1" ? "Task 1" : "Task 2"}`,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        dispatch({ type: "SUBMIT_ERROR", error: data.error || "Không chấm được bài viết." });
        return;
      }
      dispatch({ type: "SUBMIT_SUCCESS", result: data });
    } catch {
      dispatch({ type: "SUBMIT_ERROR", error: "Không chấm được bài viết." });
    } finally {
      dispatch({ type: "SUBMIT_FINISH" });
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 py-8">
      <div className={`mx-auto space-y-6 px-4 ${hasChart ? "max-w-[1500px]" : "max-w-6xl"}`}>
        <WritingHero role={user?.role} loading={state.loading} onOpenSetup={() => dispatch({ type: "SET_SETUP_OPEN", setupOpen: true })} />
        <div className={hasChart ? "grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(520px,1fr)]" : ""}>
          {state.chartData && state.taskType === "task_1" ? (
            <aside className="lg:sticky lg:top-24">
              <TestMaterialPanel material={{ title: "Dữ liệu Writing Task 1", data: state.chartData }} />
            </aside>
          ) : null}

          <WritingForm
            state={state}
            meta={writingMeta}
            role={user?.role}
            onTaskTypeChange={(taskType) => dispatch({ type: "SET_TASK_TYPE", taskType })}
            onPromptChange={(prompt) => dispatch({ type: "SET_TASK_PROMPT", prompt })}
            onEssayChange={(essay) => dispatch({ type: "SET_ESSAY", essay })}
            onSubmit={submitWriting}
          />
        </div>

        {state.result ? <WritingResult result={state.result} role={user?.role} /> : null}
      </div>

      {state.setupOpen ? (
        <WritingSetupModal
          state={state}
          onClose={() => dispatch({ type: "SET_SETUP_OPEN", setupOpen: false })}
          onLanguageChange={(language) => dispatch({ type: "SET_LANGUAGE", language })}
          onTaskTypeChange={(taskType) => dispatch({ type: "SET_TASK_TYPE", taskType })}
          onTopicModeChange={(mode) => dispatch({ type: "SET_TOPIC_MODE", mode })}
          onTopicInputChange={(topicInput) => dispatch({ type: "SET_TOPIC_INPUT", topicInput })}
          onGenerate={() => void generateWritingPrompt()}
        />
      ) : null}
    </main>
  );
}

function getWritingMeta(state: WritingState) {
  const usesCharacterCount = state.writingLanguage === "CHINESE" || state.writingLanguage === "JAPANESE";
  const essayLength = usesCharacterCount
    ? Array.from(state.essay).filter((character) => !/\s/.test(character)).length
    : state.essay.trim()
      ? state.essay.trim().split(/\s+/).length
      : 0;
  const targetLength = usesCharacterCount ? (state.taskType === "task_1" ? 300 : 500) : state.taskType === "task_1" ? 150 : 250;
  return { usesCharacterCount, essayLength, targetLength };
}

function WritingHero({ role, loading, onOpenSetup }: { role?: string; loading: boolean; onOpenSetup: () => void }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
            Chấm điểm miễn phí · Nhận xét AI {role !== "ADMIN" ? "-3 hạt đậu" : "miễn phí cho quản trị viên"}
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">Chấm bài viết theo tiêu chuẩn bài thi thật</h1>
          <p className="mt-2 max-w-3xl text-slate-600">
            Task 1 dùng dữ liệu do AI tạo với ít nhất hai năm và hai chuỗi để so sánh. Chấm điểm chỉ trả kết quả số; nhận xét AI cung cấp lỗi, cách cải thiện và bài mẫu.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onOpenSetup} disabled={loading} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            Tạo đề bằng AI
          </button>
          <Link href="/student/results" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
            Lịch sử kết quả
          </Link>
        </div>
      </div>
    </section>
  );
}

function WritingForm({
  state,
  meta,
  role,
  onTaskTypeChange,
  onPromptChange,
  onEssayChange,
  onSubmit,
}: {
  state: WritingState;
  meta: ReturnType<typeof getWritingMeta>;
  role?: string;
  onTaskTypeChange: (taskType: IeltsWritingTaskType) => void;
  onPromptChange: (prompt: string) => void;
  onEssayChange: (essay: string) => void;
  onSubmit: (includeAiFeedback: boolean) => Promise<void>;
}) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit(false);
      }}
      className="rounded-xl border border-slate-200 bg-white p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label htmlFor="writing-task-type" className="text-sm font-semibold text-slate-700">
          Dạng bài Writing
        </label>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{getWritingLanguageLabel(state.writingLanguage)}</span>
          {state.selectedTopic ? <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">Topic: {state.selectedTopic}</span> : null}
        </div>
      </div>
      <select
        id="writing-task-type"
        value={state.taskType}
        onChange={(event) => onTaskTypeChange(event.target.value as IeltsWritingTaskType)}
        className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      >
        <option value="task_1">Writing Task 1</option>
        <option value="task_2">Writing Task 2</option>
      </select>

      <label htmlFor="writing-task-prompt" className="mt-4 block text-sm font-semibold text-slate-700">
        Đề bài
      </label>
      <textarea
        id="writing-task-prompt"
        value={state.taskPrompt}
        onChange={(event) => onPromptChange(event.target.value)}
        rows={4}
        className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />

      {state.taskType === "task_1" && !state.chartData ? (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Task 1 hiện chưa có dữ liệu minh họa. Hãy bấm Tạo đề bằng AI để hệ thống tạo biểu đồ, hoặc tự mô tả đầy đủ số liệu trong đề.
        </p>
      ) : null}

      <label htmlFor="writing-essay" className="mt-4 block text-sm font-semibold text-slate-700">
        Bài viết
      </label>
      <textarea
        id="writing-essay"
        value={state.essay}
        onChange={(event) => onEssayChange(event.target.value)}
        rows={16}
        placeholder="Nhập bài viết của bạn..."
        className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm leading-7 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
      <p className="mt-2 text-right text-xs font-semibold text-slate-500">
        {meta.essayLength} {meta.usesCharacterCount ? "ký tự" : "từ"} · mục tiêu tham khảo {meta.targetLength} {meta.usesCharacterCount ? "ký tự" : "từ"}
      </p>

      {state.error ? <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{state.error}</p> : null}

      <div className="mt-4 flex flex-wrap gap-3">
        <button type="submit" disabled={state.loading} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:bg-slate-300">
          {state.loading && state.submitAction === "score" ? "Đang chấm điểm..." : "Chấm điểm miễn phí"}
        </button>
        <button type="button" onClick={() => void onSubmit(true)} disabled={state.loading} className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white disabled:bg-slate-300">
          {state.loading && state.submitAction === "feedback" ? "AI đang nhận xét..." : role !== "ADMIN" ? "Nhận xét AI (-3 hạt đậu)" : "Nhận xét AI"}
        </button>
      </div>
    </form>
  );
}

function WritingResult({ result, role }: { result: EvaluationResponse; role?: string }) {
  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-semibold text-red-600">
          {result.scoreOnly
            ? "Chấm điểm miễn phí · Không trừ hạt đậu"
            : role !== "ADMIN"
              ? `Nhận xét AI · -${result.points?.spent ?? 3} hạt đậu`
              : "Nhận xét AI · Không trừ hạt đậu"}
        </p>
        <Link href={`/student/results/${result.assessmentId}`} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
          Xem chi tiết đã lưu
        </Link>
      </div>
      {result.data.ielts ? (
        <IeltsEvaluationResult evaluation={result.data.ielts} scoreOnly={Boolean(result.scoreOnly)} />
      ) : result.data.evaluation ? (
        <LegacyWritingResult result={result} />
      ) : null}
    </section>
  );
}

function LegacyWritingResult({ result }: { result: EvaluationResponse }) {
  const evaluation = result.data.evaluation;
  if (!evaluation) return null;

  return (
    <>
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-blue-600">
              {evaluation.language} · {evaluation.band.system}
            </p>
            <h2 className="mt-1 text-2xl font-bold text-slate-950">Cấp độ {evaluation.band.level}</h2>
            {!result.scoreOnly ? (
              <p className="mt-2 text-sm text-slate-600">{evaluation.summary}</p>
            ) : (
              <p className="mt-2 text-sm text-slate-600">Lần chấm này chỉ trả về điểm số.</p>
            )}
          </div>
          <div className="text-left sm:text-right">
            <p className="text-5xl font-bold text-slate-950">{evaluation.overall.toFixed(1)}</p>
            <p className="text-sm font-semibold text-slate-600">/ {evaluation.maxScore ?? 10}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Object.entries(evaluation.scores).map(([key, value]) => (
          <div key={key} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">{toDisplayCriterionName(key)}</p>
            <p className="mt-2 text-2xl font-bold text-slate-950">{Number(value).toFixed(1)}</p>
          </div>
        ))}
      </div>

      {!result.scoreOnly ? (
        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-bold text-slate-950">Nhận xét chi tiết</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-700">{evaluation.detailedComment || evaluation.summary}</p>
            {result.data.analysis?.suggestions.length ? (
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-700">
                {result.data.analysis.suggestions.map((item) => <li key={item}>{item}</li>)}
              </ul>
            ) : null}
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-bold text-slate-950">Bài mẫu</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-700">{result.data.improvements?.sampleAnswer || "Chưa có bài mẫu."}</p>
          </div>
        </section>
      ) : null}
    </>
  );
}

function WritingSetupModal({
  state,
  onClose,
  onLanguageChange,
  onTaskTypeChange,
  onTopicModeChange,
  onTopicInputChange,
  onGenerate,
}: {
  state: WritingState;
  onClose: () => void;
  onLanguageChange: (language: WritingLanguage) => void;
  onTaskTypeChange: (taskType: IeltsWritingTaskType) => void;
  onTopicModeChange: (mode: "custom" | "random") => void;
  onTopicInputChange: (value: string) => void;
  onGenerate: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-8">
      <section role="dialog" aria-modal="true" aria-labelledby="writing-setup-title" className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Tạo đề Writing bằng AI</p>
        <h2 id="writing-setup-title" className="mt-2 text-2xl font-bold text-slate-950">Chọn ngôn ngữ và dạng bài</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Với Task 1, AI tạo ít nhất hai năm và hai chuỗi dữ liệu để phân tích, so sánh. Với Task 2, AI tạo đề luận theo topic đã chọn.
        </p>

        <label htmlFor="writing-language" className="mt-5 block text-sm font-semibold text-slate-700">Ngôn ngữ</label>
        <select
          id="writing-language"
          value={state.writingLanguage}
          onChange={(event) => onLanguageChange(event.target.value as WritingLanguage)}
          disabled={state.generatingPrompt}
          className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm"
        >
          {WRITING_LANGUAGES.map((language) => <option key={language.value} value={language.value}>{language.label}</option>)}
        </select>

        <label htmlFor="writing-modal-task-type" className="mt-5 block text-sm font-semibold text-slate-700">Writing Task</label>
        <select
          id="writing-modal-task-type"
          value={state.taskType}
          onChange={(event) => onTaskTypeChange(event.target.value as IeltsWritingTaskType)}
          disabled={state.generatingPrompt}
          className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm"
        >
          <option value="task_1">Task 1 - Phân tích biểu đồ hoặc bảng số liệu</option>
          <option value="task_2">Task 2 - Viết bài luận</option>
        </select>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <TopicModeButton active={state.topicMode === "custom"} title="Chọn topic" description="AI tạo đề dựa trên chủ đề bạn nhập." onClick={() => onTopicModeChange("custom")} />
          <TopicModeButton active={state.topicMode === "random"} title="Random đề" description="AI tự chọn một chủ đề phù hợp." onClick={() => onTopicModeChange("random")} />
        </div>

        {state.topicMode === "custom" ? (
          <>
            <label htmlFor="writing-topic" className="mt-4 block text-sm font-semibold text-slate-700">Topic</label>
            <input
              id="writing-topic"
              value={state.topicInput}
              onChange={(event) => onTopicInputChange(event.target.value)}
              maxLength={100}
              placeholder={state.taskType === "task_1" ? "Ví dụ: internet access, transport, energy..." : "Ví dụ: education, technology, environment..."}
              className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm"
            />
          </>
        ) : null}

        {state.promptError ? <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{state.promptError}</p> : null}

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button type="button" onClick={onClose} disabled={state.generatingPrompt} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700">
            Tự nhập đề
          </button>
          <button type="button" onClick={onGenerate} disabled={state.generatingPrompt} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:bg-slate-300">
            {state.generatingPrompt ? "AI đang tạo đề..." : state.taskType === "task_1" ? "Tạo đề và biểu đồ" : "Tạo đề bằng AI"}
          </button>
        </div>
      </section>
    </div>
  );
}

function TopicModeButton({ active, title, description, onClick }: { active: boolean; title: string; description: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-4 text-left ${active ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100" : "border-slate-200"}`}
    >
      <span className="block text-sm font-bold text-slate-900">{title}</span>
      <span className="mt-1 block text-xs text-slate-600">{description}</span>
    </button>
  );
}
