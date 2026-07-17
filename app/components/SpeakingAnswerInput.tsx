"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSpeakingRecordingLabels } from "@/lib/speaking-recording-labels";

type TranscriptionWorkerMessage = {
  type: "progress" | "transcribing" | "result" | "error";
  id?: number;
  progress?: number;
  text?: string;
  error?: string;
};

let sharedWorker: Worker | null = null;
let transcriptionRequestId = 0;

function getTranscriptionWorker() {
  if (!sharedWorker) {
    sharedWorker = new Worker(
      "/workers/speaking-transcription.worker.mjs",
      { type: "module" },
    );
  }
  return sharedWorker;
}

function whisperLanguageFromLocale(locale: string) {
  const normalized = locale.toLowerCase();
  if (normalized.startsWith("zh")) return "chinese";
  if (normalized.startsWith("ja")) return "japanese";
  if (normalized.startsWith("ko")) return "korean";
  if (normalized.startsWith("vi")) return "vietnamese";
  return "english";
}

async function decodeAudioToMono16Khz(blob: Blob) {
  const audioContext = new AudioContext();
  try {
    const decoded = await audioContext.decodeAudioData(await blob.arrayBuffer());
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

async function transcribeAudio(
  blob: Blob,
  languageLocale: string,
  onStatus: (status: string) => void,
  labels: ReturnType<typeof getSpeakingRecordingLabels>,
) {
  onStatus(labels.preparingRecording);
  const audio = await decodeAudioToMono16Khz(blob);
  const worker = getTranscriptionWorker();
  const requestId = ++transcriptionRequestId;

  return new Promise<string>((resolve, reject) => {
    const handleMessage = (
      event: MessageEvent<TranscriptionWorkerMessage>,
    ) => {
      const message = event.data;

      if (message.type === "progress") {
        const percent =
          typeof message.progress === "number"
            ? Math.round(message.progress)
            : null;
        onStatus(
          percent === null
            ? labels.preparingAnalyzer
            : labels.preparingAnalyzerProgress(percent),
        );
        return;
      }

      if (message.id !== requestId) return;

      if (message.type === "transcribing") {
        onStatus(labels.analyzingAudio);
        return;
      }

      cleanup();
      if (message.type === "result") {
        resolve(String(message.text || "").trim());
        return;
      }
      reject(
        new Error(
          message.error || labels.recognitionFailed,
        ),
      );
    };

    const handleWorkerError = () => {
      cleanup();
      sharedWorker?.terminate();
      sharedWorker = null;
      reject(
        new Error(
          labels.workerStartFailed,
        ),
      );
    };

    function cleanup() {
      worker.removeEventListener("message", handleMessage);
      worker.removeEventListener("error", handleWorkerError);
    }

    worker.addEventListener("message", handleMessage);
    worker.addEventListener("error", handleWorkerError);
    worker.postMessage(
      {
        id: requestId,
        audio: audio.buffer,
        language: whisperLanguageFromLocale(languageLocale),
      },
      [audio.buffer],
    );
  });
}

export function SpeakingAnswerInput({
  value,
  onChange,
  languageLocale,
  languageCode,
  disabled = false,
  forceStop = false,
  onBusyChange,
}: {
  value: string;
  onChange: (value: string) => void;
  languageLocale: string;
  languageCode?: string | null;
  disabled?: boolean;
  forceStop?: boolean;
  onBusyChange?: (busy: boolean) => void;
}) {
  const labels = getSpeakingRecordingLabels(languageCode || languageLocale);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const previewUrlRef = useRef("");
  const finishingRef = useRef(false);

  const [recording, setRecording] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [hasCompletedRecording, setHasCompletedRecording] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [status, setStatus] = useState("");
  const [supportError, setSupportError] = useState("");

  useEffect(() => {
    onBusyChange?.(recording || preparing || transcribing);
  }, [onBusyChange, preparing, recording, transcribing]);

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const finishRecording = useCallback(async () => {
    if (finishingRef.current || transcribing) return;
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      setRecording(false);
      stopTracks();
      return;
    }

    finishingRef.current = true;
    setRecording(false);
    setTranscribing(true);
    setSupportError("");

    try {
      const blob = await new Promise<Blob>((resolve) => {
        recorder.addEventListener(
          "stop",
          () => {
            resolve(
              new Blob(chunksRef.current, {
                type: recorder.mimeType || "audio/webm",
              }),
            );
          },
          { once: true },
        );
        recorder.stop();
      });

      recorderRef.current = null;
      stopTracks();

      if (!blob.size) {
        throw new Error(labels.emptyRecording);
      }

      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
      const nextPreviewUrl = URL.createObjectURL(blob);
      previewUrlRef.current = nextPreviewUrl;
      setPreviewUrl(nextPreviewUrl);

      const transcript = await transcribeAudio(
        blob,
        languageLocale,
        setStatus,
        labels,
      );
      if (!transcript) {
        throw new Error(labels.noSpeech);
      }

      onChange(transcript);
      setHasCompletedRecording(true);
      setStatus(labels.completedRecording);
    } catch (error) {
      setSupportError(
        error instanceof Error
          ? error.message
          : labels.processFailed,
      );
      setStatus("");
    } finally {
      setTranscribing(false);
      finishingRef.current = false;
      stopTracks();
    }
  }, [labels, languageLocale, onChange, stopTracks, transcribing]);

  useEffect(() => {
    if (forceStop && recording) {
      void finishRecording();
    }
  }, [finishRecording, forceStop, recording]);

  useEffect(() => {
    return () => {
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.stop();
      }
      stopTracks();
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, [stopTracks]);

  async function startRecording() {
    if (disabled || preparing || transcribing || recording) return;
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setSupportError(
        labels.unsupportedBrowser,
      );
      return;
    }

    setPreparing(true);
    setSupportError("");
    setStatus("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      });
      recorder.addEventListener(
        "start",
        () => {
          setPreparing(false);
          setRecording(true);
        },
        { once: true },
      );

      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = "";
        setPreviewUrl("");
      }
      if (hasCompletedRecording || value.trim()) {
        setHasCompletedRecording(false);
        onChange("");
      }

      recorder.start(500);
    } catch {
      stopTracks();
      recorderRef.current = null;
      setPreparing(false);
      setSupportError(
        labels.microphoneDenied,
      );
    }
  }

  const busy = recording || preparing || transcribing;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {!recording ? (
          <button
            type="button"
            onClick={() => void startRecording()}
            disabled={disabled || preparing || transcribing}
            className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:bg-slate-300"
          >
            {preparing
              ? labels.startingMic
              : transcribing
                ? labels.analyzingAudio
                : hasCompletedRecording
                  ? labels.recordAgain
                  : labels.startRecording}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void finishRecording()}
            disabled={disabled}
            className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white disabled:bg-slate-300"
          >
            {labels.stopAndAnalyze}
          </button>
        )}
        <span
          className={`rounded-lg px-3 py-2 text-xs font-semibold ${
            busy
              ? "bg-emerald-100 text-emerald-700"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          {recording
            ? labels.recording
            : transcribing
              ? labels.analyzingAudio
              : hasCompletedRecording
                ? labels.analyzed
                : labels.ready}
        </span>
      </div>

      {previewUrl ? (
        <audio controls src={previewUrl} className="w-full max-w-xl" />
      ) : null}
      {status ? (
        <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
          {status}
        </p>
      ) : null}
      {supportError ? (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
          {supportError}
        </p>
      ) : null}
    </div>
  );
}
