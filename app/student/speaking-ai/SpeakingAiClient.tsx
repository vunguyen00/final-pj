"use client";

import { useEffect, useMemo, useReducer, useRef } from "react";
import Link from "next/link";
import { IeltsEvaluationResult } from "@/app/components/IeltsEvaluationResult";
import { LanguageEvaluationResult } from "@/app/components/LanguageEvaluationResult";
import { ModalDialog } from "@/app/components/ModalDialog";
import { readJsonResponse } from "@/lib/http-response";
import type { IeltsSpeakingEvaluation } from "@/lib/ielts-rubric";
import { getSpeakingRecordingLabels } from "@/lib/speaking-recording-labels";
import {
  getDefaultSpeakingPrompt,
  getSpeakingAiUiLabels,
  getSpeakingLanguageLabel,
  getSpeakingTaskOptions,
  getSpeakingWhisperLanguage,
  normalizeSpeakingLanguage,
  SPEAKING_LANGUAGES,
  type SpeakingLanguage,
  type SpeakingTask,
} from "@/lib/speaking-languages";

type InitialSpeakingConfig = {
  userRole: string;
  aiPointBalance: number;
  speakingLanguage: SpeakingLanguage;
  durationSeconds: number;
};

type SpeakingResult = {
  assessmentId: string;
  evaluationBasis?: "TRANSCRIPT_ESTIMATE";
  scoreOnly?: boolean;
  audioUrl: string | null;
  points?: { spent: number; available: number };
  streak?: number;
  data: {
    scoreOnly?: boolean;
    ielts?: IeltsSpeakingEvaluation;
    evaluation: {
      scores: Record<string, number>;
      overall: number;
      normalizedOverall?: number;
      taskRelevance?: number;
      language: string;
      exam?: string;
      taskType?: string;
      maxScore?: number;
      scoreScale?: string;
      band: { system: string; level: string; score: number; rationale: string };
      summary: string;
      onTopic?: boolean;
      offTopicReason?: string;
      detailedComment?: string;
      criteriaFeedback?: Record<string, import("@/lib/test-ai-evaluation").TestAiCriterionFeedback>;
    };
    analysis: {
      strengths: string[];
      weaknesses: string[];
      feedback: string[];
      suggestions: string[];
      majorErrors?: string[];
      improvementsNeeded?: string[];
    };
    mistakes: {
      pronunciation: string[];
      grammar: string[];
      vocabulary: string[];
      fluency: string[];
      majorErrors?: string[];
    };
    improvements: {
      suggestions?: string[];
      improvementsNeeded?: string[];
      practiceMethods: string[];
      sampleAnswer?: string;
    };
  };
};

type SpeakingState = {
  speakingLanguage: SpeakingLanguage;
  durationSeconds: number;
  prompt: string;
  timeLeft: number;
  sessionRunning: boolean;
  transcriptDraft: string;
  recording: boolean;
  preparingSession: boolean;
  audioBlob: Blob | null;
  audioPreview: string;
  loading: boolean;
  submitAction: "score" | "feedback" | null;
  transcribing: boolean;
  transcriptionStatus: string;
  setupOpen: boolean;
  speakingPart: SpeakingTask;
  topicMode: "custom" | "random";
  topicInput: string;
  selectedTopic: string;
  generatingTopic: boolean;
  topicError: string;
  error: string;
  result: SpeakingResult | null;
};

type SpeakingAction =
  | { type: "PATCH"; patch: Partial<SpeakingState> }
  | { type: "CHANGE_LANGUAGE"; language: SpeakingLanguage }
  | { type: "RESET_SESSION"; durationSeconds: number }
  | { type: "TOPIC_SUCCESS"; prompt: string; selectedTopic: string }
  | { type: "SUBMIT_START"; submitAction: "score" | "feedback" }
  | { type: "SUBMIT_SUCCESS"; result: SpeakingResult; message?: string }
  | { type: "SUBMIT_FINISH" };

type TranscriptionWorkerMessage = {
  type: "progress" | "transcribing" | "result" | "error";
  id?: number;
  status?: string;
  progress?: number;
  file?: string;
  text?: string;
  error?: string;
};

type SpeakingController = ReturnType<typeof useSpeakingAiController>;

