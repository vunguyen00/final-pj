"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { SpeakingAnswerInput } from "@/app/components/SpeakingAnswerInput";
import { FormattedHint } from "@/app/components/FormattedHint";
import { getLearningUiLabels } from "@/lib/test-language-labels";
import { getSpeechRecognitionLocale } from "@/lib/test-rules";

type Language = { id: string; name: string; code: string };
type Question = {
  id: string;
  type: string;
  content: string;
  audioUrl: string | null;
  hint: string | null;
  score: number;
  answers: { id: string; content: string; order: number }[] | null;
};
type EntranceTest = {
  id: string;
  name: string;
  description: string | null;
  assessmentMode: "STANDARD" | "WRITING" | "SPEAKING";
  timeLimit: number | null;
  shuffleQuestions: boolean;
  questions: Question[];
};
type Application = {
  id: string;
  status: string;
  attemptNo: number;
  language: Language;
  entranceTest: EntranceTest | null;
  answerState?: Record<string, string> | null;
  startedAt: string | null;
  createdAt: string;
  submittedAt: string | null;
};
type SubmittedAiEvaluation = {
  language: string;
  overallScore: number;
  taskRelevance?: number;
  onTopic?: boolean;
  offTopicReason?: string;
  detailedComment?: string;
  sampleAnswer?: string;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
};
type SubmittedQuestionResult = {
  questionId: string;
  questionType: string;
  content: string;
  studentAnswer: string;
  earnedScore: number;
  score: number;
  aiEvaluation?: SubmittedAiEvaluation;
};

const applicationStatusLabels: Record<string, string> = {
  DRAFT: "Đang hoàn thiện",
  SUBMITTED: "Đã nộp",
  UNDER_REVIEW: "Đang được xét duyệt",
  APPROVED: "Đã được duyệt",
  REJECTED: "Bị từ chối",
  EXPIRED: "Đã hết hạn",
};

