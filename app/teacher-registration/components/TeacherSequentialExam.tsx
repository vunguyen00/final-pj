"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SpeakingActivity } from "@/app/components/SpeakingAnswerInput";
import { FormattedHint } from "@/app/components/FormattedHint";
import { enqueueSpeakingTranscription } from "@/lib/client-speaking-transcription";
import { readJsonResponse } from "@/lib/http-response";
import { getLearningUiLabels } from "@/lib/test-language-labels";
import TeacherSpeakingRecorder from "./TeacherSpeakingRecorder";

type SequentialQuestion = {
  questionInstanceId: string;
  sequence: number;
  displaySequence: string;
  type: string;
  prompt: string;
  audioUrl: string | null;
  hint: string | null;
  score: number;
  answers: Array<{ id: string; content: string; order: number }> | null;
  revealedAt: string;
  answerStartsAt: string | null;
  deadlineAt: string | null;
  transitionToken: string;
  answer: string;
  revision: number;
  speakingAudioUploaded: boolean;
  speakingMediaStatus: string;
};

type SequentialSummary = {
  totalQuestions: number;
  completedQuestions: number;
  blankQuestions: number;
  pendingTechnicalIssues: number;
  pendingMediaJobs: number;
  failedMediaJobs: number;
};

type SpeakingMediaJob = {
  questionInstanceId: string;
  audioUrl: string;
  languageCode: string;
  processingToken: string;
};

type SessionResponse =
  | {
      phase: "QUESTION";
      question: SequentialQuestion;
      totalQuestions: number;
    }
  | {
      phase: "SUMMARY";
      summary: SequentialSummary;
    };

type Confirmation = {
  skip: boolean;
  title: string;
  body: string;
  confirmLabel: string;
} | null;

function secondsUntil(value: string | null, now: number) {
  if (!value) return null;
  return Math.max(0, Math.ceil((new Date(value).getTime() - now) / 1000));
}

