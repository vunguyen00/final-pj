"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SpeakingActivity } from "@/app/components/SpeakingAnswerInput";

export default function TeacherSpeakingRecorder({
  disabled,
  forceStop,
  activity,
  setActivity,
  initialUploaded = false,
  onAudioReady,
}: {
  disabled: boolean;
  forceStop: boolean;
  activity: SpeakingActivity;
  setActivity: (activity: SpeakingActivity) => void;
  initialUploaded?: boolean;
  onAudioReady: (blob: Blob) => Promise<void>;
}) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const previewUrlRef = useRef("");
  const finishingRef = useRef(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [uploaded, setUploaded] = useState(initialUploaded);
  const [pendingBlob, setPendingBlob] = useState<Blob | null>(null);
  const [error, setError] = useState("");

  const recording = activity === "recording";
  const uploading = activity === "transcribing";

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const uploadBlob = useCallback(async (blob: Blob) => {
    setActivity("transcribing");
    setError("");
    try {
      await onAudioReady(blob);
      setUploaded(true);
      setPendingBlob(null);
    } catch (uploadError) {
      setPendingBlob(blob);
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Không thể tải bản ghi lên server.",
      );
    } finally {
      setActivity("idle");
    }
  }, [onAudioReady, setActivity]);

  const finishRecording = useCallback(async () => {
    if (finishingRef.current) return;
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    finishingRef.current = true;
    try {
      const blob = await new Promise<Blob>((resolve) => {
        recorder.addEventListener(
          "stop",
          () => resolve(
            new Blob(chunksRef.current, {
              type: recorder.mimeType || "audio/webm",
            }),
          ),
          { once: true },
        );
        recorder.stop();
      });
      recorderRef.current = null;
      stopTracks();
      if (!blob.size) throw new Error("Bản ghi âm không có dữ liệu.");
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      const nextUrl = URL.createObjectURL(blob);
      previewUrlRef.current = nextUrl;
      setPreviewUrl(nextUrl);
      await uploadBlob(blob);
    } catch (recordingError) {
      setError(
        recordingError instanceof Error
          ? recordingError.message
          : "Không thể hoàn tất bản ghi.",
      );
      setActivity("idle");
    } finally {
      finishingRef.current = false;
      stopTracks();
    }
  }, [setActivity, stopTracks, uploadBlob]);

  useEffect(() => {
    if (forceStop && recording) void finishRecording();
  }, [finishRecording, forceStop, recording]);

  useEffect(() => () => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    stopTracks();
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  }, [stopTracks]);

  async function startRecording() {
    if (disabled || recording || uploading || uploaded) return;
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setError("Trình duyệt không hỗ trợ ghi âm.");
      return;
    }
    setActivity("preparing");
    setError("");
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
        () => setActivity("recording"),
        { once: true },
      );
      recorder.start(500);
    } catch {
      stopTracks();
      recorderRef.current = null;
      setActivity("idle");
      setError("Không thể truy cập microphone.");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {!recording ? (
          <button
            type="button"
            disabled={disabled || uploading || uploaded}
            onClick={() => void startRecording()}
            className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:bg-slate-300"
          >
            {uploaded
              ? "Audio đã lưu"
              : uploading
                ? "Đang tải audio..."
                : "Bắt đầu ghi âm"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void finishRecording()}
            className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white"
          >
            Dừng và lưu bản ghi
          </button>
        )}
        {pendingBlob && !uploading ? (
          <button
            type="button"
            onClick={() => {
              void uploadBlob(pendingBlob);
            }}
            className="rounded-lg border border-blue-300 px-3 py-2 text-sm font-semibold text-blue-700"
          >
            Tải lại bản ghi
          </button>
        ) : null}
      </div>
      {previewUrl ? <audio controls src={previewUrl} className="w-full max-w-xl" /> : null}
      {uploaded ? (
        <p className="rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
          Audio đã được server lưu. Bạn có thể chuyển câu; phần nhận dạng sẽ tiếp tục chạy nền.
        </p>
      ) : null}
      {error ? (
        <p className="rounded-lg bg-amber-50 p-3 text-sm font-semibold text-amber-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
