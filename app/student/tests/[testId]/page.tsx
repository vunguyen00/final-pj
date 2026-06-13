"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FormattedHint } from "@/app/components/FormattedHint";
import { SpeakingAnswerInput } from "@/app/components/SpeakingAnswerInput";
import { getSpeechRecognitionLocale } from "@/lib/test-rules";

type Question = {
  id: string;
  type: string;
  content: string;
  audioUrl: string | null;
  hint: string | null;
  order: number;
  score: number;
  answers: { id: string; content: string; order: number }[] | null;
};

type TestInfo = {
  id: string;
  name: string;
  description: string | null;
  courseName: string;
  assessmentMode: "STANDARD" | "WRITING" | "SPEAKING";
  language: { id: string; name: string; code: string } | null;
  maxScore: number;
  passingScore: number;
  timeLimit: number | null;
  shuffleQuestions: boolean;
};

type AttemptHistoryItem = {
  id: string;
  attemptNo: number;
  score: number;
  maxScore: number;
  isPassed: boolean;
  submittedAt: string;
};

const QUESTION_TYPES = [
  { value: "MULTIPLE_CHOICE", label: "Trắc nghiệm" },
  { value: "FILL_IN_BLANK", label: "Điền từ" },
  { value: "ESSAY", label: "Bài viết AI" },
  { value: "TRUE_FALSE", label: "Đúng/Sai" },
  { value: "SPEAKING", label: "Bài nói AI" },
];

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function assessmentLabel(mode: TestInfo["assessmentMode"]) {
  if (mode === "WRITING") return "Chấm bài viết bằng AI";
  if (mode === "SPEAKING") return "Chấm bài nói bằng AI";
  return "Chấm đáp án";
}

