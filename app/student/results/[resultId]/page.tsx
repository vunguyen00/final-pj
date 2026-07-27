import type { ReactNode } from "react";
import Link from "next/link";
import { IeltsEvaluationResult } from "@/app/components/IeltsEvaluationResult";
import {
  LanguageEvaluationResult,
  type LanguageAnalysisData,
  type LanguageEvaluationData,
} from "@/app/components/LanguageEvaluationResult";
import { requireRole } from "@/lib/auth";
import { extractStoredIeltsEvaluation } from "@/lib/ielts-rubric";
import { getStudentResultDetail, RESULT_FORBIDDEN_ERROR, type ResultDetail } from "@/lib/student-results";
import { getContentUiLanguage } from "@/lib/language-display";
import { normalizeFeedbackTextItems } from "@/lib/ai-feedback-normalization";
import type { UiLanguage } from "@/lib/test-language-labels";

type TestAiEvaluation = {
  scoreOnly?: boolean;
  language?: string;
  overallScore?: number;
  taskRelevance?: number;
  onTopic?: boolean;
  offTopicReason?: string;
  detailedComment?: string;
  sampleAnswer?: string;
  summary?: string;
  weaknesses?: string[];
  suggestions?: string[];
};

type TestQuestionResult = {
  questionId?: string;
  questionType?: string;
  content?: string;
  studentAnswer?: string;
  earnedScore?: number;
  score?: number;
  aiEvaluation?: TestAiEvaluation;
};

const CRITERION_LABELS: Record<string, string> = {
  totalQuestions: "Tổng số câu hỏi",
  correctAnswers: "Số câu đúng",
  taskAchievement: "Mức độ hoàn thành yêu cầu",
  taskResponse: "Mức độ đáp ứng đề bài",
  coherenceCohesion: "Mạch lạc và liên kết",
  lexicalResource: "Vốn từ vựng",
  grammarRangeAccuracy: "Ngữ pháp và độ chính xác",
  fluencyCoherence: "Độ trôi chảy và mạch lạc",
  pronunciation: "Phát âm",
  grammar: "Ngữ pháp",
  vocabulary: "Từ vựng",
};