function formatCountdown(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

function getEntranceTestDisplayName(
  test: EntranceTest,
  ui: ReturnType<typeof getLearningUiLabels>,
) {
  if (/^Teacher Entrance (Writing|Speaking)/i.test(test.name)) {
    return `${ui.testKind.TEACHER_ENTRANCE} - ${ui.assessment[test.assessmentMode]}`;
  }

  return test.name;
}

function useTeacherRegistrationPage() {
  const [loadingData, setLoadingData] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [minimumExpiryDate, setMinimumExpiryDate] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [languageId, setLanguageId] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [expiryDates, setExpiryDates] = useState<string[]>([]);
  const [activeApplication, setActiveApplication] = useState<Application | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [submittedQuestionResults, setSubmittedQuestionResults] = useState<SubmittedQuestionResult[]>([]);
  const [submittedLanguageCode, setSubmittedLanguageCode] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [speakingBusyByQuestion, setSpeakingBusyByQuestion] = useState<
    Record<string, boolean>
  >({});
  const lastHiddenAt = useRef<number | null>(null);
  const speakingBusyRef = useRef<Record<string, boolean>>({});
  const submitTestRef = useRef<() => Promise<void>>(async () => {});
  const hasSpeakingBusy = useMemo(
    () => Object.values(speakingBusyByQuestion).some(Boolean),
    [speakingBusyByQuestion],
  );

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    if (timeLeft === null || !activeApplication) return;
    if (timeLeft <= 0) {
      if (!hasSpeakingBusy) {
        void submitTestRef.current();
      }
      return;
    }
    const timer = window.setTimeout(() => setTimeLeft((value) => (value === null ? null : value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [timeLeft, activeApplication, hasSpeakingBusy]);

  useEffect(() => {
    if (!activeApplication || activeApplication.status !== "DRAFT") return;
    const timer = window.setTimeout(() => {
      void fetch(`/api/teacher-applications/${activeApplication.id}/autosave`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
    }, 800);
    return () => window.clearTimeout(timer);
  }, [answers, activeApplication]);

  useEffect(() => {
    if (!activeApplication || activeApplication.status !== "DRAFT") return;

    const log = (eventType: string, detail?: string, durationSeconds?: number, severity = 1) => {
      void fetch(`/api/teacher-applications/${activeApplication.id}/anti-cheat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType,
          detail,
          durationSeconds,
          severity,
          clientTimestamp: new Date().toISOString(),
        }),
      });
    };

    const onVisibility = () => {
      if (document.hidden) {
        lastHiddenAt.current = Date.now();
        log("TAB_HIDDEN", "User left the tab", 0, 2);
        return;
      }
      if (lastHiddenAt.current) {
        const seconds = Math.round((Date.now() - lastHiddenAt.current) / 1000);
        log("TAB_RETURNED", "User returned to the tab", seconds, seconds > 30 ? 3 : 2);
        lastHiddenAt.current = null;
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      const key = event.key.toLowerCase();
      if (["a", "c", "v", "x"].includes(key)) {
        log(`KEY_${key.toUpperCase()}`, `Shortcut ${key.toUpperCase()}`, 0, 2);
      }
    };
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      log("PAGE_RELOAD_OR_CLOSE", "Reload or close during entrance test", 0, 3);
      event.preventDefault();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [activeApplication]);

  const questions = useMemo(() => {
    const list = activeApplication?.entranceTest?.questions ?? [];
    if (!activeApplication?.entranceTest?.shuffleQuestions) return list;
    return [...list].sort(() => Math.random() - 0.5);
  }, [activeApplication]);

  const latestApplications = applications.slice(0, 5);
  const selectedLanguageCode =
    activeApplication?.language.code ||
    submittedLanguageCode ||
    languages.find((language) => language.id === languageId)?.code ||
    null;
  const ui = getLearningUiLabels(selectedLanguageCode);
  const speechLocale = getSpeechRecognitionLocale(activeApplication?.language.code);
  const testLocked = submitting || timeLeft === 0;
  const submittedAiQuestionResults = useMemo(
    () => submittedQuestionResults.filter((item) => item.aiEvaluation),
    [submittedQuestionResults],
  );

  async function loadData() {
    setLoadError("");
    try {
      const response = await fetch("/api/teacher-applications", { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Không thể tải thông tin đăng ký giảng viên.");
      }

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setMinimumExpiryDate(tomorrow.toISOString().slice(0, 10));

      setEnabled(Boolean(data.setting?.enabled));
      setLanguages(data.languages || []);
      setApplications(data.applications || []);
      const draft = (data.applications || []).find((item: Application) => item.status === "DRAFT" && item.entranceTest);
      if (draft) {
        setActiveApplication(draft);
        setAnswers((draft.answerState as Record<string, string>) || {});
        if (draft.entranceTest?.timeLimit) {
          const elapsedSeconds = draft.startedAt
            ? Math.floor(
                (Date.now() - new Date(draft.startedAt).getTime()) / 1000,
              )
            : 0;
          setTimeLeft(
            Math.max(0, draft.entranceTest.timeLimit * 60 - elapsedSeconds),
          );
        } else {
          setTimeLeft(null);
        }
      } else {
        setActiveApplication(null);
        setTimeLeft(null);
      }
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Không thể tải thông tin đăng ký giảng viên.");
    } finally {
      setLoadingData(false);
    }
  }

  function onFilesSelected(fileList: FileList | null) {
    const nextFiles = Array.from(fileList || []).slice(0, 3);
    setFiles(nextFiles);
    setExpiryDates(nextFiles.map((_, index) => expiryDates[index] || ""));
  }

  async function submitCertificates(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    setSubmitting(true);
    setSubmittedQuestionResults([]);
    const formData = new FormData();
    formData.set("languageId", languageId);
    formData.set("expiryDates", JSON.stringify(expiryDates));
    files.forEach((file) => formData.append("certificates", file));

    const response = await fetch("/api/teacher-applications", {
      method: "POST",
      body: formData,
    });
    const data = await response.json().catch(() => ({}));
    setSubmitting(false);

    if (!response.ok) {
      setMessage(data?.error || "Không thể nộp hồ sơ.");
      return;
    }

    setActiveApplication(data.application);
    setTimeLeft(
      data.application.entranceTest?.timeLimit
        ? data.application.entranceTest.timeLimit * 60
        : null,
    );
    setAnswers({});
    setFiles([]);
    setExpiryDates([]);
    setMessage(data.application.entranceTest ? "Đã lưu chứng chỉ. Bắt đầu bài test." : "Đã nộp hồ sơ, chờ admin review.");
    await loadData();
  }

  async function submitTest() {
    if (!activeApplication || submitting) return;
    if (Object.values(speakingBusyRef.current).some(Boolean)) {
      setMessage(
        ui.teacherEntrance.stopRecordingMessage,
      );
      return;
    }
    setSubmitting(true);
    const response = await fetch(`/api/teacher-applications/${activeApplication.id}/submit-test`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers }),
    });
    const data = await response.json().catch(() => ({}));
    setSubmitting(false);
    if (!response.ok) {
      setMessage(data?.error || ui.teacherEntrance.submitFailed);
      return;
    }
    setSubmittedLanguageCode(activeApplication.language.code);
    setMessage(ui.teacherEntrance.submitSuccess);
    setSubmittedQuestionResults(data.questionResults || []);
    setActiveApplication(null);
    setTimeLeft(null);
    await loadData();
  }

  useEffect(() => {
    submitTestRef.current = submitTest;
  });

  function handleSpeakingBusyChange(questionId: string, busy: boolean) {
    if (speakingBusyRef.current[questionId] === busy) return;

    speakingBusyRef.current = {
      ...speakingBusyRef.current,
      [questionId]: busy,
    };
    setSpeakingBusyByQuestion(speakingBusyRef.current);
  }

  return {
    loadingData,
    loadError,
    minimumExpiryDate,
    enabled,
    languages,
    languageId,
    files,
    expiryDates,
    activeApplication,
    answers,
    timeLeft,
    message,
    submitting,
    questions,
    latestApplications,
    ui,
    speechLocale,
    testLocked,
    submittedAiQuestionResults,
    setLanguageId,
    setExpiryDates,
    setAnswers,
    onFilesSelected,
    submitCertificates,
    submitTest,
    handleSpeakingBusyChange,
    setLoadingData,
    loadData,
  };
}

export default function TeacherRegistrationPage() {
  const {
    loadingData,
    loadError,
    minimumExpiryDate,
    enabled,
    languages,
    languageId,
    files,
    expiryDates,
    activeApplication,
    answers,
    timeLeft,
    message,
    submitting,
    questions,
    latestApplications,
    ui,
    speechLocale,
    testLocked,
    submittedAiQuestionResults,
    setLanguageId,
    setExpiryDates,
    setAnswers,
    onFilesSelected,
    submitCertificates,
    submitTest,
    handleSpeakingBusyChange,
    setLoadingData,
    loadData,
  } = useTeacherRegistrationPage();

  if (loadingData) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="text-center" role="status" aria-live="polite">
          <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
          <p className="mt-4 text-sm font-semibold text-slate-600">Đang tải thông tin đăng ký giảng viên...</p>
        </div>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-lg rounded-xl border border-red-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-xl font-bold text-slate-950">Không thể tải trang đăng ký</h1>
          <p className="mt-2 text-sm text-red-700">{loadError}</p>
          <button
            type="button"
            onClick={() => {
              setLoadingData(true);
              void loadData();
            }}
            className="mt-5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Thử lại
          </button>
        </div>
      </main>
    );
  }

  if (!enabled) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-6">
          <h1 className="text-2xl font-bold text-slate-900">Đăng ký giảng viên</h1>
          <p className="mt-3 text-slate-600">Chức năng đăng ký giảng viên đang tạm tắt.</p>
          <Link href="/" className="mt-5 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
            Về trang chủ
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-6xl px-4">
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-950">Đăng ký giảng viên</h1>
              <p className="mt-2 text-slate-600">Chọn ngôn ngữ, upload chứng chỉ và hoàn thành bài test đầu vào.</p>
            </div>
            {timeLeft !== null ? (
              <div className={`rounded-lg px-4 py-2 text-lg font-bold ${timeLeft < 300 ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>
                {formatCountdown(timeLeft)}
              </div>
            ) : null}
          </div>
        </section>

        {message ? <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">{message}</div> : null}

        {submittedAiQuestionResults.length > 0 ? (
          <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-bold text-slate-950">{ui.teacherEntrance.aiFeedbackAfterScore}</h2>
            <div className="mt-4 space-y-4">
              {submittedAiQuestionResults.map((item) => {
                const evaluation = item.aiEvaluation!;
                return (
                  <article key={item.questionId} className="rounded-lg border border-slate-200 p-4">
                    <p className="font-semibold text-slate-900">{item.content}</p>
                    <p className="mt-2 text-sm font-semibold text-blue-700">
                      {item.earnedScore}/{item.score} {ui.test.points} - AI {evaluation.overallScore}/10 - {ui.teacherEntrance.relevance} {Math.round(evaluation.taskRelevance ?? 0)}/100
                    </p>
                    {evaluation.onTopic === false ? (
                      <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">
                        {ui.teacherEntrance.offTopic}: {evaluation.offTopicReason || ui.teacherEntrance.offTopicFallback}
                      </p>
                    ) : null}
                    <p className="mt-3 text-sm leading-6 text-slate-700">
                      {evaluation.detailedComment || evaluation.summary}
                    </p>
                    {evaluation.weaknesses.length ? (
                      <p className="mt-2 text-sm text-slate-700">{ui.teacherEntrance.needsImprovement}: {evaluation.weaknesses.join("; ")}</p>
                    ) : null}
                    {evaluation.suggestions.length ? (
                      <p className="mt-2 text-sm text-slate-700">{ui.teacherEntrance.suggestions}: {evaluation.suggestions.join("; ")}</p>
                    ) : null}
                    {evaluation.sampleAnswer ? (
                      <div className="mt-4 rounded-lg bg-slate-50 p-4">
                        <p className="text-sm font-semibold text-slate-900">{ui.teacherEntrance.sampleAnswer}</p>
                        <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">{evaluation.sampleAnswer}</p>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}

        {activeApplication?.entranceTest ? (
          <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-bold text-slate-950">
              {getEntranceTestDisplayName(activeApplication.entranceTest, ui)}
            </h2>
            <div className="mt-5 space-y-5">
              {questions.map((question, index) => (
                <article key={question.id} className="rounded-lg border border-slate-200 p-4">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <span className="font-semibold text-slate-900">{ui.teacherEntrance.question(index + 1)}</span>
                    <span>{question.score} {ui.test.points}</span>
                  </div>
                  {question.audioUrl ? <audio controls={!testLocked} className="mt-3 w-full max-w-md" src={question.audioUrl} /> : null}
                  <p className="mt-3 font-medium text-slate-900">{question.content}</p>
                  <FormattedHint hint={question.hint} />
                  <div className="mt-3 space-y-2">
                    {(question.type === "MULTIPLE_CHOICE" || question.type === "TRUE_FALSE") && question.answers
                      ? question.answers.map((answer) => (
                          <label key={answer.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50">
                            <input
                              type="radio"
                              name={question.id}
                              checked={answers[question.id] === answer.id}
                              disabled={testLocked}
                              onChange={() => setAnswers((prev) => ({ ...prev, [question.id]: answer.id }))}
                            />
                            <span>{answer.content}</span>
                          </label>
                        ))
                      : null}
                    {question.type === "FILL_IN_BLANK" ? (
                      <input
                        aria-label={ui.test.fillPlaceholder}
                        value={answers[question.id] || ""}
                        disabled={testLocked}
                        onChange={(event) => setAnswers((prev) => ({ ...prev, [question.id]: event.target.value }))}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2"
                      />
                    ) : null}
                    {question.type === "ESSAY" ? (
                      <textarea
                        aria-label={ui.test.essayPlaceholder}
                        rows={6}
                        value={answers[question.id] || ""}
                        disabled={testLocked}
                        onChange={(event) => setAnswers((prev) => ({ ...prev, [question.id]: event.target.value }))}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2"
                      />
                    ) : null}
                    {question.type === "SPEAKING" ? (
                      <SpeakingAnswerInput
                        value={answers[question.id] || ""}
                        onChange={(value) => setAnswers((prev) => ({ ...prev, [question.id]: value }))}
                        languageLocale={speechLocale}
                        languageCode={activeApplication.language.code}
                        disabled={testLocked}
                        forceStop={timeLeft === 0}
                        onBusyChange={(busy) =>
                          handleSpeakingBusyChange(question.id, busy)
                        }
                      />
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
            <button
              type="button"
              onClick={() => void submitTest()}
              disabled={testLocked}
              className="mt-6 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? ui.teacherEntrance.submitting : ui.teacherEntrance.submitTest}
            </button>
          </section>
        ) : (
          <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-bold text-slate-950">Hồ sơ mới</h2>
            <form onSubmit={submitCertificates} className="mt-5 grid gap-4">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Ngôn ngữ đăng ký giảng dạy</span>
                <select value={languageId} onChange={(event) => setLanguageId(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2">
                  <option value="">Chọn ngôn ngữ</option>
                  {languages.map((language) => (
                    <option key={language.id} value={language.id}>
                      {language.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Tải lên chứng chỉ JPG, PNG hoặc PDF</span>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  multiple
                  onChange={(event) => onFilesSelected(event.target.files)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
              {files.map((file, index) => (
                <div key={`${file.name}-${file.lastModified}-${file.size}`} className="grid gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-[1fr_180px]">
                  <div>
                    <p className="font-medium text-slate-900">{file.name}</p>
                    <p className="text-sm text-slate-500">{Math.round(file.size / 1024)} KB</p>
                  </div>
                  <label className="text-sm font-medium text-slate-700">
                    Ngày hết hạn
                    <input
                      aria-label={`Ngày hết hạn của ${file.name}`}
                      type="date"
                      min={minimumExpiryDate || undefined}
                      value={expiryDates[index] || ""}
                      onChange={(event) => setExpiryDates((prev) => prev.map((value, itemIndex) => (itemIndex === index ? event.target.value : value)))}
                      className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                  </label>
                </div>
              ))}
              <button type="submit" disabled={submitting} className="w-fit rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                {submitting ? ui.result.saving : ui.submit}
              </button>
            </form>
          </section>
        )}

        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-bold text-slate-950">{ui.teacherEntrance.history}</h2>
          <div className="mt-4 space-y-3">
            {latestApplications.length === 0 ? <p className="text-sm text-slate-500">{ui.teacherEntrance.noApplications}</p> : null}
            {latestApplications.map((application) => (
              <div key={application.id} className="rounded-lg border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-slate-900">
                    {ui.teacherEntrance.applicationAttempt(application.attemptNo)} - {application.language.name}
                  </p>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                    {applicationStatusLabels[application.status] || application.status}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-500">{new Date(application.createdAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
