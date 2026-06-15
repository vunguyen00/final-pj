"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { IeltsEvaluationResult } from "@/app/components/IeltsEvaluationResult";
import type { IeltsSpeakingEvaluation } from "@/lib/ielts-rubric";
import {
  getDefaultSpeakingPrompt,
  getSpeakingLanguageFromExamSetting,
  getSpeakingLanguageLabel,
  getSpeakingTaskOptions,
  getSpeakingWhisperLanguage,
  normalizeSpeakingLanguage,
  SPEAKING_LANGUAGES,
  type SpeakingLanguage,
  type SpeakingTask,
} from "@/lib/speaking-languages";

type SpeakingResult = {
  assessmentId: string;
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
      maxScore?: number;
      scoreScale?: string;
      band: { system: string; level: string; score: number; rationale: string };
      summary: string;
      onTopic?: boolean;
      offTopicReason?: string;
      detailedComment?: string;
    };
    analysis: {
      strengths: string[];
      weaknesses: string[];
      feedback: string[];
      suggestions: string[];
    };
    mistakes: {
      pronunciation: string[];
      grammar: string[];
      vocabulary: string[];
      fluency: string[];
    };
    improvements: {
      practiceMethods: string[];
      sampleAnswer?: string;
    };
  };
};

type TranscriptionWorkerMessage = {
  type: "progress" | "transcribing" | "result" | "error";
  id?: number;
  status?: string;
  progress?: number;
  file?: string;
  text?: string;
  error?: string;
};

function formatClock(totalSeconds: number) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function toDisplayCriterionName(key: string) {
  const labels: Record<string, string> = {
    fluency: "Độ trôi chảy",
    fluencyCoherence: "Độ trôi chảy và mạch lạc",
    pronunciation: "Phát âm",
    grammar: "Ngữ pháp",
    grammarRangeAccuracy: "Ngữ pháp và độ chính xác",
    vocabulary: "Từ vựng",
    lexicalResource: "Vốn từ vựng",
    taskResponse: "Mức độ đáp ứng đề bài",
    taskRelevance: "Độ bám đề",
  };
  return labels[key] || key.replace(/_/g, " ").replace(/([A-Z])/g, " $1").trim();
}

