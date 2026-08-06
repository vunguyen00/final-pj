"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import StudentTestResultClient, {
  type ResultData,
} from "./StudentTestResultClient";

type PreviewPayload = Partial<ResultData> & {
  attemptId?: unknown;
  previewMode?: unknown;
  courseCompleted?: unknown;
};

function readPreviewResult(attemptId: string): ResultData | null {
  try {
    const raw = sessionStorage.getItem(`test-result-${attemptId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PreviewPayload;
    if (
      parsed.previewMode !== true ||
      parsed.attemptId !== attemptId ||
      typeof parsed.score !== "number" ||
      typeof parsed.maxScore !== "number" ||
      typeof parsed.passingScore !== "number" ||
      typeof parsed.isPassed !== "boolean" ||
      typeof parsed.totalQuestions !== "number" ||
      !Array.isArray(parsed.questionResults)
    ) {
      return null;
    }

    return {
      attemptId,
      score: parsed.score,
      maxScore: parsed.maxScore,
      passingScore: parsed.passingScore,
      isPassed: parsed.isPassed,
      courseComplete: parsed.courseComplete === true || parsed.courseCompleted === true,
      nextAction: parsed.nextAction ?? null,
      courseId: parsed.courseId ?? null,
      courseName: parsed.courseName,
      language: parsed.language ?? null,
      totalQuestions: parsed.totalQuestions,
      correctAnswers:
        typeof parsed.correctAnswers === "number" ? parsed.correctAnswers : 0,
      questionResults: parsed.questionResults,
      scoreOnlyAiFeedback: parsed.scoreOnlyAiFeedback === true,
    };
  } catch {
    return null;
  }
}

export default function StudentTestPreviewResultClient({
  testId,
  attemptId,
}: {
  testId: string;
  attemptId: string;
}) {
  const [result, setResult] = useState<ResultData | null>();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setResult(readPreviewResult(attemptId));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [attemptId]);

  if (result === undefined) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-16">
        <p className="mx-auto max-w-xl text-center text-sm font-semibold text-slate-600">
          Đang tải kết quả xem thử...
        </p>
      </main>
    );
  }

  if (!result) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-16">
        <section className="mx-auto max-w-xl rounded-2xl border border-amber-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-xl font-bold text-slate-950">
            Kết quả xem thử không còn khả dụng
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Kết quả xem thử chỉ được giữ trong tab trình duyệt đã nộp bài và không được ghi vào lịch sử học viên.
          </p>
          <Link
            href={`/student/tests/${testId}`}
            className="mt-5 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Quay lại bài test
          </Link>
        </section>
      </main>
    );
  }

  return (
    <StudentTestResultClient
      result={result}
      testId={testId}
      canReview={false}
    />
  );
}
