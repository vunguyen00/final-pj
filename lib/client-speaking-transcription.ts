"use client";

type WorkerMessage = {
  type: "progress" | "transcribing" | "result" | "error";
  id?: number;
  progress?: number;
  text?: string;
  error?: string;
};

let sharedWorker: Worker | null = null;
let requestId = 0;
let transcriptionQueue: Promise<void> = Promise.resolve();

function getWorker() {
  if (!sharedWorker) {
    sharedWorker = new Worker(
      "/workers/speaking-transcription.worker.mjs",
      { type: "module" },
    );
  }
  return sharedWorker;
}

function whisperLanguage(languageCode: string) {
  const normalized = languageCode.toLowerCase();
  if (normalized.startsWith("zh")) return "chinese";
  if (normalized.startsWith("ja")) return "japanese";
  if (normalized.startsWith("ko")) return "korean";
  if (normalized.startsWith("vi")) return "vietnamese";
  return "english";
}

async function decodeAudio(blob: Blob) {
  const context = new AudioContext();
  try {
    const decoded = await context.decodeAudioData(await blob.arrayBuffer());
    const sampleRate = 16_000;
    const frames = Math.max(1, Math.ceil(decoded.duration * sampleRate));
    const offline = new OfflineAudioContext(1, frames, sampleRate);
    const source = offline.createBufferSource();
    source.buffer = decoded;
    source.connect(offline.destination);
    source.start();
    const rendered = await offline.startRendering();
    return new Float32Array(rendered.getChannelData(0));
  } finally {
    await context.close().catch(() => undefined);
  }
}

async function transcribe(
  blob: Blob,
  languageCode: string,
  onStatus?: (status: string) => void,
) {
  onStatus?.("Đang chuẩn bị audio...");
  const audio = await decodeAudio(blob);
  const worker = getWorker();
  const id = ++requestId;
  return new Promise<string>((resolve, reject) => {
    const onMessage = (event: MessageEvent<WorkerMessage>) => {
      const message = event.data;
      if (message.type === "progress") {
        onStatus?.(
          typeof message.progress === "number"
            ? `Đang tải bộ nhận dạng: ${Math.round(message.progress)}%`
            : "Đang chuẩn bị bộ nhận dạng...",
        );
        return;
      }
      if (message.id !== id) return;
      if (message.type === "transcribing") {
        onStatus?.("Đang chuyển audio thành văn bản...");
        return;
      }
      cleanup();
      if (message.type === "result") {
        const text = String(message.text || "").trim();
        if (text) resolve(text);
        else reject(new Error("Không nhận dạng được nội dung giọng nói."));
        return;
      }
      reject(new Error(message.error || "Không thể chuyển audio thành văn bản."));
    };
    const onError = () => {
      cleanup();
      sharedWorker?.terminate();
      sharedWorker = null;
      reject(new Error("Không thể khởi động bộ nhận dạng giọng nói."));
    };
    function cleanup() {
      worker.removeEventListener("message", onMessage);
      worker.removeEventListener("error", onError);
    }
    worker.addEventListener("message", onMessage);
    worker.addEventListener("error", onError);
    worker.postMessage(
      { id, audio: audio.buffer, language: whisperLanguage(languageCode) },
      [audio.buffer],
    );
  });
}

export function enqueueSpeakingTranscription(
  blob: Blob,
  languageCode: string,
  onStatus?: (status: string) => void,
) {
  const job = transcriptionQueue.then(
    () => transcribe(blob, languageCode, onStatus),
    () => transcribe(blob, languageCode, onStatus),
  );
  transcriptionQueue = job.then(() => undefined, () => undefined);
  return job;
}