export default function SpeakingAiPage() {
  const [configLoading, setConfigLoading] = useState(true);
  const [userRole, setUserRole] = useState("");
  const [speakingLanguage, setSpeakingLanguage] =
    useState<SpeakingLanguage>("ENGLISH");
  const [durationSeconds, setDurationSeconds] = useState(180);
  const [prompt, setPrompt] = useState(getDefaultSpeakingPrompt("ENGLISH"));
  const [timeLeft, setTimeLeft] = useState(180);
  const [sessionRunning, setSessionRunning] = useState(false);
  const [transcriptDraft, setTranscriptDraft] = useState("");
  const [recording, setRecording] = useState(false);
  const [preparingSession, setPreparingSession] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioPreview, setAudioPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitAction, setSubmitAction] = useState<
    "score" | "feedback" | null
  >(null);
  const [transcribing, setTranscribing] = useState(false);
  const [transcriptionStatus, setTranscriptionStatus] = useState("");
  const [setupOpen, setSetupOpen] = useState(true);
  const [speakingPart, setSpeakingPart] = useState<SpeakingTask>(2);
  const [topicMode, setTopicMode] = useState<"custom" | "random">("custom");
  const [topicInput, setTopicInput] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("");
  const [generatingTopic, setGeneratingTopic] = useState(false);
  const [topicError, setTopicError] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<SpeakingResult | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioBlobRef = useRef<Blob | null>(null);
  const audioPreviewRef = useRef("");
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const transcriptionWorkerRef = useRef<Worker | null>(null);
  const transcriptionRequestIdRef = useRef(0);
  const transcriptDraftRef = useRef("");
  const submittingRef = useRef(false);
  const finishAndSubmitRef = useRef<
    (autoSubmit: boolean, includeAiFeedback?: boolean) => Promise<void>
  >(async () => undefined);

  const spentSeconds = useMemo(() => Math.max(0, durationSeconds - timeLeft), [durationSeconds, timeLeft]);
  const currentTurnTranscript = transcriptDraft.trim();
  const speakingTaskOptions = useMemo(
    () => getSpeakingTaskOptions(speakingLanguage),
    [speakingLanguage],
  );

  useEffect(() => {
    async function loadSpeakingConfig() {
      setConfigLoading(true);
      try {
        const response = await fetch("/api/ai/speaking-evaluation/config", { cache: "no-store" });
        const data = (await response.json().catch(() => ({}))) as {
          examType?: string;
          durationSeconds?: number;
          role?: string;
          error?: string;
        };

        if (!response.ok) {
          setError(data.error || "Không tải được cấu hình Speaking AI.");
          return;
        }

        const nextLanguage = getSpeakingLanguageFromExamSetting(data.examType);
        const nextDuration = Number.isFinite(Number(data.durationSeconds))
          ? Math.max(30, Math.min(900, Math.round(Number(data.durationSeconds))))
          : 180;

        setSpeakingLanguage(nextLanguage);
        setUserRole(data.role || "");
        setDurationSeconds(nextDuration);
        setTimeLeft(nextDuration);
        setPrompt(getDefaultSpeakingPrompt(nextLanguage));
      } catch {
        setError("Không tải được cấu hình Speaking AI.");
      } finally {
        setConfigLoading(false);
      }
    }

    void loadSpeakingConfig();
  }, []);

  useEffect(() => {
    if (!sessionRunning) return;
    if (timeLeft <= 0) {
      void finishAndSubmitRef.current(true, false);
      return;
    }

    const timer = window.setTimeout(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [sessionRunning, timeLeft]);

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
        setAudioBlob(blob);
        if (audioPreviewRef.current) URL.revokeObjectURL(audioPreviewRef.current);
        const previewUrl = URL.createObjectURL(blob);
        audioPreviewRef.current = previewUrl;
        setAudioPreview(previewUrl);
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      };
      recorderRef.current = recorder;
      recorder.start(500);
      setRecording(true);
      return true;
    } catch {
      setError("Không mở được micro để ghi âm.");
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
    setRecording(false);
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
    setRecording(false);
  }

  async function decodeAudioToMono16Khz(blob: Blob) {
    const audioContext = new AudioContext();
    try {
      const decoded = await audioContext.decodeAudioData(
        await blob.arrayBuffer(),
      );
      const targetSampleRate = 16000;
      const frameCount = Math.max(
        1,
        Math.ceil(decoded.duration * targetSampleRate),
      );
      const offlineContext = new OfflineAudioContext(
        1,
        frameCount,
        targetSampleRate,
      );
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

  function getTranscriptionWorker() {
    if (!transcriptionWorkerRef.current) {
      transcriptionWorkerRef.current = new Worker(
        "/workers/speaking-transcription.worker.mjs",
        { type: "module" },
      );
    }
    return transcriptionWorkerRef.current;
  }

  async function transcribeRecordedAudio(blob: Blob) {
    setTranscribing(true);
    setTranscriptionStatus(
      "Đang chuẩn bị và phân tích bản ghi âm...",
    );

    try {
      const audio = await decodeAudioToMono16Khz(blob);
      const worker = getTranscriptionWorker();
      const requestId = ++transcriptionRequestIdRef.current;

      return await new Promise<string>((resolve, reject) => {
        const handleMessage = (
          event: MessageEvent<TranscriptionWorkerMessage>,
        ) => {
          const message = event.data;

          if (message.type === "progress") {
            const percent =
              typeof message.progress === "number"
                ? Math.round(message.progress)
                : null;
            setTranscriptionStatus(
              percent !== null
                ? `Đang chuẩn bị bộ phân tích âm thanh: ${percent}%`
                : "Đang chuẩn bị bộ phân tích âm thanh...",
            );
            return;
          }

          if (message.id !== requestId) return;

          if (message.type === "transcribing") {
            setTranscriptionStatus(
              "Hệ thống đang phân tích toàn bộ bản ghi âm...",
            );
            return;
          }

          worker.removeEventListener("message", handleMessage);
          worker.removeEventListener("error", handleWorkerError);

          if (message.type === "result") {
            resolve(String(message.text || "").trim());
            return;
          }

          reject(
            new Error(
              message.error || "Không thể chuyển audio thành văn bản.",
            ),
          );
        };
        const handleWorkerError = () => {
          worker.removeEventListener("message", handleMessage);
          worker.removeEventListener("error", handleWorkerError);
          reject(
            new Error(
              "Không thể khởi động bộ phân tích âm thanh trên trình duyệt này.",
            ),
          );
        };

        worker.addEventListener("message", handleMessage);
        worker.addEventListener("error", handleWorkerError);
        worker.postMessage(
          {
            id: requestId,
            audio: audio.buffer,
            language: getSpeakingWhisperLanguage(speakingLanguage),
          },
          [audio.buffer],
        );
      });
    } finally {
      setTranscribing(false);
      setTranscriptionStatus("");
    }
  }

  async function generateSpeakingTopic() {
    const customTopic = topicInput.trim();
    if (topicMode === "custom" && !customTopic) {
      setTopicError("Hãy nhập topic hoặc chọn chế độ đề ngẫu nhiên.");
      return;
    }

    setGeneratingTopic(true);
    setTopicError("");
    try {
      const response = await fetch("/api/ai/speaking-evaluation/topic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: speakingLanguage,
          task: speakingPart,
          topic: topicMode === "custom" ? customTopic : "",
          randomTopic: topicMode === "random",
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        topic?: string;
        prompt?: string;
        error?: string;
      };

      if (!response.ok || !data.prompt) {
        setTopicError(data.error || "Không tạo được đề Speaking.");
        return;
      }

      setPrompt(data.prompt);
      setSelectedTopic(data.topic || customTopic || "Random");
      setResult(null);
      setError("");
      setSetupOpen(false);
    } catch {
      setTopicError("Không tạo được đề Speaking. Vui lòng thử lại.");
    } finally {
      setGeneratingTopic(false);
    }
  }

  async function startSession() {
    if (configLoading || preparingSession) return;

    setError("");
    setResult(null);
    if (!prompt.trim()) {
      setError("Cần nhập đề bài cho phần thi nói.");
      return;
    }

    if (audioPreviewRef.current) URL.revokeObjectURL(audioPreviewRef.current);
    audioPreviewRef.current = "";
    setAudioPreview("");
    setAudioBlob(null);
    audioBlobRef.current = null;
    setTranscriptDraft("");
    transcriptDraftRef.current = "";
    setTranscriptionStatus("");
    setTimeLeft(durationSeconds);
    setPreparingSession(true);

    const audioReady = await startAudioCapture();
    if (!audioReady) {
      setPreparingSession(false);
      return;
    }

    setSessionRunning(true);
    setPreparingSession(false);
  }

  async function finishAndSubmit(
    autoSubmit: boolean,
    includeAiFeedback = false,
  ) {
    if (!sessionRunning || submittingRef.current) return;
    submittingRef.current = true;

    setSessionRunning(false);
    await stopAudioCaptureAndWait();

    setLoading(true);
    setSubmitAction(includeAiFeedback ? "feedback" : "score");
    setError("");
    setResult(null);

    try {
      const finalAudioBlob = audioBlobRef.current || audioBlob;
      if (!finalAudioBlob || finalAudioBlob.size === 0) {
        setError("Không tìm thấy bản ghi âm để chuyển thành văn bản.");
        return;
      }

      const studentTranscript = await transcribeRecordedAudio(finalAudioBlob);
      if (!studentTranscript) {
        setError(
          "Hệ thống không nhận diện được nội dung nói. Hãy kiểm tra bản ghi âm và thử lại.",
        );
        return;
      }
      transcriptDraftRef.current = studentTranscript;
      setTranscriptDraft(studentTranscript);

      const form = new FormData();
      form.set("prompt", prompt);
      form.set("transcript", studentTranscript);
      form.set("conversation", "[]");
      form.set("transcriptionSource", "whisper-browser");
      form.set("includeAiFeedback", String(includeAiFeedback));
      form.set("language", speakingLanguage);
      form.set("durationSeconds", String(Math.max(1, spentSeconds || durationSeconds)));
      form.set(
        "title",
        `Speaking AI - ${getSpeakingLanguageLabel(speakingLanguage)}`,
      );
      const courseId = new URLSearchParams(window.location.search).get(
        "courseId",
      );
      if (courseId) form.set("courseId", courseId);
      form.set("audio", finalAudioBlob, "speaking.webm");

      const response = await fetch("/api/ai/speaking-evaluation", {
        method: "POST",
        body: form,
      });
      const data = (await response.json().catch(() => ({}))) as SpeakingResult & { error?: string };

      if (!response.ok) {
        setError(data.error || "Không chấm được bài nói.");
        return;
      }

      setResult(data);
      if (autoSubmit) {
        setError("Hết thời gian. Hệ thống đã tự động nộp và chấm điểm.");
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Không chấm được bài nói.",
      );
    } finally {
      setLoading(false);
      setSubmitAction(null);
      submittingRef.current = false;
    }
  }

  useEffect(() => {
    finishAndSubmitRef.current = finishAndSubmit;
  });

  const scoreMax =
    result?.data.evaluation.maxScore ??
    (result?.data.evaluation.exam === "IELTS"
      ? 9
      : result?.data.evaluation.exam === "HSK"
        ? 100
        : 10);
  const scoreOnly = Boolean(result?.scoreOnly || result?.data.scoreOnly);

  return (
    <main className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-6xl space-y-6 px-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
                Chấm điểm miễn phí · Nhận xét AI{" "}
                {userRole === "STUDENT"
                  ? "-7 điểm"
                  : "miễn phí cho giảng viên và quản trị viên"}
              </p>
              <h1 className="mt-2 text-3xl font-bold text-slate-950">Luyện nói và chấm điểm bằng AI</h1>
              <p className="mt-2 max-w-3xl text-slate-600">
                Hệ thống ghi lại toàn bộ phần nói và phân tích âm thanh sau khi
                kết thúc. Chấm điểm không mất phí; nhận xét chi tiết là tính
                năng trả phí.
              </p>
            </div>
            <Link href="/student/results" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
              Lịch sử kết quả
            </Link>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ngôn ngữ</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {getSpeakingLanguageLabel(speakingLanguage)}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Thời gian</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{Math.round(durationSeconds / 60)} phút</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Trạng thái</p>
              <p className="mt-2 text-sm text-slate-700">{recording ? "Đang ghi âm" : "Chưa ghi âm"}</p>
              <p className="mt-1 text-sm text-slate-700">
                {transcribing
                  ? "Đang phân tích âm thanh"
                  : transcriptDraft
                    ? "Đã phân tích xong bản ghi"
                    : "Âm thanh sẽ được phân tích sau khi kết thúc"}
              </p>
            </div>
          </div>

          <label className="mt-4 block text-sm font-semibold text-slate-700">Đề bài nói</label>
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            rows={3}
            disabled={sessionRunning || preparingSession || loading || configLoading}
            className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              Speaking Task {speakingPart}
            </span>
            {selectedTopic ? (
              <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                Topic: {selectedTopic}
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => setSetupOpen(true)}
              disabled={sessionRunning || preparingSession || loading}
              className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Chọn đề khác
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {!sessionRunning ? (
              <button
                type="button"
                onClick={() => void startSession()}
                disabled={loading || configLoading || preparingSession}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-300"
              >
                {transcribing
                  ? "Đang phân tích âm thanh..."
                  : loading
                    ? submitAction === "feedback"
                      ? "AI đang nhận xét..."
                      : "AI đang chấm điểm..."
                    : preparingSession
                      ? "Đang khởi động micro..."
                      : "Bắt đầu thi nói"}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => void finishAndSubmit(false, false)}
                  disabled={loading}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-300"
                >
                  Kết thúc và chấm điểm miễn phí
                </button>
                <button
                  type="button"
                  onClick={() => void finishAndSubmit(false, true)}
                  disabled={loading}
                  className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-300"
                >
                  Kết thúc và nhận xét AI
                  {userRole === "STUDENT" ? " (-7 điểm)" : ""}
                </button>
              </>
            )}

            <span
              className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                timeLeft <= 30 ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-700"
              }`}
            >
              {formatClock(timeLeft)}
            </span>

            {preparingSession ? <span className="text-sm text-slate-500">Hãy đợi đến khi hệ thống báo sẵn sàng rồi mới bắt đầu nói.</span> : null}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-bold text-slate-950">
            Bản ghi và nội dung nhận diện
          </h2>
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Văn bản được tạo từ audio
            </p>
            <p className="mt-2 min-h-16 whitespace-pre-wrap text-sm text-slate-800">
              {currentTurnTranscript ||
                (recording
                  ? "Đang ghi âm. Nội dung sẽ được nhận diện sau khi bạn kết thúc."
                  : "Chưa có nội dung nhận diện. Bấm bắt đầu để ghi âm phần trả lời.")}
            </p>
          </div>

          {audioPreview ? (
            <audio controls className="mt-4 w-full">
              <source src={audioPreview} />
            </audio>
          ) : null}
        </section>

        {transcriptionStatus ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            {transcriptionStatus}
          </p>
        ) : null}

        {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

        {result?.data.ielts ? (
          <section className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-red-600">
                {scoreOnly
                  ? "Chấm điểm miễn phí · Không trừ điểm"
                  : userRole === "STUDENT"
                    ? `Nhận xét AI · -${result.points?.spent ?? 7} điểm`
                    : "Nhận xét AI · Không trừ điểm"}
              </p>
              <Link
                href={`/student/results/${result.assessmentId}`}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
              >
                Xem chi tiết đã lưu
              </Link>
            </div>
            <IeltsEvaluationResult
              evaluation={result.data.ielts}
              scoreOnly={scoreOnly}
            />
          </section>
        ) : null}

        {result && !result.data.ielts ? (
          <section className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-blue-600">
                    {result.data.evaluation.language} - {result.data.evaluation.band.system}
                  </p>
                  <h2 className="mt-1 text-2xl font-bold text-slate-950">Cấp độ {result.data.evaluation.band.level}</h2>
                  {scoreOnly ? (
                    <p className="mt-2 text-sm text-slate-600">
                      Lần chấm này chỉ trả về điểm số, không bao gồm nhận xét chi tiết.
                    </p>
                  ) : (
                    <p className="mt-2 text-sm text-slate-600">{result.data.evaluation.summary}</p>
                  )}
                  {!scoreOnly && result.data.evaluation.onTopic === false ? (
                    <p className="mt-2 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">
                      Câu trả lời bị lạc đề: {result.data.evaluation.offTopicReason || "Nội dung chưa trả lời đúng yêu cầu của đề nói."}
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
                      ? "Chấm điểm miễn phí · Không trừ điểm"
                      : userRole === "STUDENT"
                        ? `Nhận xét AI · -${result.points?.spent ?? 7} điểm`
                        : "Nhận xét AI · Không trừ điểm"}
                  </p>
                  {!scoreOnly ? (
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      Bám đề: {Math.round(result.data.evaluation.taskRelevance ?? 0)}/100
                    </p>
                  ) : null}
                </div>
              </div>
              <Link href={`/student/results/${result.assessmentId}`} className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
                Xem chi tiết đã lưu
              </Link>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              {Object.entries(result.data.evaluation.scores).map(([key, value]) => (
                <div key={key} className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-sm capitalize text-slate-500">{toDisplayCriterionName(key)}</p>
                  <p className="mt-2 text-2xl font-bold text-slate-950">{Number(value).toFixed(1)}</p>
                </div>
              ))}
            </div>

            {!scoreOnly ? (
              <>
                <FeedbackBlock title="Phản hồi chi tiết" items={result.data.analysis.feedback} />
                {result.data.evaluation.detailedComment ? (
              <section className="rounded-xl border border-blue-200 bg-blue-50 p-5">
                <h2 className="text-lg font-bold text-blue-950">Nhận xét tổng hợp</h2>
                <p className="mt-3 text-sm leading-6 text-blue-900">{result.data.evaluation.detailedComment}</p>
              </section>
                ) : null}
                <FeedbackBlock
                  title="Phát âm, ngữ pháp, từ vựng và độ trôi chảy"
                  items={[
                    ...result.data.mistakes.pronunciation,
                    ...result.data.mistakes.grammar,
                    ...result.data.mistakes.vocabulary,
                    ...result.data.mistakes.fluency,
                  ]}
                />
                <FeedbackBlock
                  title="Phương pháp cải thiện"
                  items={[...result.data.analysis.suggestions, ...result.data.improvements.practiceMethods]}
                />
                {result.data.improvements.sampleAnswer ? (
                  <section className="rounded-xl border border-slate-200 bg-white p-5">
                    <h2 className="text-lg font-bold text-slate-950">Câu trả lời mẫu đúng đề</h2>
                    <p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-700">
                      {result.data.improvements.sampleAnswer}
                    </p>
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
            aria-labelledby="speaking-setup-title"
            className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
          >
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
              Tạo đề Speaking bằng AI
            </p>
            <h2 id="speaking-setup-title" className="mt-2 text-2xl font-bold text-slate-950">
              Bạn muốn luyện topic nào?
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Chọn ngôn ngữ, Speaking Task và nhập chủ đề, hoặc để AI chọn
              ngẫu nhiên một đề phù hợp.
            </p>

            <label className="mt-5 block text-sm font-semibold text-slate-700">
              Ngôn ngữ luyện nói
            </label>
            <select
              value={speakingLanguage}
              onChange={(event) => {
                const language = normalizeSpeakingLanguage(
                  event.target.value,
                );
                setSpeakingLanguage(language);
                setSpeakingPart(getSpeakingTaskOptions(language)[0].value);
                setPrompt(getDefaultSpeakingPrompt(language));
                setSelectedTopic("");
                setResult(null);
                setTopicError("");
              }}
              disabled={generatingTopic || configLoading}
              className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
            >
              {SPEAKING_LANGUAGES.map((language) => (
                <option key={language.value} value={language.value}>
                  {language.label}
                </option>
              ))}
            </select>

            <label className="mt-5 block text-sm font-semibold text-slate-700">
              Speaking Task
            </label>
            <select
              value={speakingPart}
              onChange={(event) =>
                setSpeakingPart(Number(event.target.value) as SpeakingTask)
              }
              disabled={generatingTopic || configLoading}
              className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
            >
              {speakingTaskOptions.map((task) => (
                <option key={task.value} value={task.value}>
                  {task.label}
                </option>
              ))}
            </select>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  setTopicMode("custom");
                  setTopicError("");
                }}
                disabled={generatingTopic}
                className={`rounded-xl border p-4 text-left ${
                  topicMode === "custom"
                    ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100"
                    : "border-slate-200 hover:bg-slate-50"
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
                  setTopicError("");
                }}
                disabled={generatingTopic}
                className={`rounded-xl border p-4 text-left ${
                  topicMode === "random"
                    ? "border-violet-500 bg-violet-50 ring-2 ring-violet-100"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <span className="block text-sm font-bold text-slate-900">
                  Random đề
                </span>
                <span className="mt-1 block text-xs text-slate-600">
                  AI tự chọn topic cho ngôn ngữ và Speaking Task đã chọn.
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
                    setTopicError("");
                  }}
                  maxLength={80}
                  disabled={generatingTopic}
                  placeholder="Ví dụ: giáo dục, công nghệ, du lịch..."
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                />
              </>
            ) : null}

            {topicError ? (
              <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {topicError}
              </p>
            ) : null}

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setSetupOpen(false)}
                disabled={generatingTopic}
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Tự nhập đề
              </button>
              <button
                type="button"
                onClick={() => void generateSpeakingTopic()}
                disabled={generatingTopic || configLoading}
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-slate-300"
              >
                {generatingTopic ? "AI đang tạo đề..." : "Tạo đề bằng AI"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

function FeedbackBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-bold text-slate-950">{title}</h2>
      <ul className="mt-4 space-y-2 text-sm text-slate-700">
        {items.map((item, index) => (
          <li key={index}>- {item}</li>
        ))}
      </ul>
    </section>
  );
}