function createInitialState(config: InitialSpeakingConfig): SpeakingState {
  return {
    speakingLanguage: config.speakingLanguage,
    durationSeconds: config.durationSeconds,
    prompt: getDefaultSpeakingPrompt(config.speakingLanguage),
    timeLeft: config.durationSeconds,
    sessionRunning: false,
    transcriptDraft: "",
    recording: false,
    preparingSession: false,
    audioBlob: null,
    audioPreview: "",
    loading: false,
    submitAction: null,
    transcribing: false,
    transcriptionStatus: "",
    setupOpen: true,
    speakingPart: getSpeakingTaskOptions(config.speakingLanguage)[0]?.value ?? 2,
    topicMode: "custom",
    topicInput: "",
    selectedTopic: "",
    generatingTopic: false,
    topicError: "",
    error: "",
    result: null,
  };
}

function speakingReducer(state: SpeakingState, action: SpeakingAction): SpeakingState {
  switch (action.type) {
    case "PATCH":
      return { ...state, ...action.patch };
    case "CHANGE_LANGUAGE": {
      const firstTask = getSpeakingTaskOptions(action.language)[0]?.value ?? 2;
      return {
        ...state,
        speakingLanguage: action.language,
        speakingPart: firstTask,
        prompt: getDefaultSpeakingPrompt(action.language),
        selectedTopic: "",
        result: null,
        topicError: "",
      };
    }
    case "RESET_SESSION":
      return {
        ...state,
        audioPreview: "",
        audioBlob: null,
        transcriptDraft: "",
        transcriptionStatus: "",
        timeLeft: action.durationSeconds,
        result: null,
        error: "",
      };
    case "TOPIC_SUCCESS":
      return {
        ...state,
        prompt: action.prompt,
        selectedTopic: action.selectedTopic,
        result: null,
        error: "",
        setupOpen: false,
      };
    case "SUBMIT_START":
      return {
        ...state,
        loading: true,
        submitAction: action.submitAction,
        error: "",
        result: null,
      };
    case "SUBMIT_SUCCESS":
      return {
        ...state,
        result: action.result,
        error: action.message ?? "",
      };
    case "SUBMIT_FINISH":
      return {
        ...state,
        loading: false,
        submitAction: null,
      };
    default:
      return state;
  }
}

function formatClock(totalSeconds: number) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function toDisplayCriterionName(
  key: string,
  labels: Record<string, string>,
) {
  return (
    labels[key] ||
    key.replace(/_/g, " ").replace(/([A-Z])/g, " $1").trim()
  );
}

async function decodeAudioToMono16Khz(blob: Blob) {
  const audioContext = new AudioContext();
  try {
    const decoded = await audioContext.decodeAudioData(await blob.arrayBuffer());
    const targetSampleRate = 16000;
    const frameCount = Math.max(1, Math.ceil(decoded.duration * targetSampleRate));
    const offlineContext = new OfflineAudioContext(1, frameCount, targetSampleRate);
    const source = offlineContext.createBufferSource();
    source.buffer = decoded;
    source.connect(offlineContext.destination);
    source.start();
    const rendered = await offlineContext.startRendering();
    return new Float32Array(rendered.getChannelData(0));
  } finally {
    await audioContext.close().catch(() => undefined);
  }
}

function redirectToAiPointWallet() {
  const returnTo = `${window.location.pathname}${window.location.search}`;
  window.location.href = `/student/wallet?returnTo=${encodeURIComponent(returnTo)}`;
}

export default function SpeakingAiClient({ initialConfig }: { initialConfig: InitialSpeakingConfig }) {
  const controller = useSpeakingAiController(initialConfig);
  return <SpeakingAiView controller={controller} />;
}

