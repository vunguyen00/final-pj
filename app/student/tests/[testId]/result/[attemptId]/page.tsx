"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type AiEvaluation = {
  language: string;
  overallScore: number;
  taskRelevance?: number;
  onTopic?: boolean;
  offTopicReason?: string;
  detailedComment?: string;
  sampleAnswer?: string;
  band?: { system: string; level: string; score: number; rationale: string };
  summary: string;
  strengths: string[];
  weaknesses: string[];
  feedback?: string[];
  suggestions: string[];
  corrections?: Array<{ original: string; improved: string; reason: string }>;
};

type QuestionResult = {
  questionId: string;
  questionType: string;
  content: string;
  studentAnswer: string;
  correctAnswer: string | null;
  isCorrect: boolean | null;
  score: number;
  earnedScore: number;
  explanation: string | null;
  aiEvaluation?: AiEvaluation;
};

type ResultData = {
  attemptId: string;
  score: number;
  maxScore: number;
  passingScore: number;
  isPassed: boolean;
  courseId?: string;
  courseName?: string;
  totalQuestions: number;
  correctAnswers: number;
  questionResults: QuestionResult[];
};

const questionTypes: Record<string, string> = {
  MULTIPLE_CHOICE: "Multiple choice",
  FILL_IN_BLANK: "Fill in blank",
  ESSAY: "Writing response",
  TRUE_FALSE: "True or false",
  SPEAKING: "Speaking response",
};

const ratingOptions = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

