"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

type ExamType = "IELTS" | "HSK";
type TurnRole = "ai" | "student";

type ConversationTurn = {
  role: TurnRole;
  text: string;
  timestamp: string;
};

type SpeakingResult = {
  assessmentId: string;
  audioUrl: string | null;
  points?: { spent: number; available: number };
  streak?: number;
  data: {
    evaluation: {
      scores: Record<string, number>;
      overall: number;
      normalizedOverall?: number;
      taskRelevance?: number;
      language: string;
      exam?: "IELTS" | "HSK";
      scoreScale?: "BAND_0_9" | "SCORE_0_100";
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

declare global {
  interface Window {
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
    SpeechRecognition?: SpeechRecognitionConstructor;
  }
}

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0: { transcript: string };
};

type SpeechRecognitionEventLike = Event & {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
};

type SpeechRecognitionErrorEventLike = Event & {
  error: string;
};

type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

const EXAM_DEFAULT_PROMPTS: Record<ExamType, string> = {
  IELTS:
    "Describe a memorable trip you took. You should say where you went, who you went with, what happened, and explain why it was memorable.",
  HSK: "Please answer in Chinese: describe one memorable experience and explain why it was important.",
};

function formatClock(totalSeconds: number) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function toDisplayCriterionName(key: string) {
  return key.replace(/_/g, " ").replace(/([A-Z])/g, " $1").trim();
}

function nowIso() {
  return new Date().toISOString();
}

export default function SpeakingAiPage() {
  const [configLoading, setConfigLoading] = useState(true);
  const [userRole, setUserRole] = useState("");
  const [examType, setExamType] = useState<ExamType>("IELTS");
  const [durationSeconds, setDurationSeconds] = useState(180);
  const [prompt, setPrompt] = useState(EXAM_DEFAULT_PROMPTS.IELTS);
  const [timeLeft, setTimeLeft] = useState(180);
  const [sessionRunning, setSessionRunning] = useState(false);
  const [transcriptDraft, setTranscriptDraft] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [conversation, setConversation] = useState<ConversationTurn[]>([]);
  const [recording, setRecording] = useState(false);
  const [recognitionEnabled, setRecognitionEnabled] = useState(false);
  const [preparingSession, setPreparingSession] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioPreview, setAudioPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [requestingQuestion, setRequestingQuestion] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SpeakingResult | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioBlobRef = useRef<Blob | null>(null);
  const audioPreviewRef = useRef("");
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const keepRecognitionAliveRef = useRef(false);
  const transcriptDraftRef = useRef("");
  const interimTranscriptRef = useRef("");
  const submittingRef = useRef(false);
  const finishAndSubmitRef = useRef<(autoSubmit: boolean) => Promise<void>>(async () => undefined);

  const spentSeconds = useMemo(() => Math.max(0, durationSeconds - timeLeft), [durationSeconds, timeLeft]);
  const currentTurnTranscript = `${transcriptDraft} ${interimTranscript}`.trim();

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
          setError(data.error || "Khong tai duoc cau hinh speaking.");
          return;
        }

        const nextExam = data.examType === "HSK" ? "HSK" : "IELTS";
        const nextDuration = Number.isFinite(Number(data.durationSeconds))
          ? Math.max(30, Math.min(900, Math.round(Number(data.durationSeconds))))
          : 180;

        setExamType(nextExam);
        setUserRole(data.role || "");
        setDurationSeconds(nextDuration);
        setTimeLeft(nextDuration);
        setPrompt(EXAM_DEFAULT_PROMPTS[nextExam]);
      } catch {
        setError("Khong tai duoc cau hinh speaking.");
      } finally {
        setConfigLoading(false);
      }
    }

    void loadSpeakingConfig();
  }, []);

  useEffect(() => {
    if (!sessionRunning) return;
    if (timeLeft <= 0) {
      void finishAndSubmitRef.current(true);
      return;
    }

    const timer = window.setTimeout(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [sessionRunning, timeLeft]);

  useEffect(() => {
    return () => {
      stopSpeechRecognition();
      stopAudioCapture();
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
      setError("Khong mo duoc micro de ghi am.");
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

  function resolveSpeechRecognitionConstructor() {
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }

  function speechLangForExam(exam: ExamType) {
    return exam === "HSK" ? "zh-CN" : "en-US";
  }

  function stopSpeechRecognition() {
    keepRecognitionAliveRef.current = false;
    const recognizer = recognitionRef.current;
    recognitionRef.current = null;
    if (recognizer) {
      recognizer.onend = null;
      try {
        recognizer.stop();
      } catch {
        // noop
      }
    }
    setRecognitionEnabled(false);
    setInterimTranscript("");
    interimTranscriptRef.current = "";
  }

  async function startSpeechRecognition() {
    const Constructor = resolveSpeechRecognitionConstructor();
    if (!Constructor) {
      setError("Trinh duyet chua ho tro SpeechRecognition. Hay dung Chrome/Edge de thi speaking.");
      return false;
    }

    const recognizer = new Constructor();
    recognizer.continuous = true;
    recognizer.interimResults = true;
    recognizer.lang = speechLangForExam(examType);

    recognizer.onresult = (event) => {
      let finalChunk = "";
      let interimChunk = "";

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcript = event.results[i][0]?.transcript || "";
        if (event.results[i].isFinal) {
          finalChunk += `${transcript} `;
        } else {
          interimChunk += transcript;
        }
      }

      if (finalChunk.trim()) {
        const nextTranscript = `${transcriptDraftRef.current}${transcriptDraftRef.current.endsWith(" ") || transcriptDraftRef.current.length === 0 ? "" : " "}${finalChunk.trim()} `;
        transcriptDraftRef.current = nextTranscript;
        setTranscriptDraft(nextTranscript);
      }
      interimTranscriptRef.current = interimChunk;
      setInterimTranscript(interimChunk);
    };

    recognizer.onerror = (event) => {
      if (event.error !== "no-speech") {
        setError(`SpeechRecognition loi: ${event.error}`);
      }
    };

    recognizer.onend = () => {
      if (keepRecognitionAliveRef.current) {
        try {
          recognizer.start();
        } catch {
          setRecognitionEnabled(false);
        }
      }
    };

    recognitionRef.current = recognizer;
    keepRecognitionAliveRef.current = true;
    return new Promise<boolean>((resolve) => {
      let settled = false;
      const finish = (ready: boolean) => {
        if (settled) return;
        settled = true;
        if (!ready) {
          keepRecognitionAliveRef.current = false;
          recognitionRef.current = null;
          recognizer.onend = null;
          try {
            recognizer.stop();
          } catch {
            // noop
          }
        }
        setRecognitionEnabled(ready);
        resolve(ready);
      };

      recognizer.onstart = () => finish(true);
      const originalErrorHandler = recognizer.onerror;
      recognizer.onerror = (event) => {
        originalErrorHandler?.(event);
        if (event.error === "not-allowed" || event.error === "service-not-allowed" || event.error === "audio-capture") {
          finish(false);
        }
      };

      try {
        recognizer.start();
        window.setTimeout(() => finish(false), 3000);
      } catch {
        finish(false);
      }
    });
  }

  async function requestFollowUpQuestion(history: ConversationTurn[]) {
    setRequestingQuestion(true);
    try {
      const response = await fetch("/api/ai/speaking-evaluation/live-turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          history: history.map((item) => ({
            role: item.role,
            text: item.text,
          })),
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { question?: string; error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Khong tao duoc cau hoi tiep theo.");
      }

      if (data.question) {
        setConversation((prev) => [...prev, { role: "ai", text: data.question!, timestamp: nowIso() }]);
      }
    } catch (questionError) {
      const fallback =
        examType === "HSK"
          ? "Please continue in Chinese and add one concrete example."
          : "Please continue your answer and add one specific example.";
      setConversation((prev) => [...prev, { role: "ai", text: fallback, timestamp: nowIso() }]);
      const message = questionError instanceof Error ? questionError.message : "Khong tao duoc cau hoi tiep theo.";
      setError(message);
    } finally {
      setRequestingQuestion(false);
    }
  }

  async function startSession() {
    if (configLoading || preparingSession) return;

    setError("");
    setResult(null);
    if (!prompt.trim()) {
      setError("Can nhap de bai cho speaking.");
      return;
    }

    if (audioPreviewRef.current) URL.revokeObjectURL(audioPreviewRef.current);
    audioPreviewRef.current = "";
    setAudioPreview("");
    setAudioBlob(null);
    audioBlobRef.current = null;
    setConversation([]);
    setTranscriptDraft("");
    setInterimTranscript("");
    transcriptDraftRef.current = "";
    interimTranscriptRef.current = "";
    setTimeLeft(durationSeconds);
    setPreparingSession(true);

    const audioReady = await startAudioCapture();
    if (!audioReady) {
      setPreparingSession(false);
      return;
    }

    const recognitionReady = await startSpeechRecognition();
    if (!recognitionReady) {
      stopAudioCapture();
      setPreparingSession(false);
      setError("Khong khoi dong duoc nhan dien giong noi. Hay kiem tra quyen micro va thu lai.");
      return;
    }

    setSessionRunning(true);
    setPreparingSession(false);

    const openingQuestion =
      examType === "HSK"
        ? "Please begin your response in Chinese based on the prompt."
        : "Please begin your response based on the prompt.";
    const firstTurn: ConversationTurn = { role: "ai", text: openingQuestion, timestamp: nowIso() };
    setConversation([firstTurn]);
    void requestFollowUpQuestion([firstTurn]);
  }

  async function submitCurrentTurn() {
    if (!sessionRunning || loading || requestingQuestion) return;

    const text = `${transcriptDraftRef.current} ${interimTranscriptRef.current}`.trim();
    if (!text) {
      setError("Chua co transcript cho luot tra loi nay.");
      return;
    }

    setError("");
    const nextHistory = [...conversation, { role: "student" as const, text, timestamp: nowIso() }];
    setConversation(nextHistory);
    setTranscriptDraft("");
    setInterimTranscript("");
    transcriptDraftRef.current = "";
    interimTranscriptRef.current = "";
    await requestFollowUpQuestion(nextHistory);
  }

  async function finishAndSubmit(autoSubmit: boolean) {
    if (!sessionRunning || submittingRef.current) return;
    submittingRef.current = true;

    const finalTranscript = `${transcriptDraftRef.current} ${interimTranscriptRef.current}`.trim();
    setSessionRunning(false);
    stopSpeechRecognition();
    await stopAudioCaptureAndWait();

    const finalTurns = [...conversation];
    if (finalTranscript) {
      finalTurns.push({ role: "student", text: finalTranscript, timestamp: nowIso() });
      setConversation(finalTurns);
      setTranscriptDraft("");
      setInterimTranscript("");
      transcriptDraftRef.current = "";
      interimTranscriptRef.current = "";
    }

    const studentTranscript = finalTurns
      .filter((item) => item.role === "student")
      .map((item) => item.text.trim())
      .filter(Boolean)
      .join("\n");

    if (!studentTranscript) {
      setError("Chua co noi dung noi de cham diem.");
      submittingRef.current = false;
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const form = new FormData();
      form.set("prompt", prompt);
      form.set("transcript", studentTranscript);
      form.set("conversation", JSON.stringify(finalTurns));
      form.set("durationSeconds", String(Math.max(1, spentSeconds || durationSeconds)));
      form.set("title", `Speaking AI - ${examType}`);
      const finalAudioBlob = audioBlobRef.current || audioBlob;
      if (finalAudioBlob) {
        form.set("audio", finalAudioBlob, "speaking.webm");
      }

      const response = await fetch("/api/ai/speaking-evaluation", {
        method: "POST",
        body: form,
      });
      const data = (await response.json().catch(() => ({}))) as SpeakingResult & { error?: string };

      if (!response.ok) {
        setError(data.error || "Khong cham duoc speaking.");
        return;
      }

      setResult(data);
      if (autoSubmit) {
        setError("Het thoi gian. He thong da tu dong nop va cham diem.");
      }
    } catch {
      setError("Khong cham duoc speaking.");
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  }

  finishAndSubmitRef.current = finishAndSubmit;
  const scoreMax = result?.data.evaluation.exam === "IELTS" ? 9 : 100;

  return (
    <main className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-6xl space-y-6 px-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
                Speaking AI - {userRole === "STUDENT" ? "7 points" : "mien phi cho giao vien/admin"}
              </p>
              <h1 className="mt-2 text-3xl font-bold text-slate-950">Speaking thi truc tiep voi AI</h1>
              <p className="mt-2 max-w-3xl text-slate-600">
                Ky thi va thoi gian duoc admin cau hinh co dinh. He thong tu dong ket thuc khi het gio va cham diem ngay.
              </p>
            </div>
            <Link href="/student/results" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
              Lich su ket qua
            </Link>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ky thi</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{examType === "HSK" ? "HSK (HSKK)" : "IELTS"}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Thoi gian</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{Math.round(durationSeconds / 60)} phut</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Trang thai</p>
              <p className="mt-2 text-sm text-slate-700">{recording ? "Dang ghi am" : "Chua ghi am"}</p>
              <p className="mt-1 text-sm text-slate-700">{recognitionEnabled ? "Nhan dien giong noi: Bat" : "Nhan dien giong noi: Tat"}</p>
            </div>
          </div>

          <label className="mt-4 block text-sm font-semibold text-slate-700">Speaking prompt</label>
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            rows={3}
            disabled={sessionRunning || preparingSession || loading || configLoading}
            className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
          />

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {!sessionRunning ? (
              <button
                type="button"
                onClick={() => void startSession()}
                disabled={loading || configLoading || preparingSession}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-300"
              >
                {preparingSession ? "Dang khoi dong micro..." : "Bat dau thi noi"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void finishAndSubmit(false)}
                disabled={loading}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-300"
              >
                Ket thuc va cham diem
              </button>
            )}

            <span
              className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                timeLeft <= 30 ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-700"
              }`}
            >
              {formatClock(timeLeft)}
            </span>

            {preparingSession ? <span className="text-sm text-slate-500">Hay doi den khi he thong bao san sang roi moi bat dau noi.</span> : null}
            {requestingQuestion ? <span className="text-sm text-slate-500">AI dang dat cau hoi tiep theo...</span> : null}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-bold text-slate-950">Hoi thoai truc tiep</h2>
          <div className="mt-4 max-h-80 space-y-3 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3">
            {conversation.length === 0 ? (
              <p className="text-sm text-slate-500">Chua co hoi thoai. Bam &quot;Bat dau thi noi&quot; de vao phong thi.</p>
            ) : (
              conversation.map((turn, index) => (
                <div
                  key={`${turn.timestamp}-${index}`}
                  className={`rounded-lg px-3 py-2 text-sm ${
                    turn.role === "ai" ? "bg-blue-50 text-blue-900" : "bg-white text-slate-900"
                  }`}
                >
                  <p className="text-xs font-bold uppercase tracking-wide opacity-70">{turn.role === "ai" ? "AI Examiner" : "Ban"}</p>
                  <p className="mt-1 whitespace-pre-wrap">{turn.text}</p>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Transcript luot hien tai</p>
            <p className="mt-2 min-h-16 whitespace-pre-wrap text-sm text-slate-800">{currentTurnTranscript || "He thong dang cho ban noi..."}</p>
            {interimTranscript ? <p className="mt-2 text-xs text-slate-500">Realtime: {interimTranscript}</p> : null}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void submitCurrentTurn()}
              disabled={!sessionRunning || loading || requestingQuestion || !currentTurnTranscript}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-300"
            >
              Ket thuc luot tra loi
            </button>
            <span className="text-sm text-slate-500">Sau khi bam, AI se dat cau hoi tiep theo.</span>
          </div>

          {audioPreview ? (
            <audio controls className="mt-4 w-full">
              <source src={audioPreview} />
            </audio>
          ) : null}
        </section>

        {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

        {result ? (
          <section className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-blue-600">
                    {result.data.evaluation.language} - {result.data.evaluation.band.system}
                  </p>
                  <h2 className="mt-1 text-2xl font-bold text-slate-950">Band/Level {result.data.evaluation.band.level}</h2>
                  <p className="mt-2 text-sm text-slate-600">{result.data.evaluation.summary}</p>
                  {result.data.evaluation.onTopic === false ? (
                    <p className="mt-2 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">
                      Cau tra loi bi lac de: {result.data.evaluation.offTopicReason || "Noi dung chua tra loi dung speaking prompt."}
                    </p>
                  ) : null}
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-5xl font-bold text-slate-950">{result.data.evaluation.overall.toFixed(1)}</p>
                  <p className="text-sm font-semibold text-slate-600">
                    / {scoreMax} (normalized {result.data.evaluation.normalizedOverall?.toFixed(1) ?? "-"}/10)
                  </p>
                  <p className="text-sm font-semibold text-red-600">
                    {userRole === "STUDENT" ? `-${result.points?.spent ?? 7} diem` : "Khong tru diem"}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    Bam de: {Math.round(result.data.evaluation.taskRelevance ?? 0)}/100
                  </p>
                </div>
              </div>
              <Link href={`/student/results/${result.assessmentId}`} className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
                Xem chi tiet da luu
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

            <FeedbackBlock title="Feedback chi tiet" items={result.data.analysis.feedback} />
            {result.data.evaluation.detailedComment ? (
              <section className="rounded-xl border border-blue-200 bg-blue-50 p-5">
                <h2 className="text-lg font-bold text-blue-950">Nhan xet tong hop</h2>
                <p className="mt-3 text-sm leading-6 text-blue-900">{result.data.evaluation.detailedComment}</p>
              </section>
            ) : null}
            <FeedbackBlock
              title="Phat am / grammar / tu vung / fluency"
              items={[
                ...result.data.mistakes.pronunciation,
                ...result.data.mistakes.grammar,
                ...result.data.mistakes.vocabulary,
                ...result.data.mistakes.fluency,
              ]}
            />
            <FeedbackBlock
              title="Phuong phap cai thien"
              items={[...result.data.analysis.suggestions, ...result.data.improvements.practiceMethods]}
            />
            {result.data.improvements.sampleAnswer ? (
              <section className="rounded-xl border border-slate-200 bg-white p-5">
                <h2 className="text-lg font-bold text-slate-950">Cau tra loi mau dung de</h2>
                <p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-700">
                  {result.data.improvements.sampleAnswer}
                </p>
              </section>
            ) : null}
          </section>
        ) : null}
      </div>
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