function useSpeakingAiController(initialConfig: InitialSpeakingConfig) {
  const [state, dispatch] = useReducer(speakingReducer, initialConfig, createInitialState);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioBlobRef = useRef<Blob | null>(null);
  const audioPreviewRef = useRef("");
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const transcriptionWorkerRef = useRef<Worker | null>(null);
  const transcriptionRequestIdRef = useRef(0);
  const transcriptDraftRef = useRef("");
  const submittingRef = useRef(false);
  const finishAndSubmitRef = useRef<(autoSubmit: boolean, includeAiFeedback?: boolean) => Promise<void>>(async () => undefined);
  const spentSeconds = useMemo(() => Math.max(0, state.durationSeconds - state.timeLeft), [state.durationSeconds, state.timeLeft]);
  const currentTurnTranscript = state.transcriptDraft.trim();
  const speakingTaskOptions = useMemo(() => getSpeakingTaskOptions(state.speakingLanguage), [state.speakingLanguage]);
  const text = useMemo(
    () => getSpeakingAiUiLabels(state.speakingLanguage),
    [state.speakingLanguage],
  );
  const recordingText = useMemo(
    () => getSpeakingRecordingLabels(state.speakingLanguage),
    [state.speakingLanguage],
  );

  useEffect(() => {
    if (!state.sessionRunning) return;
    if (state.timeLeft <= 0) {
      void finishAndSubmitRef.current(true, false);
      return;
    }

    const timer = window.setTimeout(() => {
      dispatch({ type: "PATCH", patch: { timeLeft: Math.max(0, state.timeLeft - 1) } });
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [state.sessionRunning, state.timeLeft]);

  useEffect(() => {
    return () => {
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.stop();
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
      transcriptionWorkerRef.current?.terminate();
      transcriptionWorkerRef.current = null;
      if (audioPreviewRef.current) URL.revokeObjectURL(audioPreviewRef.current);
    };
  }, []);

  async function startAudioCapture() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      streamRef.current = stream;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        audioBlobRef.current = blob;
        dispatch({ type: "PATCH", patch: { audioBlob: blob } });
        if (audioPreviewRef.current) URL.revokeObjectURL(audioPreviewRef.current);
        const previewUrl = URL.createObjectURL(blob);
        audioPreviewRef.current = previewUrl;
        dispatch({ type: "PATCH", patch: { audioPreview: previewUrl } });
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      };
      recorderRef.current = recorder;
      recorder.start(500);
      dispatch({ type: "PATCH", patch: { recording: true } });
      return true;
    } catch {
      dispatch({ type: "PATCH", patch: { error: text.micError } });
      return false;
    }
  }

  function stopAudioCapture() {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    recorderRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    dispatch({ type: "PATCH", patch: { recording: false } });
  }

  async function stopAudioCaptureAndWait() {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      stopAudioCapture();
      return;
    }

    await new Promise<void>((resolve) => {
      recorder.addEventListener("stop", () => resolve(), { once: true });
      recorder.stop();
    });

    recorderRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    dispatch({ type: "PATCH", patch: { recording: false } });
  }

  function getTranscriptionWorker() {
    if (!transcriptionWorkerRef.current) {
      transcriptionWorkerRef.current = new Worker("/workers/speaking-transcription.worker.mjs", { type: "module" });
    }
    return transcriptionWorkerRef.current;
  }

  async function transcribeRecordedAudio(blob: Blob) {
    dispatch({
      type: "PATCH",
      patch: {
        transcribing: true,
        transcriptionStatus: recordingText.preparingRecording,
      },
    });

    try {
      const audio = await decodeAudioToMono16Khz(blob);
      const worker = getTranscriptionWorker();
      const requestId = ++transcriptionRequestIdRef.current;

      return await new Promise<string>((resolve, reject) => {
        const handleMessage = (event: MessageEvent<TranscriptionWorkerMessage>) => {
          const message = event.data;

          if (message.type === "progress") {
            const percent = typeof message.progress === "number" ? Math.round(message.progress) : null;
            dispatch({
              type: "PATCH",
              patch: {
                transcriptionStatus: percent !== null
                  ? recordingText.preparingAnalyzerProgress(percent)
                  : recordingText.preparingAnalyzer,
              },
            });
            return;
          }

          if (message.id !== requestId) return;

          if (message.type === "transcribing") {
            dispatch({ type: "PATCH", patch: { transcriptionStatus: recordingText.analyzingFullRecording } });
            return;
          }

          worker.removeEventListener("message", handleMessage);
          worker.removeEventListener("error", handleWorkerError);

          if (message.type === "result") {
            resolve(String(message.text || "").trim());
            return;
          }

          reject(new Error(message.error || text.audioToTextFailed));
        };

        const handleWorkerError = () => {
          worker.removeEventListener("message", handleMessage);
          worker.removeEventListener("error", handleWorkerError);
          reject(new Error(text.analyzerStartFailed));
        };

        worker.addEventListener("message", handleMessage);
        worker.addEventListener("error", handleWorkerError);
        worker.postMessage(
          {
            id: requestId,
            audio: audio.buffer,
            language: getSpeakingWhisperLanguage(state.speakingLanguage),
          },
          [audio.buffer],
        );
      });
    } finally {
      dispatch({ type: "PATCH", patch: { transcribing: false, transcriptionStatus: "" } });
    }
  }

  async function generateSpeakingTopic() {
    const customTopic = state.topicInput.trim();
    if (state.topicMode === "custom" && !customTopic) {
      dispatch({ type: "PATCH", patch: { topicError: text.customTopicRequired } });
      return;
    }

    dispatch({ type: "PATCH", patch: { generatingTopic: true, topicError: "" } });
    try {
      const response = await fetch("/api/ai/speaking-evaluation/topic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: state.speakingLanguage,
          task: state.speakingPart,
          topic: state.topicMode === "custom" ? customTopic : "",
          randomTopic: state.topicMode === "random",
        }),
      });
      const data = (await readJsonResponse(response).catch(() => ({}))) as {
        topic?: string;
        prompt?: string;
        error?: string;
      };

      if (!response.ok || !data.prompt) {
        dispatch({ type: "PATCH", patch: { topicError: data.error || text.topicFailed } });
        return;
      }

      dispatch({ type: "TOPIC_SUCCESS", prompt: data.prompt, selectedTopic: data.topic || customTopic || text.randomTopic });
    } catch {
      dispatch({ type: "PATCH", patch: { topicError: text.topicFailedRetry } });
    } finally {
      dispatch({ type: "PATCH", patch: { generatingTopic: false } });
    }
  }

  async function startSession() {
    if (state.preparingSession) return;

    dispatch({ type: "PATCH", patch: { error: "", result: null } });
    if (!state.prompt.trim()) {
      dispatch({ type: "PATCH", patch: { error: text.promptRequired } });
      return;
    }

    if (audioPreviewRef.current) URL.revokeObjectURL(audioPreviewRef.current);
    audioPreviewRef.current = "";
    audioBlobRef.current = null;
    transcriptDraftRef.current = "";
    dispatch({ type: "RESET_SESSION", durationSeconds: state.durationSeconds });
    dispatch({ type: "PATCH", patch: { preparingSession: true } });

    const audioReady = await startAudioCapture();
    if (!audioReady) {
      dispatch({ type: "PATCH", patch: { preparingSession: false } });
      return;
    }

    dispatch({ type: "PATCH", patch: { sessionRunning: true, preparingSession: false } });
  }

  async function finishAndSubmit(autoSubmit: boolean, includeAiFeedback = false) {
    if (!state.sessionRunning || submittingRef.current) return;
    if (includeAiFeedback && initialConfig.userRole !== "ADMIN" && initialConfig.aiPointBalance < 7) {
      redirectToAiPointWallet();
      return;
    }
    const paymentTxnRef = "";
    if (false && includeAiFeedback && initialConfig.userRole !== "ADMIN" && !paymentTxnRef) {
      dispatch({
        type: "PATCH",
        patch: { error: text.paymentRequired },
      });
      return;
    }
    submittingRef.current = true;

    dispatch({ type: "PATCH", patch: { sessionRunning: false } });
    await stopAudioCaptureAndWait();

    dispatch({ type: "SUBMIT_START", submitAction: includeAiFeedback ? "feedback" : "score" });

    try {
      const finalAudioBlob = audioBlobRef.current || state.audioBlob;
      if (!finalAudioBlob || finalAudioBlob.size === 0) {
        dispatch({ type: "PATCH", patch: { error: text.missingAudio } });
        return;
      }

      const studentTranscript = await transcribeRecordedAudio(finalAudioBlob);
      if (!studentTranscript) {
        dispatch({ type: "PATCH", patch: { error: text.noSpeech } });
        return;
      }
      transcriptDraftRef.current = studentTranscript;
      dispatch({ type: "PATCH", patch: { transcriptDraft: studentTranscript } });

      const form = new FormData();
      form.set("prompt", state.prompt);
      form.set("transcript", studentTranscript);
      form.set("conversation", "[]");
      form.set("transcriptionSource", "whisper-browser");
      form.set("includeAiFeedback", String(includeAiFeedback));
      if (paymentTxnRef) form.set("paymentTxnRef", paymentTxnRef);
      form.set("language", state.speakingLanguage);
      form.set("task", String(state.speakingPart));
      form.set("durationSeconds", String(Math.max(1, spentSeconds || state.durationSeconds)));
      form.set("title", `${text.titlePrefix} - ${getSpeakingLanguageLabel(state.speakingLanguage)}`);
      const courseId = new URLSearchParams(window.location.search).get("courseId");
      if (courseId) form.set("courseId", courseId);
      form.set("audio", finalAudioBlob, "speaking.webm");

      const response = await fetch("/api/ai/speaking-evaluation", {
        method: "POST",
        body: form,
      });
      const data = (await readJsonResponse(response).catch(() => ({}))) as SpeakingResult & { error?: string };

      if (!response.ok) {
        if ((data as { requiresPointPurchase?: boolean }).requiresPointPurchase) {
          redirectToAiPointWallet();
          return;
        }
        dispatch({ type: "PATCH", patch: { error: data.error || text.scoreFailed } });
        return;
      }

      dispatch({
        type: "SUBMIT_SUCCESS",
        result: data,
        message: autoSubmit ? text.autoSubmitted : undefined,
      });
    } catch (submitError) {
      dispatch({
        type: "PATCH",
        patch: {
          error: submitError instanceof Error ? submitError.message : text.scoreFailed,
        },
      });
    } finally {
      dispatch({ type: "SUBMIT_FINISH" });
      submittingRef.current = false;
    }
  }

  useEffect(() => {
    finishAndSubmitRef.current = finishAndSubmit;
  });

  return {
    state,
    userRole: initialConfig.userRole,
    spentSeconds,
    currentTurnTranscript,
    speakingTaskOptions,
    text,
    recordingText,
    dispatch,
    startSession,
    finishAndSubmit,
    generateSpeakingTopic,
    redirectToAiPointWallet,
  };
}