export default function StudentTestResultPage() {
  const params = useParams();
  const testId = params.testId as string;
  const attemptId = params.attemptId as string;
  const [result, setResult] = useState<ResultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchResult() {
      try {
        const storedResult = sessionStorage.getItem(`test-result-${attemptId}`);
        if (storedResult) {
          const parsed = JSON.parse(storedResult) as ResultData;
          if (parsed.courseId) {
            setResult(parsed);
          } else {
            const res = await fetch(`/api/student/tests/${testId}/attempts/${attemptId}`, { cache: "no-store" });
            setResult(res.ok ? { ...parsed, ...(await res.json()) } : parsed);
          }
        } else {
          const res = await fetch(`/api/student/tests/${testId}/attempts/${attemptId}`, { cache: "no-store" });
          if (!res.ok) {
            setError("Result not found");
            return;
          }
          setResult(await res.json());
        }
      } catch {
        setError("Failed to load result");
      } finally {
        setLoading(false);
      }
    }
    void fetchResult();
  }, [testId, attemptId]);

  const skillBreakdown = useMemo(() => {
    if (!result) return [];
    const groups = new Map<string, { earned: number; max: number }>();
    for (const question of result.questionResults) {
      const key =
        question.questionType === "ESSAY"
          ? "Writing"
          : question.questionType === "SPEAKING"
            ? "Speaking"
            : question.questionType === "FILL_IN_BLANK"
              ? "Vocabulary"
              : "Comprehension";
      const current = groups.get(key) ?? { earned: 0, max: 0 };
      current.earned += question.earnedScore;
      current.max += question.score;
      groups.set(key, current);
    }
    return Array.from(groups.entries()).map(([name, value]) => ({
      name,
      score: value.max > 0 ? Math.round((value.earned / value.max) * 100) : 0,
    }));
  }, [result]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
      </main>
    );
  }

  if (error || !result) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="rounded-xl border border-red-200 bg-white p-8 text-center">
          <p className="text-red-600">{error || "Result not found"}</p>
          <Link href="/student/tests" className="mt-4 inline-block text-blue-600 hover:underline">Back to tests</Link>
        </div>
      </main>
    );
  }

  const percent = result.maxScore > 0 ? Math.round((result.score / result.maxScore) * 100) : 0;
  const estimatedLevel = percent >= 85 ? "Advanced" : percent >= 70 ? "Upper Intermediate" : percent >= 55 ? "Intermediate" : percent >= 40 ? "Elementary" : "Beginner";
  const weaknesses = skillBreakdown.filter((skill) => skill.score < 70).map((skill) => skill.name);

  return (
    <main className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-6xl space-y-6 px-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Assessment result</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-950">Estimated level: {estimatedLevel}</h1>
              <p className="mt-2 text-slate-600">
                Score {result.score.toFixed(1)} / {result.maxScore} - {result.correctAnswers}/{result.totalQuestions} correct - GENERAL {estimatedLevel}
              </p>
            </div>
            <div className="text-left lg:text-right">
              <p className="text-5xl font-bold text-slate-950">{percent}%</p>
              <p className={result.isPassed ? "font-semibold text-emerald-600" : "font-semibold text-amber-600"}>
                {result.isPassed ? "Ready for next path" : "Recommended review"}
              </p>
            </div>
          </div>
          <div className="mt-5 h-3 rounded-full bg-slate-100">
            <div className="h-3 rounded-full bg-blue-600" style={{ width: `${percent}%` }} />
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="font-bold text-slate-950">Skill breakdown</h2>
            <div className="mt-4 space-y-4">
              {skillBreakdown.map((skill) => (
                <div key={skill.name}>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-slate-700">{skill.name}</span>
                    <span className="text-slate-500">{skill.score}%</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-blue-600" style={{ width: `${skill.score}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="font-bold text-slate-950">Weaknesses</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {(weaknesses.length ? weaknesses : ["No major weakness detected"]).map((item) => (
                <span key={item} className="rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">{item}</span>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="font-bold text-slate-950">Recommended learning path</h2>
            <ol className="mt-4 space-y-3 text-sm text-slate-600">
              <li>1. Review weak skills with targeted practice.</li>
              <li>2. Continue a {estimatedLevel} course in your selected language.</li>
              <li>3. Take a certification estimate after the next module.</li>
            </ol>
            <Link href="/courses" className="mt-5 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Recommended courses</Link>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-xl font-bold text-slate-950">Question review</h2>
          <div className="mt-4 space-y-4">
            {result.questionResults.map((question, index) => (
              <article key={question.questionId} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">{index + 1}</span>
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">{questionTypes[question.questionType] || question.questionType}</span>
                  <span className="text-sm font-semibold text-slate-500">{question.earnedScore}/{question.score} points</span>
                  {question.isCorrect !== null ? (
                    <span className={question.isCorrect ? "text-sm font-semibold text-emerald-600" : "text-sm font-semibold text-red-600"}>
                      {question.isCorrect ? "Correct" : "Incorrect"}
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 text-slate-900">{question.content}</p>
                <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm">
                  <p><span className="font-semibold">Your answer:</span> {question.studentAnswer || "No answer"}</p>
                  {question.correctAnswer ? <p className="mt-1"><span className="font-semibold">Expected:</span> {question.correctAnswer}</p> : null}
                </div>
                {question.aiEvaluation ? (
                  <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                    <p className="font-semibold">
                      AI feedback - {question.aiEvaluation.language} - {question.aiEvaluation.overallScore}/10
                      {question.aiEvaluation.band ? ` - ${question.aiEvaluation.band.system} ${question.aiEvaluation.band.level}` : ""}
                    </p>
                    <p className="mt-2">{question.aiEvaluation.summary}</p>
                    <p className="mt-2 font-semibold">
                      Do bam de: {Math.round(question.aiEvaluation.taskRelevance ?? 0)}/100
                    </p>
                    {question.aiEvaluation.onTopic === false ? (
                      <p className="mt-2 rounded-lg bg-red-100 p-3 font-semibold text-red-800">
                        Lac de: {question.aiEvaluation.offTopicReason || "Cau tra loi chua dung trong tam de bai."}
                      </p>
                    ) : null}
                    {question.aiEvaluation.detailedComment ? (
                      <p className="mt-2 leading-6">{question.aiEvaluation.detailedComment}</p>
                    ) : null}
                    {question.aiEvaluation.weaknesses.length ? <p className="mt-2">Focus: {question.aiEvaluation.weaknesses.join(", ")}</p> : null}
                    {question.aiEvaluation.suggestions.length ? <p className="mt-2">Next: {question.aiEvaluation.suggestions.slice(0, 3).join("; ")}</p> : null}
                    {question.aiEvaluation.sampleAnswer ? (
                      <div className="mt-3 rounded-lg border border-blue-200 bg-white p-3 text-slate-800">
                        <p className="font-semibold">Bai mau dung de</p>
                        <p className="mt-2 whitespace-pre-line leading-6">{question.aiEvaluation.sampleAnswer}</p>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </section>

        <div className="flex flex-wrap gap-3">
          <Link href="/student/tests" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">Back to tests</Link>
          {result.isPassed && result.courseId ? (
            <Link href={`/courses/${result.courseId}`} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
              Review course
            </Link>
          ) : null}
          {!result.isPassed ? <Link href={`/student/tests/${testId}`} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Retake diagnostic</Link> : null}
        </div>
      </div>
      {result.isPassed && result.courseId ? (
        <CourseReviewPopup courseId={result.courseId} courseName={result.courseName || "khoa hoc"} />
      ) : null}
    </main>
  );
}

function CourseReviewPopup({ courseId, courseName }: { courseId: string; courseName: string }) {
  const storageKey = `course-review-popup-dismissed-${courseId}`;
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function checkReviewState() {
      if (sessionStorage.getItem(storageKey) === "1") return;

      const response = await fetch(`/api/courses/${courseId}/reviews`, { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.canReview && !data.myReview) {
        setOpen(true);
      }
    }

    void checkReviewState();
  }, [courseId, storageKey]);

  function closePopup() {
    sessionStorage.setItem(storageKey, "1");
    setOpen(false);
  }

  async function submitReview() {
    setSubmitting(true);
    setMessage("");

    try {
      const response = await fetch(`/api/courses/${courseId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setMessage(data.error || "Khong luu duoc danh gia.");
        return;
      }

      closePopup();
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Hoan thanh khoa hoc</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-950">Danh gia {courseName}</h2>
            <p className="mt-2 text-sm text-slate-600">
              Chon diem tu 1 den 5 sao. Binh luan la tuy chon va ban co the sua lai sau.
            </p>
          </div>
          <button
            type="button"
            onClick={closePopup}
            className="rounded-lg border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Bo qua
          </button>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {ratingOptions.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setRating(value)}
              className={`rounded-lg border px-3 py-2 text-sm font-bold ${
                value === rating
                  ? "border-amber-300 bg-amber-50 text-amber-600"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {value.toFixed(1)}
            </button>
          ))}
        </div>
        <p className="mt-2 text-sm font-semibold text-amber-600">{rating.toFixed(1)} / 5 sao</p>

        <textarea
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          rows={4}
          placeholder="Binh luan tuy chon..."
          className="mt-4 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
        {message ? <p className="mt-2 text-sm text-red-600">{message}</p> : null}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={closePopup}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            De sau
          </button>
          <button
            type="button"
            onClick={() => void submitReview()}
            disabled={submitting}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-slate-300"
          >
            {submitting ? "Dang luu..." : "Gui danh gia"}
          </button>
        </div>
      </div>
    </div>
  );
}