const RESULT_DETAIL_LABELS: Record<UiLanguage, {
  aiReview: string;
  strengths: string;
  weaknesses: string;
  detailedFeedback: string;
  mistakesAndSuggestions: string;
  improvement: string;
  noMistakes: string;
  noExtraSuggestions: string;
  savedSubmission: string;
  prompt: string;
  sampleAnswer: string;
}> = {
  vi: {
    aiReview: "Nh\u1eadn x\u00e9t c\u1ee7a AI",
    strengths: "\u0110i\u1ec3m m\u1ea1nh",
    weaknesses: "\u0110i\u1ec3m c\u1ea7n c\u1ea3i thi\u1ec7n",
    detailedFeedback: "Ph\u1ea3n h\u1ed3i chi ti\u1ebft",
    mistakesAndSuggestions: "L\u1ed7i sai v\u00e0 g\u1ee3i \u00fd",
    improvement: "C\u00e1ch c\u1ea3i thi\u1ec7n",
    noMistakes: "Ch\u01b0a c\u00f3 l\u1ed7i c\u1ee5 th\u1ec3.",
    noExtraSuggestions: "Ch\u01b0a c\u00f3 g\u1ee3i \u00fd b\u1ed5 sung.",
    savedSubmission: "B\u00e0i l\u00e0m \u0111\u00e3 l\u01b0u",
    prompt: "\u0110\u1ec1 b\u00e0i:",
    sampleAnswer: "B\u00e0i m\u1eabu tham kh\u1ea3o",
  },
  en: {
    aiReview: "AI Feedback",
    strengths: "Strengths",
    weaknesses: "Areas to Improve",
    detailedFeedback: "Detailed Feedback",
    mistakesAndSuggestions: "Errors and Suggestions",
    improvement: "How to Improve",
    noMistakes: "No specific errors yet.",
    noExtraSuggestions: "No extra suggestions yet.",
    savedSubmission: "Saved Submission",
    prompt: "Prompt:",
    sampleAnswer: "Reference Answer",
  },
  zh: {
    aiReview: "AI\u53cd\u9988",
    strengths: "\u4f18\u70b9",
    weaknesses: "\u9700\u6539\u8fdb\u4e4b\u5904",
    detailedFeedback: "\u8be6\u7ec6\u53cd\u9988",
    mistakesAndSuggestions: "\u9519\u8bef\u4e0e\u5efa\u8bae",
    improvement: "\u6539\u8fdb\u65b9\u6cd5",
    noMistakes: "\u6682\u65e0\u5177\u4f53\u9519\u8bef\u3002",
    noExtraSuggestions: "\u6682\u65e0\u989d\u5916\u5efa\u8bae\u3002",
    savedSubmission: "\u5df2\u4fdd\u5b58\u7684\u4f5c\u7b54",
    prompt: "\u9898\u76ee\uff1a",
    sampleAnswer: "\u53c2\u8003\u7b54\u6848",
  },
  ja: {
    aiReview: "AI\u30d5\u30a3\u30fc\u30c9\u30d0\u30c3\u30af",
    strengths: "\u826f\u3044\u70b9",
    weaknesses: "\u6539\u5584\u70b9",
    detailedFeedback: "\u8a73\u7d30\u30d5\u30a3\u30fc\u30c9\u30d0\u30c3\u30af",
    mistakesAndSuggestions: "\u9593\u9055\u3044\u3068\u30a2\u30c9\u30d0\u30a4\u30b9",
    improvement: "\u6539\u5584\u65b9\u6cd5",
    noMistakes: "\u5177\u4f53\u7684\u306a\u9593\u9055\u3044\u306f\u307e\u3060\u3042\u308a\u307e\u305b\u3093\u3002",
    noExtraSuggestions: "\u8ffd\u52a0\u306e\u30a2\u30c9\u30d0\u30a4\u30b9\u306f\u307e\u3060\u3042\u308a\u307e\u305b\u3093\u3002",
    savedSubmission: "\u4fdd\u5b58\u3055\u308c\u305f\u89e3\u7b54",
    prompt: "\u8ab2\u984c\uff1a",
    sampleAnswer: "\u53c2\u8003\u89e3\u7b54",
  },
  ko: {
    aiReview: "AI \ud53c\ub4dc\ubc31",
    strengths: "\uac15\uc810",
    weaknesses: "\uac1c\uc120\ud560 \uc810",
    detailedFeedback: "\uc0c1\uc138 \ud53c\ub4dc\ubc31",
    mistakesAndSuggestions: "\uc624\ub958\uc640 \uc81c\uc548",
    improvement: "\uac1c\uc120 \ubc29\ubc95",
    noMistakes: "\uad6c\uccb4\uc801\uc778 \uc624\ub958\uac00 \uc544\uc9c1 \uc5c6\uc2b5\ub2c8\ub2e4.",
    noExtraSuggestions: "\ucd94\uac00 \uc81c\uc548\uc774 \uc544\uc9c1 \uc5c6\uc2b5\ub2c8\ub2e4.",
    savedSubmission: "\uc800\uc7a5\ub41c \ub2f5\uc548",
    prompt: "\ubb38\uc81c:",
    sampleAnswer: "\ucc38\uace0 \ub2f5\uc548",
  },
};

function getResultLanguage(detail: ResultDetail) {
  const feedback = detail.feedback || {};
  const evaluation = (feedback.evaluation || {}) as Record<string, unknown>;
  return (
    detail.language?.code ||
    detail.language?.name ||
    detail.course?.language?.code ||
    detail.course?.language?.name ||
    String(evaluation.language || detail.band.system || "")
  );
}

function getResultDetailLabels(detail: ResultDetail) {
  return RESULT_DETAIL_LABELS[getContentUiLanguage(getResultLanguage(detail))];
}