function SpeakingAiView({ controller }: { controller: SpeakingController }) {
  const { state, userRole } = controller;
  const scoreOnly = Boolean(state.result?.scoreOnly || state.result?.data.scoreOnly);

  return (
    <main className="min-h-dvh bg-slate-50 py-8">
      <div className="mx-auto max-w-6xl space-y-6 px-4">
        <SpeakingHeader userRole={userRole} text={controller.text} />
        <SpeakingSessionPanel controller={controller} />
        <TranscriptPanel controller={controller} />
        {state.transcriptionStatus ? <StatusAlert tone="amber" message={state.transcriptionStatus} /> : null}
        {state.error ? <StatusAlert tone="red" message={state.error} /> : null}
        {state.result ? (
          <>
            <StatusAlert
              tone="amber"
              message="Kết quả này là ước lượng từ bản chép lời và thời lượng. Hệ thống chưa phân tích âm học, nên điểm phát âm không phải phép đo trực tiếp từ giọng nói."
            />
            <SpeakingResult
              result={state.result}
              userRole={userRole}
              scoreOnly={scoreOnly}
              text={controller.text}
            />
          </>
        ) : null}
      </div>

      {state.setupOpen ? <SpeakingSetupModal controller={controller} /> : null}
    </main>
  );
}

function SpeakingHeader({
  userRole,
  text,
}: {
  userRole: string;
  text: ReturnType<typeof getSpeakingAiUiLabels>;
}) {
  const isAdmin = userRole === "ADMIN";
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
            {text.headerEyebrow(isAdmin)}
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">
            {text.headerTitle}
          </h1>
          <p className="mt-2 max-w-3xl text-slate-600">
            {text.headerDescription}
          </p>
        </div>
        <Link href="/student/results" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
          {text.resultHistory}
        </Link>
      </div>
    </section>
  );
}