export default function TeacherSequentialExam({
  applicationId,
  languageCode,
  sessionId,
  enabled,
  locked,
  globalTimeLeft,
  submitting,
  speakingActivity,
  onSpeakingActivityChange,
  onSubmitTest,
}: {
  applicationId: string;
  languageCode: string;
  sessionId: string;
  enabled: boolean;
  locked: boolean;
  globalTimeLeft: number | null;
  submitting: boolean;
  speakingActivity: SpeakingActivity;
  onSpeakingActivityChange: (activity: SpeakingActivity) => void;
  onSubmitTest: () => Promise<void>;
}) {
  const ui = getLearningUiLabels(languageCode);
  const [phase, setPhase] = useState<"LOADING" | "QUESTION" | "SUMMARY" | "ERROR">("LOADING");
  const [question, setQuestion] = useState<SequentialQuestion | null>(null);
  const [summary, setSummary] = useState<SequentialSummary | null>(null);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [answer, setAnswer] = useState("");
  const [revision, setRevision] = useState(0);
  const [saveState, setSaveState] = useState<"IDLE" | "SAVING" | "SAVED" | "ERROR">("IDLE");
  const [message, setMessage] = useState("");
  const [confirmation, setConfirmation] = useState<Confirmation>(null);
  const [finalizing, setFinalizing] = useState(false);
  const [clock, setClock] = useState(0);
  const [speakingAudioQuestionId, setSpeakingAudioQuestionId] = useState("");
  const [backgroundStatus, setBackgroundStatus] = useState("");
  const autosaveTimerRef = useRef<number | null>(null);
  const activeQuestionIdRef = useRef("");
  const autoFinalizeQuestionIdRef = useRef("");
  const processingMediaIdsRef = useRef(new Set<string>());
  const loadedMediaSessionRef = useRef("");

  const applySessionResponse = useCallback((data: SessionResponse) => {
    setMessage("");
    setConfirmation(null);
    setFinalizing(false);
    if (data.phase === "SUMMARY") {
      activeQuestionIdRef.current = "";
      setQuestion(null);
      setSummary(data.summary);
      setPhase("SUMMARY");
      return;
    }
    activeQuestionIdRef.current = data.question.questionInstanceId;
    autoFinalizeQuestionIdRef.current = "";
    setQuestion(data.question);
    setTotalQuestions(data.totalQuestions);
    setAnswer(data.question.answer);
    setRevision(data.question.revision);
    setSpeakingAudioQuestionId(
      data.question.speakingAudioUploaded
        ? data.question.questionInstanceId
        : "",
    );
    setSummary(null);
    setSaveState("IDLE");
    setClock(Date.now());
    setPhase("QUESTION");
  }, []);

  const loadCurrent = useCallback(async (signal?: AbortSignal) => {
    if (!enabled || !sessionId) return;
    setPhase("LOADING");
    setMessage("");
    try {
      const response = await fetch(
        `/api/teacher-applications/${applicationId}/session/current`,
        {
          method: "POST",
          headers: { "x-proctor-session-id": sessionId },
          cache: "no-store",
          signal,
        },
      );
      const data = await readJsonResponse(response).catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Không thể tải câu hỏi hiện tại.");
      }
      applySessionResponse(data as SessionResponse);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setMessage(error instanceof Error ? error.message : "Không thể tải câu hỏi hiện tại.");
      setPhase("ERROR");
    }
  }, [applicationId, applySessionResponse, enabled, sessionId]);

  const processSpeakingMediaJob = useCallback(async (
    job: SpeakingMediaJob,
    uploadedBlob?: Blob,
  ) => {
    if (processingMediaIdsRef.current.has(job.questionInstanceId)) return;
    processingMediaIdsRef.current.add(job.questionInstanceId);
    let completed = false;
    try {
      setBackgroundStatus("Đang phân tích câu trả lời Speaking ở chế độ nền...");
      const audioBlob: Blob = uploadedBlob
        ? uploadedBlob
        : await fetch(job.audioUrl, { cache: "no-store" }).then((response) => {
            if (!response.ok) throw new Error("Không thể tải audio để phân tích.");
            return response.blob();
          });
      const transcript = await enqueueSpeakingTranscription(
        audioBlob,
        job.languageCode,
        setBackgroundStatus,
      );
      const response = await fetch(
        `/api/teacher-applications/${applicationId}/session/speaking/complete`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-proctor-session-id": sessionId,
          },
          body: JSON.stringify({
            questionInstanceId: job.questionInstanceId,
            processingToken: job.processingToken,
            transcript,
          }),
        },
      );
      if (!response.ok) {
        const data = await readJsonResponse(response).catch(() => ({}));
        throw new Error(data?.error || "Không thể lưu kết quả phân tích Speaking.");
      }
      completed = true;
      setSummary((current) => current
        ? {
            ...current,
            pendingMediaJobs: Math.max(0, current.pendingMediaJobs - 1),
          }
        : current);
    } catch (error) {
      const processingError =
        error instanceof Error ? error.message : "Không thể phân tích audio.";
      const response = await fetch(
        `/api/teacher-applications/${applicationId}/session/speaking/complete`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-proctor-session-id": sessionId,
          },
          body: JSON.stringify({
            questionInstanceId: job.questionInstanceId,
            processingToken: job.processingToken,
            failed: true,
            error: processingError,
          }),
        },
      ).catch(() => null);
      if (response?.ok) {
        setSummary((current) => current
          ? {
              ...current,
              pendingMediaJobs: Math.max(0, current.pendingMediaJobs - 1),
              failedMediaJobs: current.failedMediaJobs + 1,
              pendingTechnicalIssues: current.pendingTechnicalIssues + 1,
            }
          : current);
      }
      setBackgroundStatus(`Phân tích Speaking gặp lỗi: ${processingError}`);
    } finally {
      processingMediaIdsRef.current.delete(job.questionInstanceId);
      if (completed && processingMediaIdsRef.current.size === 0) {
        setBackgroundStatus("Đã phân tích xong các câu trả lời Speaking.");
      }
    }
  }, [applicationId, sessionId]);

  const loadSpeakingMediaJobs = useCallback(async (retryFailed = false) => {
    if (!enabled || !sessionId) return;
    const response = await fetch(
      `/api/teacher-applications/${applicationId}/session/speaking/jobs`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-proctor-session-id": sessionId,
        },
        body: JSON.stringify({ retryFailed }),
      },
    );
    const data = await readJsonResponse(response).catch(() => ({}));
    if (!response.ok) {
      setBackgroundStatus(data?.error || "Không thể tải hàng đợi phân tích Speaking.");
      return;
    }
    const jobs = Array.isArray(data?.jobs)
      ? data.jobs as SpeakingMediaJob[]
      : [];
    if (retryFailed && jobs.length > 0) {
      setSummary((current) => current
        ? {
            ...current,
            pendingMediaJobs: current.pendingMediaJobs + current.failedMediaJobs,
            pendingTechnicalIssues: Math.max(
              0,
              current.pendingTechnicalIssues - current.failedMediaJobs,
            ),
            failedMediaJobs: 0,
          }
        : current);
    }
    jobs.forEach((job) => {
      void processSpeakingMediaJob(job);
    });
  }, [
    applicationId,
    enabled,
    processSpeakingMediaJob,
    sessionId,
  ]);

  useEffect(() => {
    if (!enabled || !sessionId) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void loadCurrent(controller.signal);
    }, 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [enabled, loadCurrent, sessionId]);

  useEffect(() => {
    if (!enabled || !sessionId) return;
    const sessionKey = `${applicationId}:${sessionId}`;
    if (loadedMediaSessionRef.current === sessionKey) return;
    loadedMediaSessionRef.current = sessionKey;
    void loadSpeakingMediaJobs(false);
  }, [
    applicationId,
    enabled,
    loadSpeakingMediaJobs,
    sessionId,
  ]);

  useEffect(() => {
    if (phase !== "QUESTION") return;
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    const onPopState = () => {
      window.history.pushState({ teacherSequentialExam: true }, "", window.location.href);
      void loadCurrent();
    };
    window.history.pushState({ teacherSequentialExam: true }, "", window.location.href);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [loadCurrent]);

  useEffect(() => () => {
    if (autosaveTimerRef.current !== null) {
      window.clearTimeout(autosaveTimerRef.current);
    }
  }, []);

  const autosave = useCallback(async (
    targetQuestion: SequentialQuestion,
    nextAnswer: string,
    nextRevision: number,
  ) => {
    setSaveState("SAVING");
    const response = await fetch(
      `/api/teacher-applications/${applicationId}/autosave`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-proctor-session-id": sessionId,
        },
        body: JSON.stringify({
          questionInstanceId: targetQuestion.questionInstanceId,
          transitionToken: targetQuestion.transitionToken,
          answer: nextAnswer,
          revision: nextRevision,
        }),
      },
    );
    if (activeQuestionIdRef.current !== targetQuestion.questionInstanceId) return;
    if (!response.ok) {
      const data = await readJsonResponse(response).catch(() => ({}));
      setSaveState("ERROR");
      setMessage(data?.error || "Không thể tự động lưu câu trả lời.");
      return;
    }
    setSaveState("SAVED");
  }, [applicationId, sessionId]);

  function updateAnswer(value: string) {
    if (!question || locked || finalizing) return;
    const nextRevision = revision + 1;
    setAnswer(value);
    setRevision(nextRevision);
    setSaveState("IDLE");
    if (autosaveTimerRef.current !== null) {
      window.clearTimeout(autosaveTimerRef.current);
    }
    const delay = question.type === "ESSAY" ? 500 : 100;
    autosaveTimerRef.current = window.setTimeout(() => {
      autosaveTimerRef.current = null;
      void autosave(question, value, nextRevision);
    }, delay);
  }

  const uploadSpeakingAudio = useCallback(async (blob: Blob) => {
    if (!question || question.type !== "SPEAKING" || !sessionId) {
      throw new Error("Câu hỏi Speaking không còn khả dụng.");
    }
    const form = new FormData();
    form.set("questionInstanceId", question.questionInstanceId);
    form.set("transitionToken", question.transitionToken);
    form.set(
      "audio",
      new File([blob], `speaking-${question.questionInstanceId}.webm`, {
        type: blob.type || "audio/webm",
      }),
    );
    const response = await fetch(
      `/api/teacher-applications/${applicationId}/session/speaking/upload`,
      {
        method: "POST",
        headers: { "x-proctor-session-id": sessionId },
        body: form,
      },
    );
    const data = await readJsonResponse(response).catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error || "Không thể lưu bản ghi âm.");
    }
    const job: SpeakingMediaJob = {
      questionInstanceId: data.questionInstanceId,
      audioUrl: data.audioUrl,
      languageCode,
      processingToken: data.processingToken,
    };
    setSpeakingAudioQuestionId(question.questionInstanceId);
    void processSpeakingMediaJob(job, blob);
  }, [
    applicationId,
    languageCode,
    processSpeakingMediaJob,
    question,
    sessionId,
  ]);

  const finalizeQuestion = useCallback(async (skip: boolean) => {
    if (!question || finalizing || !sessionId) return;
    if (speakingActivity !== "idle") {
      setMessage("Vui lòng dừng ghi âm và chờ audio tải lên server.");
      return;
    }
    if (autosaveTimerRef.current !== null) {
      window.clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    setFinalizing(true);
    setConfirmation(null);
    setMessage("");
    try {
      const response = await fetch(
        `/api/teacher-applications/${applicationId}/session/finalize`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-proctor-session-id": sessionId,
          },
          body: JSON.stringify({
            questionInstanceId: question.questionInstanceId,
            transitionToken: question.transitionToken,
            answer,
            revision,
            skip,
          }),
        },
      );
      const data = await readJsonResponse(response).catch(() => ({}));
      if (!response.ok) {
        if (
          data?.error === "QUESTION_ALREADY_FINALIZED" ||
          data?.error === "QUESTION_NO_LONGER_AVAILABLE" ||
          data?.error === "INVALID_TRANSITION_TOKEN"
        ) {
          await loadCurrent();
          return;
        }
        throw new Error(data?.error || "Không thể chốt câu trả lời.");
      }
      applySessionResponse(data as SessionResponse);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể chốt câu trả lời.");
      setFinalizing(false);
    }
  }, [
    answer,
    applicationId,
    applySessionResponse,
    finalizing,
    loadCurrent,
    question,
    revision,
    sessionId,
    speakingActivity,
  ]);

  const preparationRemaining = secondsUntil(question?.answerStartsAt ?? null, clock);
  const answerRemaining = secondsUntil(question?.deadlineAt ?? null, clock);
  const preparing = preparationRemaining !== null && preparationRemaining > 0;
  const questionExpired = Boolean(
    question?.deadlineAt && new Date(question.deadlineAt).getTime() <= clock,
  );

  useEffect(() => {
    if (
      !question ||
      !questionExpired ||
      finalizing ||
      speakingActivity !== "idle" ||
      autoFinalizeQuestionIdRef.current === question.questionInstanceId
    ) {
      return;
    }
    autoFinalizeQuestionIdRef.current = question.questionInstanceId;
    void finalizeQuestion(false);
  }, [
    finalizeQuestion,
    finalizing,
    question,
    questionExpired,
    speakingActivity,
  ]);

  useEffect(() => {
    if (
      globalTimeLeft !== 0 ||
      !question ||
      finalizing ||
      speakingActivity !== "idle" ||
      autoFinalizeQuestionIdRef.current === question.questionInstanceId
    ) {
      return;
    }
    autoFinalizeQuestionIdRef.current = question.questionInstanceId;
    void finalizeQuestion(false);
  }, [
    finalizeQuestion,
    finalizing,
    globalTimeLeft,
    question,
    speakingActivity,
  ]);

  if (!enabled) {
    return (
      <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-5 text-sm font-semibold text-blue-800">
        Hoàn tất bước camera và toàn màn hình để hệ thống phát câu hỏi đầu tiên.
      </div>
    );
  }

  if (phase === "LOADING") {
    return <p className="mt-5 text-sm font-semibold text-slate-600">Đang tải câu hỏi hiện tại...</p>;
  }

  if (phase === "ERROR") {
    return (
      <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-5">
        <p className="text-sm font-semibold text-red-700">{message}</p>
        <button
          type="button"
          onClick={() => void loadCurrent()}
          className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white"
        >
          Thử lại
        </button>
      </div>
    );
  }

  if (phase === "SUMMARY" && summary) {
    return (
      <section className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-5">
        <h3 className="text-xl font-bold text-slate-950">Tổng kết trước khi nộp bài</h3>
        <p className="mt-2 text-sm text-slate-600">
          Nội dung và đáp án của các câu đã chốt không thể xem lại.
        </p>
        <dl className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg bg-white p-4">
            <dt className="text-sm text-slate-500">Số câu đã hoàn thành</dt>
            <dd className="mt-1 text-2xl font-bold text-slate-950">
              {summary.completedQuestions}/{summary.totalQuestions}
            </dd>
          </div>
          <div className="rounded-lg bg-white p-4">
            <dt className="text-sm text-slate-500">Số câu bỏ trống</dt>
            <dd className="mt-1 text-2xl font-bold text-slate-950">{summary.blankQuestions}</dd>
          </div>
          <div className="rounded-lg bg-white p-4">
            <dt className="text-sm text-slate-500">Thời gian toàn bài còn lại</dt>
            <dd className="mt-1 text-lg font-bold text-slate-950">
              {globalTimeLeft === null
                ? "Không giới hạn"
                : `${Math.floor(globalTimeLeft / 60)}:${String(globalTimeLeft % 60).padStart(2, "0")}`}
            </dd>
          </div>
          <div className="rounded-lg bg-white p-4">
            <dt className="text-sm text-slate-500">Audio Speaking đang phân tích</dt>
            <dd className="mt-1 text-lg font-bold text-slate-950">
              {summary.pendingMediaJobs}
            </dd>
          </div>
          <div className="rounded-lg bg-white p-4">
            <dt className="text-sm text-slate-500">Audio Speaking cần thử lại</dt>
            <dd className="mt-1 text-lg font-bold text-slate-950">
              {summary.failedMediaJobs}
            </dd>
          </div>
        </dl>
        {backgroundStatus ? (
          <p className="mt-4 text-sm font-semibold text-blue-700">
            {backgroundStatus}
          </p>
        ) : null}
        {summary.failedMediaJobs > 0 ? (
          <button
            type="button"
            onClick={() => void loadSpeakingMediaJobs(true)}
            className="mt-4 rounded-lg border border-blue-300 px-4 py-2 text-sm font-bold text-blue-700"
          >
            Thử phân tích lại audio
          </button>
        ) : null}
        {message ? <p className="mt-4 text-sm font-semibold text-red-700">{message}</p> : null}
        <button
          type="button"
          disabled={
            submitting ||
            locked ||
            summary.pendingMediaJobs > 0 ||
            summary.failedMediaJobs > 0
          }
          onClick={() => void onSubmitTest()}
          className="mt-5 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
        >
          {submitting ? ui.teacherEntrance.submitting : "Xác nhận nộp toàn bài"}
        </button>
      </section>
    );
  }

  if (!question) return null;

  const answerLocked =
    locked ||
    finalizing ||
    preparing ||
    questionExpired ||
    globalTimeLeft === 0;
  return (
    <>
      <article className="mt-5 rounded-xl border border-slate-200 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-blue-700">
              {question.displaySequence}
              {totalQuestions > 0 ? ` / ${totalQuestions}` : ""}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Sau khi chốt, câu hỏi này sẽ không thể mở lại.
            </p>
          </div>
          <div className="text-right text-sm font-semibold">
            {preparing ? (
              <p className="text-amber-700">Chuẩn bị: {preparationRemaining}s</p>
            ) : answerRemaining !== null ? (
              <p className={answerRemaining < 30 ? "text-red-700" : "text-blue-700"}>
                Trả lời: {answerRemaining}s
              </p>
            ) : null}
            <p className="mt-1 text-xs text-slate-500">
              {saveState === "SAVING"
                ? "Đang lưu..."
                : saveState === "SAVED"
                  ? "Đã lưu"
                  : saveState === "ERROR"
                    ? "Lưu chưa thành công"
                    : ""}
            </p>
          </div>
        </div>
        {backgroundStatus ? (
          <p className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">
            {backgroundStatus}
          </p>
        ) : null}
        {question.audioUrl ? (
          <audio controls={!answerLocked} className="mt-4 w-full max-w-md" src={question.audioUrl} />
        ) : null}
        <p className="mt-4 text-lg font-semibold leading-7 text-slate-950">{question.prompt}</p>
        <FormattedHint hint={question.hint} />
        <div className="mt-4 space-y-3">
          {(question.type === "MULTIPLE_CHOICE" || question.type === "TRUE_FALSE") &&
          question.answers
            ? question.answers.map((option) => (
                <label key={option.id} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
                  <input
                    type="radio"
                    name={question.questionInstanceId}
                    checked={answer === option.id}
                    disabled={answerLocked}
                    onChange={() => updateAnswer(option.id)}
                  />
                  <span>{option.content}</span>
                </label>
              ))
            : null}
          {question.type === "FILL_IN_BLANK" ? (
            <input
              value={answer}
              disabled={answerLocked}
              onChange={(event) => updateAnswer(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              aria-label="Câu trả lời điền khuyết"
            />
          ) : null}
          {question.type === "ESSAY" ? (
            <textarea
              rows={10}
              value={answer}
              disabled={answerLocked}
              onChange={(event) => updateAnswer(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              aria-label="Bài viết"
            />
          ) : null}
          {question.type === "SPEAKING" ? (
            <TeacherSpeakingRecorder
              key={question.questionInstanceId}
              disabled={answerLocked}
              forceStop={
                questionExpired ||
                (answerRemaining !== null && answerRemaining <= 2) ||
                (globalTimeLeft !== null && globalTimeLeft <= 2)
              }
              activity={speakingActivity}
              setActivity={onSpeakingActivityChange}
              initialUploaded={
                speakingAudioQuestionId === question.questionInstanceId
              }
              onAudioReady={uploadSpeakingAudio}
            />
          ) : null}
        </div>
        {message ? <p className="mt-4 text-sm font-semibold text-red-700">{message}</p> : null}
        <button
          type="button"
          disabled={answerLocked || speakingActivity !== "idle"}
          onClick={() => {
            const blank = question.type === "SPEAKING"
              ? speakingAudioQuestionId !== question.questionInstanceId
              : !answer.trim();
            setConfirmation({
              skip: blank,
              title: blank ? "Bạn chưa có câu trả lời" : "Xác nhận câu trả lời",
              body: blank
                ? "Nếu tiếp tục, câu hỏi này sẽ được ghi nhận là bỏ trống và bạn không thể mở lại."
                : question.type === "SPEAKING"
                  ? "Bản ghi này sẽ được dùng làm câu trả lời cuối cùng. Bạn sẽ không thể ghi lại sau khi xác nhận."
                  : "Sau khi chuyển sang câu tiếp theo, bạn sẽ không thể xem lại hoặc chỉnh sửa câu hỏi này.",
              confirmLabel: blank
                ? "Bỏ qua câu này"
                : question.type === "SPEAKING"
                  ? "Xác nhận bản ghi"
                  : "Xác nhận và tiếp tục",
            });
          }}
          className="mt-5 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
        >
          {finalizing ? "Đang chốt câu..." : "Tiếp tục"}
        </button>
      </article>

      {confirmation ? (
        <dialog open className="fixed inset-0 z-[80] flex h-full w-full max-w-none items-center justify-center border-0 bg-slate-950/75 p-4">
          <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-950">{confirmation.title}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-700">{confirmation.body}</p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmation(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700"
              >
                {confirmation.skip ? "Quay lại trả lời" : "Kiểm tra lại"}
              </button>
              <button
                type="button"
                onClick={() => void finalizeQuestion(confirmation.skip)}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white"
              >
                {confirmation.confirmLabel}
              </button>
            </div>
          </section>
        </dialog>
      ) : null}
    </>
  );
}
