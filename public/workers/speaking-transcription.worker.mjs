import { pipeline } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0/dist/transformers.min.js";

let transcriberPromise = null;

function progressMessage(value) {
  if (!value || typeof value !== "object") return;

  self.postMessage({
    type: "progress",
    status: String(value.status || "loading"),
    progress:
      typeof value.progress === "number" ? value.progress : undefined,
    file: typeof value.file === "string" ? value.file : undefined,
  });
}

async function createTranscriber() {
  try {
    return await pipeline(
      "automatic-speech-recognition",
      "onnx-community/whisper-base",
      {
        device: "wasm",
        dtype: {
          encoder_model: "fp32",
          decoder_model_merged: "q4",
        },
        progress_callback: progressMessage,
      },
    );
  } catch (error) {
    self.postMessage({
      type: "progress",
      status: "fallback-fp32",
    });
    console.warn(
      "Quantized Whisper model failed. Retrying with fp32.",
      error,
    );
    return pipeline(
      "automatic-speech-recognition",
      "onnx-community/whisper-base",
      {
        device: "wasm",
        dtype: "fp32",
        progress_callback: progressMessage,
      },
    );
  }
}

function getTranscriber() {
  if (!transcriberPromise) {
    transcriberPromise = createTranscriber().catch((error) => {
      transcriberPromise = null;
      throw error;
    });
  }

  return transcriberPromise;
}

self.onmessage = async (event) => {
  const { id, audio, language } = event.data;

  try {
    const transcriber = await getTranscriber();
    self.postMessage({ type: "transcribing", id });
    const result = await transcriber(new Float32Array(audio), {
      language,
      task: "transcribe",
      chunk_length_s: 29,
      stride_length_s: 5,
    });
    const text = String(result.text || "").replace(/\s+/g, " ").trim();

    self.postMessage({ type: "result", id, text });
  } catch (error) {
    self.postMessage({
      type: "error",
      id,
      error:
        error instanceof Error
          ? error.message
          : "Không thể chuyển audio thành văn bản.",
    });
  }
};