function SpeakingSessionPanel({ controller }: { controller: SpeakingController }) {
  const { state, userRole, dispatch, startSession, finishAndSubmit, text, recordingText } = controller;
  const isAdmin = userRole === "ADMIN";

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="grid gap-4 md:grid-cols-3">
        <InfoTile label={text.language} value={getSpeakingLanguageLabel(state.speakingLanguage)} />
        <InfoTile label={text.duration} value={`${Math.round(state.durationSeconds / 60)} ${text.minute}`} />
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{text.status}</p>
          <p className="mt-2 text-sm text-slate-700">{state.recording ? text.recording : text.notRecording}</p>
          <p className="mt-1 text-sm text-slate-700">
            {state.transcribing ? recordingText.analyzingAudio : state.transcriptDraft ? text.analyzed : text.audioAfterFinish}
          </p>
        </div>
      </div>

      <label htmlFor="speaking-prompt" className="mt-4 block text-sm font-semibold text-slate-700">{text.promptLabel}</label>
      <textarea
        id="speaking-prompt"
        value={state.prompt}
        onChange={(event) => dispatch({ type: "PATCH", patch: { prompt: event.target.value } })}
        rows={1}
        disabled={state.sessionRunning || state.preparingSession || state.loading}
        className="mt-2 min-h-20 w-full resize-none overflow-hidden rounded-lg border border-slate-300 px-4 py-3 text-sm leading-6 [field-sizing:content] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
      />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{text.taskBadge(state.speakingPart)}</span>
        {state.selectedTopic ? <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">{text.topicBadge(state.selectedTopic)}</span> : null}
        <button
          type="button"
          onClick={() => dispatch({ type: "PATCH", patch: { setupOpen: true } })}
          disabled={state.sessionRunning || state.preparingSession || state.loading}
          className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {text.chooseOtherTopic}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {!state.sessionRunning ? (
          <>
          <button
            type="button"
            onClick={() => void startSession()}
            disabled={state.loading || state.preparingSession}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-300"
          >
            {state.transcribing
              ? recordingText.analyzingAudio
              : state.loading
                ? state.submitAction === "feedback"
                  ? text.reviewing
                  : text.scoring
                : state.preparingSession
                  ? text.startingMic
                  : text.startSession}
          </button>
          {userRole !== "ADMIN" ? (
            <button type="button" onClick={controller.redirectToAiPointWallet} disabled={state.loading || state.preparingSession} className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-300">
              {text.payAiFeedback}
            </button>
          ) : null}
          </>
        ) : (
          <>
            <button type="button" onClick={() => void finishAndSubmit(false, false)} disabled={state.loading} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-300">
              {text.finishScore}
            </button>
            <button type="button" onClick={() => void finishAndSubmit(false, true)} disabled={state.loading} className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-300">
              {text.finishFeedback(isAdmin)}
            </button>
          </>
        )}

        <span className={`rounded-lg px-3 py-2 text-sm font-semibold ${state.timeLeft <= 30 ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-700"}`}>
          {formatClock(state.timeLeft)}
        </span>

        {state.preparingSession ? <span className="text-sm text-slate-500">{text.waitReady}</span> : null}
      </div>
    </section>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function TranscriptPanel({ controller }: { controller: SpeakingController }) {
  const { state, currentTurnTranscript, text } = controller;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-bold text-slate-950">{text.transcriptTitle}</h2>
      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{text.transcriptLabel}</p>
        <p className="mt-2 min-h-16 whitespace-pre-wrap text-sm text-slate-800">
          {currentTurnTranscript ||
            (state.recording
              ? text.transcriptRecording
              : text.transcriptEmpty)}
        </p>
      </div>

      {state.audioPreview ? (
        <audio controls className="mt-4 w-full">
          <source src={state.audioPreview} />
        </audio>
      ) : null}
    </section>
  );
}

function StatusAlert({ tone, message }: { tone: "amber" | "red"; message: string }) {
  const className = tone === "amber"
    ? "rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
    : "rounded-lg bg-red-50 p-3 text-sm text-red-700";
  return <p className={className}>{message}</p>;
}

function SpeakingResult({
  result,
  userRole,
  scoreOnly,
  text,
}: {
  result: SpeakingResult;
  userRole: string;
  scoreOnly: boolean;
  text: ReturnType<typeof getSpeakingAiUiLabels>;
}) {
  if (result.data.ielts) {
    return (
      <section className="space-y-6">
        <SavedResultNotice result={result} userRole={userRole} scoreOnly={scoreOnly} text={text} />
        <IeltsEvaluationResult evaluation={result.data.ielts} scoreOnly={scoreOnly} />
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <SavedResultNotice result={result} userRole={userRole} scoreOnly={scoreOnly} text={text} />
      <LanguageEvaluationResult
        skill="speaking"
        evaluation={result.data.evaluation}
        analysis={result.data.analysis}
        mistakes={{ ...result.data.mistakes }}
        improvements={{ ...result.data.improvements }}
        sampleAnswer={result.data.improvements.sampleAnswer}
        taskType={result.data.evaluation.taskType}
        scoreOnly={scoreOnly}
      />
    </section>
  );
}

function SavedResultNotice({
  result,
  userRole,
  scoreOnly,
  text,
}: {
  result: SpeakingResult;
  userRole: string;
  scoreOnly: boolean;
  text: ReturnType<typeof getSpeakingAiUiLabels>;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm font-semibold text-red-600">
        {scoreOnly
          ? text.scoreFree
          : userRole !== "ADMIN"
            ? text.aiPaid
            : text.aiAdminFree}
      </p>
      <Link href={`/student/results/${result.assessmentId}`} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
        {text.viewSaved}
      </Link>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function LegacyResultSummary({
  result,
  userRole,
  scoreOnly,
  scoreMax,
  text,
}: {
  result: SpeakingResult;
  userRole: string;
  scoreOnly: boolean;
  scoreMax: number;
  text: ReturnType<typeof getSpeakingAiUiLabels>;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-blue-600">
            {result.data.evaluation.language} - {result.data.evaluation.band.system}
          </p>
          <h2 className="mt-1 text-2xl font-bold text-slate-950">{text.level} {result.data.evaluation.band.level}</h2>
          {scoreOnly ? (
            <p className="mt-2 text-sm text-slate-600">{text.scoreOnlyNote}</p>
          ) : (
            <p className="mt-2 text-sm text-slate-600">{result.data.evaluation.summary}</p>
          )}
          {!scoreOnly && result.data.evaluation.onTopic === false ? (
            <p className="mt-2 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">
              {text.offTopic}: {result.data.evaluation.offTopicReason || text.offTopicFallback}
            </p>
          ) : null}
        </div>
        <div className="text-left sm:text-right">
          <p className="text-5xl font-bold text-slate-950">{result.data.evaluation.overall.toFixed(1)}</p>
          <p className="text-sm font-semibold text-slate-600">
            / {scoreMax} (quy đổi {result.data.evaluation.normalizedOverall?.toFixed(1) ?? "-"}/10)
          </p>
          <p className="text-sm font-semibold text-red-600">
            {scoreOnly
              ? text.scoreFree
              : userRole !== "ADMIN"
                ? text.aiPaid
                : text.aiAdminFree}
          </p>
          {!scoreOnly ? (
            <p className="mt-1 text-xs font-semibold text-slate-500">{text.relevance}: {Math.round(result.data.evaluation.taskRelevance ?? 0)}/100</p>
          ) : null}
        </div>
      </div>
      <Link href={`/student/results/${result.assessmentId}`} className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
        {text.viewSaved}
      </Link>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function DetailedSpeakingFeedback({
  result,
  text,
}: {
  result: SpeakingResult;
  text: ReturnType<typeof getSpeakingAiUiLabels>;
}) {
  const sectionLabels = getSpeakingFeedbackSectionLabels(result.data.evaluation.language);
  const mistakeItems = [
    ...(result.data.mistakes.majorErrors || []),
    ...result.data.mistakes.pronunciation,
    ...result.data.mistakes.grammar,
    ...result.data.mistakes.vocabulary,
    ...result.data.mistakes.fluency,
  ];
  const improvementItems = [...new Set([
    ...(result.data.improvements.improvementsNeeded || []),
    ...result.data.analysis.suggestions,
    ...(result.data.improvements.suggestions || []),
    ...result.data.improvements.practiceMethods,
  ])].filter(Boolean);

  return (
    <>
      <FeedbackBlock title={sectionLabels.strengths} items={result.data.analysis.strengths} />
      <FeedbackBlock title={sectionLabels.weaknesses} items={result.data.analysis.weaknesses} />
      <FeedbackBlock title={text.detailedFeedback} items={result.data.analysis.feedback} />
      {result.data.evaluation.detailedComment ? (
        <section className="rounded-xl border border-blue-200 bg-blue-50 p-5">
          <h2 className="text-lg font-bold text-blue-950">{text.summaryComment}</h2>
          <p className="mt-3 text-sm leading-6 text-blue-900">{result.data.evaluation.detailedComment}</p>
        </section>
      ) : null}
      <FeedbackBlock title={text.criteriaTitle} items={mistakeItems} />
      <FeedbackBlock title={text.improvementMethods} items={improvementItems} />
      {result.data.improvements.sampleAnswer ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-bold text-slate-950">{text.sampleAnswer}</h2>
          <p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-700">{result.data.improvements.sampleAnswer}</p>
        </section>
      ) : null}
    </>
  );
}

function getSpeakingFeedbackSectionLabels(language: string) {
  const normalized = language.toLowerCase();
  if (normalized.includes("chinese") || normalized.includes("zh") || normalized.includes("cn") || normalized.includes("\u4e2d\u6587")) {
    return { strengths: "\u4f18\u70b9", weaknesses: "\u4e0d\u8db3" };
  }
  if (normalized.includes("japanese") || normalized.includes("ja") || normalized.includes("jp") || normalized.includes("\u65e5\u672c")) {
    return { strengths: "\u826f\u3044\u70b9", weaknesses: "\u5f31\u70b9" };
  }
  if (normalized.includes("korean") || normalized.includes("ko") || normalized.includes("kr") || normalized.includes("\ud55c\uad6d")) {
    return { strengths: "\uac15\uc810", weaknesses: "\uc57d\uc810" };
  }
  return { strengths: "Strengths", weaknesses: "Weaknesses" };
}

function SpeakingSetupModal({ controller }: { controller: SpeakingController }) {
  const { state, speakingTaskOptions, dispatch, generateSpeakingTopic, text } = controller;

  return (
    <ModalDialog labelledBy="speaking-setup-title" onClose={() => dispatch({ type: "PATCH", patch: { setupOpen: false } })} className="z-50 py-8">
      <section className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">{text.setupEyebrow}</p>
        <h2 id="speaking-setup-title" className="mt-2 text-2xl font-bold text-slate-950">{text.setupTitle}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {text.setupDescription}
        </p>

        <label htmlFor="speaking-language" className="mt-5 block text-sm font-semibold text-slate-700">{text.speakingLanguage}</label>
        <select
          id="speaking-language"
          value={state.speakingLanguage}
          onChange={(event) => dispatch({ type: "CHANGE_LANGUAGE", language: normalizeSpeakingLanguage(event.target.value) })}
          disabled={state.generatingTopic}
          className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
        >
          {SPEAKING_LANGUAGES.map((language) => <option key={language.value} value={language.value}>{language.label}</option>)}
        </select>

        <label htmlFor="speaking-part" className="mt-5 block text-sm font-semibold text-slate-700">{text.speakingTask}</label>
        <select
          id="speaking-part"
          value={state.speakingPart}
          onChange={(event) => dispatch({ type: "PATCH", patch: { speakingPart: Number(event.target.value) as SpeakingTask } })}
          disabled={state.generatingTopic}
          className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
        >
          {speakingTaskOptions.map((task) => <option key={task.value} value={task.value}>{task.label}</option>)}
        </select>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <TopicModeButton
            active={state.topicMode === "custom"}
            title={text.chooseTopic}
            description={text.chooseTopicDescription}
            disabled={state.generatingTopic}
            onClick={() => dispatch({ type: "PATCH", patch: { topicMode: "custom", topicError: "" } })}
          />
          <TopicModeButton
            active={state.topicMode === "random"}
            title={text.randomTopicTitle}
            description={text.randomTopicDescription}
            disabled={state.generatingTopic}
            onClick={() => dispatch({ type: "PATCH", patch: { topicMode: "random", topicError: "" } })}
          />
        </div>

        {state.topicMode === "custom" ? (
          <>
            <label htmlFor="speaking-topic" className="mt-4 block text-sm font-semibold text-slate-700">{text.topic}</label>
            <input
              id="speaking-topic"
              value={state.topicInput}
              onChange={(event) => dispatch({ type: "PATCH", patch: { topicInput: event.target.value, topicError: "" } })}
              maxLength={80}
              disabled={state.generatingTopic}
              placeholder={text.topicPlaceholder}
              className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
            />
          </>
        ) : null}

        {state.topicError ? <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{state.topicError}</p> : null}

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button type="button" onClick={() => dispatch({ type: "PATCH", patch: { setupOpen: false } })} disabled={state.generatingTopic} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            {text.manualPrompt}
          </button>
          <button type="button" onClick={() => void generateSpeakingTopic()} disabled={state.generatingTopic} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-slate-300">
            {state.generatingTopic ? text.generatingTopic : text.generateTopic}
          </button>
        </div>
      </section>
    </ModalDialog>
  );
}

function TopicModeButton({ active, title, description, disabled, onClick }: { active: boolean; title: string; description: string; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl border p-4 text-left ${active ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100" : "border-slate-200 hover:bg-slate-50"}`}
    >
      <span className="block text-sm font-bold text-slate-900">{title}</span>
      <span className="mt-1 block text-xs text-slate-600">{description}</span>
    </button>
  );
}

function FeedbackBlock({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-bold text-slate-950">{title}</h2>
      <ul className="mt-4 space-y-2 text-sm text-slate-700">
        {items.map((item) => <li key={item}>- {item}</li>)}
      </ul>
    </section>
  );
}