export default function StudentTakeTestPage() {
  const router = useRouter();
  const params = useParams();
  const testId = params.testId as string;

  const [test, setTest] = useState<TestInfo | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [attemptHistory, setAttemptHistory] = useState<AttemptHistoryItem[]>([]);

  const answersRef = useRef<Record<string, string>>({});
  const submittingRef = useRef(false);
  const autoSubmitTriggeredRef = useRef(false);
  const deadlineRef = useRef<number | null>(null);

  const deadlineStorageKey = `test-deadline-${testId}`;
  const isExpired = timeLeft === 0;
  const isInteractionLocked = submitting || isExpired;

  const answeredCount = useMemo(
    () =>
      questions.filter((question) =>
        String(answers[question.id] || "").trim(),
      ).length,
    [answers, questions],
  );

  const handleSubmit = useCallback(
    async ({ skipConfirmation = false }: { skipConfirmation?: boolean } = {}) => {
      if (submittingRef.current) return;

      const currentAnswers = answersRef.current;
      const unanswered = questions.filter(
        (question) => !String(currentAnswers[question.id] || "").trim(),
      );
      if (
        !skipConfirmation &&
        unanswered.length > 0 &&
        !window.confirm(
          `Còn ${unanswered.length} câu chưa trả lời. Bạn có chắc muốn nộp bài?`,
        )
      ) {
        return;
      }

      submittingRef.current = true;
      setSubmitting(true);

      try {
        const response = await fetch(`/api/student/tests/${testId}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers: currentAnswers }),
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          window.alert(data.error || "Không thể nộp bài. Vui lòng thử lại.");
          submittingRef.current = false;
          setSubmitting(false);
          return;
        }

        sessionStorage.removeItem(deadlineStorageKey);
        sessionStorage.setItem(
          `test-result-${data.attemptId}`,
          JSON.stringify(data),
        );
        router.push(`/student/tests/${testId}/result/${data.attemptId}`);
      } catch (submitError) {
        console.error("Error submitting test:", submitError);
        window.alert("Không thể nộp bài. Vui lòng kiểm tra kết nối và thử lại.");
        submittingRef.current = false;
        setSubmitting(false);
      }
    },
    [deadlineStorageKey, questions, router, testId],
  );

  useEffect(() => {
    let active = true;

    async function loadTest() {
      try {
        const response = await fetch(`/api/student/tests/${testId}`, {
          cache: "no-store",
        });
        const data = await response.json().catch(() => ({}));
        if (!active) return;

        if (!response.ok) {
          setError(data.error || "Không thể tải bài test.");
          return;
        }

        setTest(data.test);
        setQuestions(data.questions);
        setAttemptHistory(data.attempts || []);

        if (data.test.timeLimit) {
          const storedDeadline = Number(
            sessionStorage.getItem(deadlineStorageKey),
          );
          const deadline =
            Number.isFinite(storedDeadline) && storedDeadline > 0
              ? storedDeadline
              : Date.now() + data.test.timeLimit * 60 * 1000;

          sessionStorage.setItem(deadlineStorageKey, String(deadline));
          deadlineRef.current = deadline;
          setTimeLeft(
            Math.max(0, Math.ceil((deadline - Date.now()) / 1000)),
          );
        }
      } catch (fetchError) {
        if (!active) return;
        console.error("Error fetching test:", fetchError);
        setError("Không thể tải bài test.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadTest();

    return () => {
      active = false;
    };
  }, [deadlineStorageKey, testId]);

  useEffect(() => {
    if (timeLeft === null || submitting) return;

    if (timeLeft === 0) {
      if (!autoSubmitTriggeredRef.current) {
        autoSubmitTriggeredRef.current = true;
        void handleSubmit({ skipConfirmation: true });
      }
      return;
    }

    const timer = window.setInterval(() => {
      const deadline = deadlineRef.current;
      if (!deadline) return;
      setTimeLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [handleSubmit, submitting, timeLeft]);

  function handleAnswerChange(questionId: string, answer: string) {
    if (isInteractionLocked) return;

    setAnswers((previous) => {
      const next = { ...previous, [questionId]: answer };
      answersRef.current = next;
      return next;
    });
  }

  const speechLocale = getSpeechRecognitionLocale(test?.language?.code);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
          <p className="mt-4 text-sm font-medium text-slate-500">
            Đang chuẩn bị bài test...
          </p>
        </div>
      </main>
    );
  }

  if (error || !test) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm">
          <p className="font-semibold text-red-700">
            {error || "Không tìm thấy bài test."}
          </p>
          <Link
            href="/student/tests"
            className="mt-4 inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Quay lại danh sách bài test
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 pb-12">
      <header className="sticky top-16 z-30 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                {test.language?.name || "Ngôn ngữ chung"}
              </span>
              <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-bold text-violet-700">
                {assessmentLabel(test.assessmentMode)}
              </span>
            </div>
            <h1 className="mt-2 truncate text-xl font-bold text-slate-950">
              {test.name}
            </h1>
            <p className="mt-1 text-sm text-slate-500">{test.courseName}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-xl bg-slate-100 px-4 py-2 text-center">
              <p className="text-xs font-medium text-slate-500">Đã trả lời</p>
              <p className="font-bold text-slate-900">
                {answeredCount}/{questions.length}
              </p>
            </div>
            {timeLeft !== null ? (
              <div
                className={`min-w-28 rounded-xl px-4 py-2 text-center ${
                  timeLeft <= 300
                    ? "bg-red-50 text-red-700"
                    : "bg-emerald-50 text-emerald-700"
                }`}
              >
                <p className="text-xs font-semibold">Thời gian còn lại</p>
                <p className="font-mono text-xl font-black">
                  {formatTime(timeLeft)}
                </p>
              </div>
            ) : (
              <div className="rounded-xl bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
                Không giới hạn thời gian
              </div>
            )}
            <Link
              href="/student/tests"
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Thoát
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {test.description ? (
          <section className="mb-5 rounded-2xl border border-blue-100 bg-blue-50 p-5 text-sm leading-6 text-blue-950">
            <p className="font-bold">Hướng dẫn làm bài</p>
            <p className="mt-1 whitespace-pre-wrap">{test.description}</p>
          </section>
        ) : null}

        {isExpired ? (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            Đã hết thời gian. Toàn bộ câu trả lời đã được khóa và hệ thống đang
            tự động nộp bài.
          </div>
        ) : null}

        <div className="space-y-5">
          {questions.map((question, index) => (
            <article
              key={question.id}
              className={`rounded-2xl border bg-white p-5 shadow-sm sm:p-6 ${
                isInteractionLocked
                  ? "border-slate-200 opacity-90"
                  : "border-slate-200"
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                  {index + 1}
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                  {QUESTION_TYPES.find((item) => item.value === question.type)
                    ?.label || question.type}
                </span>
                <span className="text-sm font-semibold text-slate-500">
                  {question.score} điểm
                </span>
              </div>

              <p className="mt-4 whitespace-pre-wrap text-lg font-semibold leading-8 text-slate-950">
                {question.content}
              </p>

              {question.audioUrl ? (
                <div className="mt-4 rounded-xl bg-slate-50 p-3">
                  <audio
                    controls={!isInteractionLocked}
                    className="w-full max-w-xl"
                  >
                    <source src={question.audioUrl} type="audio/mpeg" />
                    Trình duyệt của bạn không hỗ trợ phát âm thanh.
                  </audio>
                </div>
              ) : null}

              <FormattedHint hint={question.hint} />

              <div className="mt-5">
                {(question.type === "MULTIPLE_CHOICE" ||
                  question.type === "TRUE_FALSE") &&
                question.answers ? (
                  <fieldset
                    disabled={isInteractionLocked}
                    className="space-y-2.5"
                  >
                    {question.answers.map((answer) => {
                      const selected = answers[question.id] === answer.id;
                      return (
                        <label
                          key={answer.id}
                          className={`flex items-center gap-3 rounded-xl border p-4 transition ${
                            isInteractionLocked
                              ? "cursor-not-allowed"
                              : "cursor-pointer"
                          } ${
                            selected
                              ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100"
                              : "border-slate-200 hover:border-blue-300 hover:bg-slate-50"
                          }`}
                        >
                          <input
                            type="radio"
                            name={`question-${question.id}`}
                            value={answer.id}
                            checked={selected}
                            onChange={() =>
                              handleAnswerChange(question.id, answer.id)
                            }
                            className="h-4 w-4 accent-blue-600"
                          />
                          <span className="text-slate-800">{answer.content}</span>
                        </label>
                      );
                    })}
                  </fieldset>
                ) : null}

                {question.type === "FILL_IN_BLANK" ? (
                  <input
                    type="text"
                    value={answers[question.id] || ""}
                    onChange={(event) =>
                      handleAnswerChange(question.id, event.target.value)
                    }
                    disabled={isInteractionLocked}
                    placeholder="Nhập đáp án..."
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                  />
                ) : null}

                {question.type === "ESSAY" ? (
                  <textarea
                    value={answers[question.id] || ""}
                    onChange={(event) =>
                      handleAnswerChange(question.id, event.target.value)
                    }
                    disabled={isInteractionLocked}
                    placeholder="Viết câu trả lời của bạn..."
                    rows={7}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 leading-7 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                  />
                ) : null}

                {question.type === "SPEAKING" ? (
                  <div className="space-y-3">
                    <SpeakingAnswerInput
                      value={answers[question.id] || ""}
                      onChange={(value) =>
                        handleAnswerChange(question.id, value)
                      }
                      languageLocale={speechLocale}
                      disabled={isInteractionLocked}
                    />
                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-slate-700">
                          Nội dung nhận diện
                        </p>
                      </div>
                      <div
                        role="status"
                        aria-live="polite"
                        aria-label="Nội dung nhận diện giọng nói"
                        className="mt-2 min-h-32 max-h-52 overflow-y-auto whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-normal leading-7 text-slate-900"
                      >
                        {answers[question.id] || (
                          <span className="text-slate-400">
                            Nội dung sẽ xuất hiện tại đây sau khi bạn nói...
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </article>
          ))}
        </div>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">Lịch sử làm bài</h2>
          {attemptHistory.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">
              Bạn chưa có lần làm bài nào.
            </p>
          ) : (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {attemptHistory.map((attempt) => (
                <Link
                  key={attempt.id}
                  href={`/student/tests/${testId}/result/${attempt.id}`}
                  className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 hover:bg-slate-50"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Lần làm #{attempt.attemptNo}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(attempt.submittedAt).toLocaleString("vi-VN")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-950">
                      {attempt.score.toFixed(1)} / {attempt.maxScore}
                    </p>
                    <p
                      className={`text-xs font-semibold ${
                        attempt.isPassed
                          ? "text-emerald-700"
                          : "text-amber-700"
                      }`}
                    >
                      {attempt.isPassed ? "Đạt" : "Chưa đạt"}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={isInteractionLocked}
            className="min-w-44 rounded-xl bg-blue-600 px-8 py-3 text-base font-bold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting
              ? "Đang nộp bài..."
              : isExpired
                ? "Đã hết thời gian"
                : "Nộp bài"}
          </button>
        </div>
      </div>
    </main>
  );
}