const CRITERION_LABELS_BY_LANGUAGE: Record<UiLanguage, Record<string, string>> = {
  vi: {
    majorErrors: "L\u1ed7i ch\u00ednh",
    improvementsNeeded: "\u0110i\u1ec3m c\u1ea7n c\u1ea3i thi\u1ec7n",
    pronunciationErrors: "L\u1ed7i ph\u00e1t \u00e2m",
    grammarErrors: "L\u1ed7i ng\u1eef ph\u00e1p",
    vocabularyErrors: "L\u1ed7i t\u1eeb v\u1ef1ng",
    fluencyIssues: "V\u1ea5n \u0111\u1ec1 v\u1ec1 \u0111\u1ed9 tr\u00f4i ch\u1ea3y",
    suggestions: "G\u1ee3i \u00fd",
    sampleAnswer: "B\u00e0i m\u1eabu",
    practiceMethods: "Ph\u01b0\u01a1ng ph\u00e1p luy\u1ec7n t\u1eadp",
    corrections: "S\u1eeda l\u1ed7i",
  },
  en: {
    totalQuestions: "Total Questions",
    correctAnswers: "Correct Answers",
    taskAchievement: "Task Achievement",
    taskResponse: "Task Response",
    coherenceCohesion: "Coherence and Cohesion",
    lexicalResource: "Lexical Resource",
    grammarRangeAccuracy: "Grammar Range and Accuracy",
    fluencyCoherence: "Fluency and Coherence",
    pronunciation: "Pronunciation",
    grammar: "Grammar",
    vocabulary: "Vocabulary",
    majorErrors: "Major Errors",
    improvementsNeeded: "Improvements Needed",
    pronunciationErrors: "Pronunciation Errors",
    grammarErrors: "Grammar Errors",
    vocabularyErrors: "Vocabulary Errors",
    fluencyIssues: "Fluency Issues",
    suggestions: "Suggestions",
    sampleAnswer: "Sample Answer",
    practiceMethods: "Practice Methods",
    corrections: "Corrections",
  },
  zh: {
    totalQuestions: "\u9898\u76ee\u603b\u6570",
    correctAnswers: "\u6b63\u786e\u9898\u6570",
    taskAchievement: "\u4efb\u52a1\u5b8c\u6210\u5ea6",
    taskResponse: "\u4efb\u52a1\u56de\u5e94",
    coherenceCohesion: "\u8fde\u8d2f\u4e0e\u8854\u63a5",
    lexicalResource: "\u8bcd\u6c47\u8d44\u6e90",
    grammarRangeAccuracy: "\u8bed\u6cd5\u8303\u56f4\u4e0e\u51c6\u786e\u6027",
    fluencyCoherence: "\u6d41\u5229\u5ea6\u4e0e\u8fde\u8d2f\u6027",
    pronunciation: "\u53d1\u97f3",
    grammar: "\u8bed\u6cd5",
    vocabulary: "\u8bcd\u6c47",
    majorErrors: "\u4e3b\u8981\u9519\u8bef",
    improvementsNeeded: "\u9700\u6539\u8fdb\u7684\u5730\u65b9",
    pronunciationErrors: "\u53d1\u97f3\u9519\u8bef",
    grammarErrors: "\u8bed\u6cd5\u9519\u8bef",
    vocabularyErrors: "\u8bcd\u6c47\u9519\u8bef",
    fluencyIssues: "\u6d41\u5229\u5ea6\u95ee\u9898",
    suggestions: "\u5efa\u8bae",
    sampleAnswer: "\u53c2\u8003\u7b54\u6848",
    practiceMethods: "\u7ec3\u4e60\u65b9\u6cd5",
    corrections: "\u4fee\u6b63",
  },
  ja: {
    totalQuestions: "\u554f\u984c\u6570",
    correctAnswers: "\u6b63\u89e3\u6570",
    taskAchievement: "\u8ab2\u984c\u9054\u6210\u5ea6",
    taskResponse: "\u8ab2\u984c\u3078\u306e\u5fdc\u7b54",
    coherenceCohesion: "\u4e00\u8cab\u6027\u3068\u8854\u63a5\u6027",
    lexicalResource: "\u8a9e\u5f59",
    grammarRangeAccuracy: "\u6587\u6cd5\u306e\u5e45\u3068\u6b63\u78ba\u3055",
    fluencyCoherence: "\u6d41\u66a2\u3055\u3068\u4e00\u8cab\u6027",
    pronunciation: "\u767a\u97f3",
    grammar: "\u6587\u6cd5",
    vocabulary: "\u8a9e\u5f59",
    majorErrors: "\u4e3b\u306a\u9593\u9055\u3044",
    improvementsNeeded: "\u6539\u5584\u304c\u5fc5\u8981\u306a\u70b9",
    pronunciationErrors: "\u767a\u97f3\u306e\u9593\u9055\u3044",
    grammarErrors: "\u6587\u6cd5\u306e\u9593\u9055\u3044",
    vocabularyErrors: "\u8a9e\u5f59\u306e\u9593\u9055\u3044",
    fluencyIssues: "\u6d41\u66a2\u3055\u306e\u8ab2\u984c",
    suggestions: "\u30a2\u30c9\u30d0\u30a4\u30b9",
    sampleAnswer: "\u53c2\u8003\u89e3\u7b54",
    practiceMethods: "\u7df4\u7fd2\u65b9\u6cd5",
    corrections: "\u4fee\u6b63",
  },
  ko: {
    totalQuestions: "\ubb38\ud56d \uc218",
    correctAnswers: "\uc815\ub2f5 \uc218",
    taskAchievement: "\uacfc\uc81c \uc644\uc131\ub3c4",
    taskResponse: "\uacfc\uc81c \uc751\ub2f5",
    coherenceCohesion: "\uc77c\uad00\uc131\uacfc \uc751\uc9d1\uc131",
    lexicalResource: "\uc5b4\ud718",
    grammarRangeAccuracy: "\ubb38\ubc95 \ubc94\uc704\uc640 \uc815\ud655\uc131",
    fluencyCoherence: "\uc720\ucc3d\uc131\uacfc \uc77c\uad00\uc131",
    pronunciation: "\ubc1c\uc74c",
    grammar: "\ubb38\ubc95",
    vocabulary: "\uc5b4\ud718",
    majorErrors: "\uc8fc\uc694 \uc624\ub958",
    improvementsNeeded: "\uac1c\uc120\uc774 \ud544\uc694\ud55c \uc810",
    pronunciationErrors: "\ubc1c\uc74c \uc624\ub958",
    grammarErrors: "\ubb38\ubc95 \uc624\ub958",
    vocabularyErrors: "\uc5b4\ud718 \uc624\ub958",
    fluencyIssues: "\uc720\ucc3d\uc131 \ubb38\uc81c",
    suggestions: "\uc81c\uc548",
    sampleAnswer: "\ucc38\uace0 \ub2f5\uc548",
    practiceMethods: "\uc5f0\uc2b5 \ubc29\ubc95",
    corrections: "\uc218\uc815",
  },
};

