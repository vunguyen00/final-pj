import type { ReactNode } from "react";
import Link from "next/link";
import { getLevelLabel } from "@/app/components/learningMarketplace";
import { IeltsEvaluationResult } from "@/app/components/IeltsEvaluationResult";
import { requireRole } from "@/lib/auth";
import { extractStoredIeltsEvaluation } from "@/lib/ielts-rubric";
import { getStudentResultDetail, type ResultDetail } from "@/lib/student-results";

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

function formatCriterionLabel(key: string) {
  return CRITERION_LABELS[key] || key.replace(/_/g, " ").replace(/([A-Z])/g, " $1").trim();
}

export default async function ResultDetailPage({ params }: { params: Promise<{ resultId: string }> }) {
  const user = await requireRole("STUDENT", "TEACHER", "ADMIN");
  const { resultId } = await params;

  try {
    const detail = await getStudentResultDetail(user, resultId);
    if (!detail) {
      return <ResultError message="Không tìm thấy kết quả." />;
    }

    return <ResultDetailView detail={detail} />;
  } catch {
    return <ResultError message="Bạn không có quyền xem kết quả này." />;
  }
}

function ResultError({ message }: { message: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="rounded-xl border border-red-200 bg-white p-8 text-center">
        <p className="text-red-600">{message}</p>
        <Link href="/student/results" className="mt-4 inline-block text-blue-600">
          Quay lại lịch sử
        </Link>
      </div>
    </main>
  );
}

function ResultDetailView({ detail }: { detail: ResultDetail }) {
  const parsed = flattenFeedback(detail);
  const ieltsEvaluation = extractStoredIeltsEvaluation(detail.feedback);
  const questionResults = detail.type === "TEST" && Array.isArray(detail.feedback?.questionResults)
    ? (detail.feedback.questionResults as TestQuestionResult[])
    : [];
  const percent = detail.maxScore > 0 ? Math.round((detail.score / detail.maxScore) * 100) : 0;
  const scoreOnly = detail.scoreOnly === true || detail.feedback?.scoreOnly === true;

  return (
    <main className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-6xl space-y-6 px-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">{getResultTypeLabel(detail.type)}</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-950">{detail.title}</h1>
              <p className="mt-2 text-slate-600">
                {detail.course?.name || "Luyện tập độc lập"} - {new Date(detail.submittedAt).toLocaleString("vi-VN")} - {formatDuration(detail.durationSeconds)}
              </p>
            </div>
            <div className="text-left lg:text-right">
              <p className="text-5xl font-bold text-slate-950">{detail.score.toFixed(1)}</p>
              <p className="font-semibold text-blue-600">
                {percent}% - {detail.band.system === "GENERAL" ? "Tổng quát" : detail.band.system} {getLevelLabel(detail.band.level)}
              </p>
            </div>
          </div>
        </section>

        {ieltsEvaluation ? (
          <IeltsEvaluationResult evaluation={ieltsEvaluation} scoreOnly={scoreOnly} />
        ) : (
          <section className="grid gap-4 md:grid-cols-4">
            {Object.entries(detail.criteria || {}).map(([key, value]) => (
              <div key={key} className="rounded-xl border border-slate-200 bg-white p-5">
                <p className="text-sm capitalize text-slate-500">{formatCriterionLabel(key)}</p>
                <p className="mt-2 text-2xl font-bold text-slate-950">{String(value)}</p>
              </div>
            ))}
          </section>
        )}

        {!ieltsEvaluation && !scoreOnly ? (
          <section className="grid gap-6 lg:grid-cols-2">
            <Panel title="Nhận xét của AI">
              {parsed.summary ? <p className="text-sm leading-6 text-slate-700">{parsed.summary}</p> : null}
              {parsed.onTopic === false ? (
                <p className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">
                  Lạc đề: {parsed.offTopicReason || "Bài làm chưa đúng trọng tâm đề bài."}
                </p>
              ) : null}
              {parsed.detailedComment ? <p className="text-sm leading-6 text-slate-700">{parsed.detailedComment}</p> : null}
              <List title="Điểm mạnh" items={parsed.strengths} />
              <List title="Điểm cần cải thiện" items={parsed.weaknesses} />
              <List title="Phản hồi chi tiết" items={parsed.feedback} />
            </Panel>

            <Panel title="Lỗi sai và gợi ý">
              <ObjectList data={detail.mistakes} fallback="Chưa có lỗi cụ thể." />
              <List title="Cách cải thiện" items={parsed.suggestions} />
              <ObjectList data={detail.improvements} fallback="Chưa có gợi ý bổ sung." />
            </Panel>
          </section>
        ) : null}

        {questionResults.some((item) => item.aiEvaluation) ? (
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-bold text-slate-950">
              {scoreOnly ? "Kết quả chấm theo từng câu" : "Nhận xét AI theo từng câu"}
            </h2>
            <div className="mt-4 space-y-4">
              {questionResults.filter((item) => item.aiEvaluation).map((item) => (
                <QuestionEvaluation key={item.questionId || item.content || `${item.earnedScore}-${item.score}`} item={item} scoreOnly={scoreOnly} />
              ))}
            </div>
          </section>
        ) : null}

        {detail.submissionText || detail.audioUrl || detail.prompt ? (
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-bold text-slate-950">Bài làm đã lưu</h2>
            {detail.prompt ? (
              <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                <span className="font-semibold">Đề bài:</span> {detail.prompt}
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

        {detail.sampleAnswer && !ieltsEvaluation ? (
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-bold text-slate-950">Bài mẫu tham khảo</h2>
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

function ObjectList({ data, fallback }: { data: Record<string, unknown> | null; fallback: string }) {
  if (!data || Object.keys(data).length === 0) return <p className="text-sm text-slate-500">{fallback}</p>;

  return (
    <div className="space-y-3">
      {Object.entries(data).map(([key, value]) => {
        const items = asStringArray(value);
        if (!items.length) return null;
        return <List key={key} title={formatCriterionLabel(key)} items={items} />;
      })}
    </div>
  );
}