function asStringArray(value: unknown): string[] {
  return normalizeFeedbackTextItems(value);
}

function flattenFeedback(detail: ResultDetail) {
  const feedback = detail.feedback || {};
  const analysis = (feedback.analysis || {}) as Record<string, unknown>;
  const evaluation = (feedback.evaluation || {}) as Record<string, unknown>;
  return {
    summary: String(feedback.summary || evaluation.summary || ""),
    detailedComment: String(evaluation.detailedComment || ""),
    onTopic: evaluation.onTopic !== false,
    offTopicReason: String(evaluation.offTopicReason || ""),
    strengths: asStringArray(analysis.strengths),
    weaknesses: asStringArray(analysis.weaknesses),
    feedback: asStringArray(analysis.feedback || feedback.feedback),
    suggestions: asStringArray(analysis.suggestions || detail.improvements?.suggestions),
  };
}

function formatDuration(seconds?: number | null) {
  if (!seconds) return "Không rõ";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins} phút ${secs} giây`;
}

function getResultTypeLabel(type: ResultDetail["type"]) {
  if (type === "TEST") return "Kết quả bài test";
  if (type === "SPEAKING") return "Kết quả bài nói";
  return "Kết quả bài viết";
}

function formatCriterionLabel(key: string, language?: string | null) {
  const uiLanguage = getContentUiLanguage(language);
  return (
    CRITERION_LABELS_BY_LANGUAGE[uiLanguage][key] ||
    (uiLanguage === "vi" ? CRITERION_LABELS[key] : "") ||
    key.replace(/_/g, " ").replace(/([A-Z])/g, " $1").trim()
  );
}

export default async function ResultDetailPage({ params }: { params: Promise<{ resultId: string }> }) {
  const user = await requireRole("STUDENT", "TEACHER", "ADMIN");
  const { resultId } = await params;
  let detail: ResultDetail | null = null;
  let loadError: "forbidden" | "system" | null = null;

  try {
    detail = await getStudentResultDetail(user, resultId);
  } catch (error) {
    if (error instanceof Error && error.message === RESULT_FORBIDDEN_ERROR) {
      loadError = "forbidden";
    } else {
      console.error("Unable to load result detail", { resultId, error });
      loadError = "system";
    }
  }

  if (loadError === "forbidden") {
    return <ResultError title="Không thể truy cập" message="Bạn không có quyền xem kết quả này." />;
  }

  if (loadError === "system") {
    return <ResultError title="Chưa thể tải kết quả" message="Hệ thống đang gặp sự cố. Vui lòng thử lại sau." retryHref={`/student/results/${resultId}`} />;
  }

  if (!detail) {
    return <ResultError title="Không tìm thấy kết quả" message="Kết quả có thể đã bị xóa hoặc đường dẫn không còn hợp lệ." />;
  }

  return <ResultDetailView detail={detail} />;
}

function ResultError({ title, message, retryHref }: { title: string; message: string; retryHref?: string }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50">
      <div className="rounded-xl border border-red-200 bg-white p-8 text-center">
        <h1 className="text-lg font-bold text-slate-950">{title}</h1>
        <p className="mt-2 text-slate-600">{message}</p>
        <div className="mt-5 flex justify-center gap-3">
          {retryHref ? <Link href={retryHref} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Thử lại</Link> : null}
          <Link href="/student/results" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Quay lại lịch sử</Link>
        </div>
      </div>
    </main>
  );
}

function ResultDetailView({ detail }: { detail: ResultDetail }) {
  const parsed = flattenFeedback(detail);
  const labels = getResultDetailLabels(detail);
  const ieltsEvaluation = extractStoredIeltsEvaluation(detail.feedback);
  const storedLanguageEvaluation = !ieltsEvaluation && detail.type !== "TEST"
    ? detail.feedback.evaluation as LanguageEvaluationData | undefined
    : undefined;
  const storedLanguageAnalysis = (detail.feedback.analysis || {
    strengths: [],
    weaknesses: [],
    feedback: [],
    suggestions: [],
  }) as LanguageAnalysisData;
  const questionResults = detail.type === "TEST" && Array.isArray(detail.feedback?.questionResults)
    ? (detail.feedback.questionResults as TestQuestionResult[])
    : [];
  const percent = detail.maxScore > 0 ? Math.round((detail.score / detail.maxScore) * 100) : 0;
  const scoreOnly = detail.scoreOnly === true || detail.feedback?.scoreOnly === true;

  return (
    <main className="min-h-dvh bg-slate-50 py-8">
      <div className="mx-auto max-w-6xl space-y-6 px-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">{getResultTypeLabel(detail.type)}</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-950">{detail.title}</h1>
              <p className="mt-2 text-slate-600">
                {detail.course?.name || "Luyện tập độc lập"} - {new Date(detail.submittedAt).toLocaleString("vi-VN", { timeZone: "Asia/Bangkok" })} - {formatDuration(detail.durationSeconds)}
              </p>
            </div>
            <div className="text-left lg:text-right">
              <p className="text-4xl font-bold text-slate-950">
                {detail.score.toFixed(1)} / {detail.maxScore}
              </p>
              <p className="font-semibold text-blue-600">
                {percent}% - Mức tham chiếu: {detail.certificate.label}
              </p>
              <p className="mt-2 max-w-xl text-xs leading-5 text-amber-700 lg:ml-auto">{detail.certificate.note}</p>
            </div>
          </div>
        </section>

        {ieltsEvaluation ? (
          <IeltsEvaluationResult evaluation={ieltsEvaluation} scoreOnly={scoreOnly} />
        ) : storedLanguageEvaluation?.scores ? (
          <LanguageEvaluationResult
            skill={detail.type === "SPEAKING" ? "speaking" : "writing"}
            evaluation={storedLanguageEvaluation}
            analysis={storedLanguageAnalysis}
            mistakes={detail.mistakes}
            improvements={detail.improvements}
            sampleAnswer={detail.sampleAnswer}
            taskType={detail.taskType}
            scoreOnly={scoreOnly}
          />
        ) : (
          <section className="grid gap-4 md:grid-cols-4">
            {Object.entries(detail.criteria || {}).map(([key, value]) => (
              <div key={key} className="rounded-xl border border-slate-200 bg-white p-5">
                <p className="text-sm capitalize text-slate-500">{formatCriterionLabel(key, getResultLanguage(detail))}</p>
                <p className="mt-2 text-2xl font-bold text-slate-950">{String(value)}</p>
              </div>
            ))}
          </section>
        )}

        {!ieltsEvaluation && !storedLanguageEvaluation?.scores && !scoreOnly ? (
          <section className="grid gap-6 lg:grid-cols-2">
            <Panel title={labels.aiReview}>
              {parsed.summary ? <p className="text-sm leading-6 text-slate-700">{parsed.summary}</p> : null}
              {parsed.onTopic === false ? (
                <p className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">
                  Lạc đề: {parsed.offTopicReason || "Bài làm chưa đúng trọng tâm đề bài."}
                </p>
              ) : null}
              {parsed.detailedComment ? <p className="text-sm leading-6 text-slate-700">{parsed.detailedComment}</p> : null}
              <List title={labels.strengths} items={parsed.strengths} />
              <List title={labels.weaknesses} items={parsed.weaknesses} />
              <List title={labels.detailedFeedback} items={parsed.feedback} />
            </Panel>

            <Panel title={labels.mistakesAndSuggestions}>
              <ObjectList data={detail.mistakes} fallback={labels.noMistakes} language={getResultLanguage(detail)} />
              <List title={labels.improvement} items={parsed.suggestions} />
              <ObjectList
                data={detail.improvements}
                fallback={labels.noExtraSuggestions}
                language={getResultLanguage(detail)}
                excludedKeys={["suggestions", "sampleAnswer"]}
              />
            </Panel>
          </section>
        ) : null}

        {questionResults.some((item) => item.aiEvaluation) ? (
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-bold text-slate-950">
              {scoreOnly ? "Kết quả chấm theo từng câu" : "Nhận xét AI theo từng câu"}
            </h2>
            <div className="mt-4 space-y-4">
              {questionResults.reduce<ReactNode[]>((items, item) => {
                if (!item.aiEvaluation) return items;
                items.push(<QuestionEvaluation key={item.questionId || item.content || `${item.earnedScore}-${item.score}`} item={item} scoreOnly={scoreOnly} />);
                return items;
              }, [])}
            </div>
          </section>
        ) : null}

        {detail.submissionText || detail.audioUrl || detail.prompt ? (
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-bold text-slate-950">{labels.savedSubmission}</h2>
            {detail.prompt ? (
              <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                <span className="font-semibold">{labels.prompt}</span> {detail.prompt}
              </p>
            ) : null}
            {detail.audioUrl ? (
              <audio controls className="mt-4 w-full">
                <source src={detail.audioUrl} />
              </audio>
            ) : null}
            {detail.submissionText ? (
              <p className="mt-4 whitespace-pre-line rounded-lg bg-slate-50 p-4 text-sm leading-6 text-slate-700">{detail.submissionText}</p>
            ) : null}
          </section>
        ) : null}

        {detail.sampleAnswer && !ieltsEvaluation && !storedLanguageEvaluation?.scores ? (
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-bold text-slate-950">{labels.sampleAnswer}</h2>
            <p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-700">{detail.sampleAnswer}</p>
          </section>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Link href="/student/results" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
            Lịch sử kết quả
          </Link>
          {detail.type === "TEST" ? (
            <Link href={`/student/tests/${detail.testId || ""}`} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
              Làm lại bài test
            </Link>
          ) : null}
        </div>
      </div>
    </main>
  );
}

function QuestionEvaluation({ item, scoreOnly }: { item: TestQuestionResult; scoreOnly: boolean }) {
  const evaluation = item.aiEvaluation;
  if (!evaluation) return null;

  return (
    <article className="rounded-lg border border-slate-200 p-4">
      <p className="font-semibold text-slate-900">{item.content || "Câu hỏi"}</p>
      <p className="mt-2 text-sm font-semibold text-blue-700">
        {Number(item.earnedScore || 0)}/{Number(item.score || 0)} điểm - AI {Number(evaluation.overallScore || 0)}/10
        {!scoreOnly ? ` - Bám đề ${Math.round(evaluation.taskRelevance || 0)}/100` : ""}
      </p>
      {!scoreOnly && evaluation.onTopic === false ? (
        <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">
          Lạc đề: {evaluation.offTopicReason || "Câu trả lời chưa đúng trọng tâm đề bài."}
        </p>
      ) : null}
      {!scoreOnly ? (
        <p className="mt-3 text-sm leading-6 text-slate-700">
          {evaluation.detailedComment || evaluation.summary || "AI đã chấm câu trả lời."}
        </p>
      ) : null}
      {!scoreOnly && evaluation.weaknesses?.length ? (
        <p className="mt-2 text-sm text-slate-700">Cần cải thiện: {evaluation.weaknesses.join("; ")}</p>
      ) : null}
      {!scoreOnly && evaluation.suggestions?.length ? (
        <p className="mt-2 text-sm text-slate-700">Gợi ý: {evaluation.suggestions.join("; ")}</p>
      ) : null}
      {!scoreOnly && evaluation.sampleAnswer ? (
        <div className="mt-4 rounded-lg bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-900">Bài mẫu đúng đề</p>
          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">{evaluation.sampleAnswer}</p>
        </div>
      ) : null}
    </article>
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
        {items.map((item) => (
          <li key={`${title}-${item}`}>- {item}</li>
        ))}
      </ul>
    </div>
  );
}

function ObjectList({
  data,
  fallback,
  language,
  excludedKeys = [],
}: {
  data: Record<string, unknown> | null;
  fallback: string;
  language?: string | null;
  excludedKeys?: string[];
}) {
  const excluded = new Set(excludedKeys);
  const entries = Object.entries(data || {}).flatMap(([key, value]) => {
    if (excluded.has(key)) return [];
    const items = asStringArray(value);
    return items.length ? [{ key, items }] : [];
  });

  if (!entries.length) return <p className="text-sm text-slate-500">{fallback}</p>;

  return (
    <div className="space-y-3">
      {entries.map(({ key, items }) => (
        <List key={key} title={formatCriterionLabel(key, language)} items={items} />
      ))}
    </div>
  );
}
