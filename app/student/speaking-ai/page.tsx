"use client";

import { FormEvent, useRef, useState } from "react";
import Link from "next/link";

type SpeakingResult = {
  assessmentId: string;
  audioUrl: string | null;
  points?: { spent: number; available: number };
  streak?: number;
  data: {
    evaluation: {
      scores: Record<string, number>;
      overall: number;
      language: string;
      band: { system: string; level: string; score: number; rationale: string };
      summary: string;
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
    };
  };
};

export default function SpeakingAiPage() {
  const [prompt, setPrompt] = useState("Describe a memorable trip you took. You should say where you went, who you went with, what happened, and explain why it was memorable.");
  const [transcript, setTranscript] = useState("");
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioPreview, setAudioPreview] = useState("");
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SpeakingResult | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function startRecording() {
    setError("");
    setAudioBlob(null);
    setAudioPreview("");
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    const started = Date.now();
    chunksRef.current = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
      setAudioBlob(blob);
      setAudioPreview(URL.createObjectURL(blob));
      stream.getTracks().forEach((track) => track.stop());
      setDurationSeconds(Math.round((Date.now() - started) / 1000));
    };
    recorderRef.current = recorder;
    setRecording(true);
    recorder.start();
  }

  function stopRecording() {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
  }

  async function submitSpeaking(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const form = new FormData();
      form.set("prompt", prompt);
      form.set("transcript", transcript);
      form.set("durationSeconds", String(durationSeconds));
      form.set("title", "Speaking AI");
      if (audioBlob) {
        form.set("audio", audioBlob, "speaking.webm");
      }

      const response = await fetch("/api/ai/speaking-evaluation", {
        method: "POST",
        body: form,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "Khong cham duoc speaking.");
        return;
      }
      setResult(data);
    } catch {
      setError("Khong cham duoc speaking.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-6xl space-y-6 px-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Speaking AI - 7 points</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-950">Cham speaking nhu giam khao</h1>
              <p className="mt-2 max-w-2xl text-slate-600">
                Cham theo Fluency & Coherence, Pronunciation, Lexical Resource va Grammar.
              </p>
            </div>
            <Link href="/student/results" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Lich su ket qua</Link>
          </div>
        </section>

        <form onSubmit={submitSpeaking} className="rounded-xl border border-slate-200 bg-white p-5">
          <label className="text-sm font-semibold text-slate-700">Speaking prompt</label>
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            rows={3}
            className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {!recording ? (
              <button type="button" onClick={() => void startRecording()} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
                Start recording
              </button>
            ) : (
              <button type="button" onClick={stopRecording} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white">
                Stop recording
              </button>
            )}
            <span className="text-sm font-semibold text-slate-600">{recording ? "Dang ghi am..." : durationSeconds ? `${durationSeconds}s da ghi` : "Chua ghi am"}</span>
          </div>

          {audioPreview ? (
            <audio controls className="mt-4 w-full">
              <source src={audioPreview} />
            </audio>
          ) : null}

          <label className="mt-4 block text-sm font-semibold text-slate-700">Transcript bai noi</label>
          <textarea
            value={transcript}
            onChange={(event) => setTranscript(event.target.value)}
            rows={8}
            placeholder="Nhap transcript noi cua ban de AI co du lieu cham noi dung, tu vung va ngu phap..."
            className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          {error ? <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
          <button disabled={loading || recording} className="mt-4 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:bg-slate-300">
            {loading ? "Dang cham..." : "Submit speaking"}
          </button>
        </form>

        {result ? (
          <section className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-blue-600">{result.data.evaluation.language} - {result.data.evaluation.band.system}</p>
                  <h2 className="mt-1 text-2xl font-bold text-slate-950">Band {result.data.evaluation.band.level}</h2>
                  <p className="mt-2 text-sm text-slate-600">{result.data.evaluation.summary}</p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-5xl font-bold text-slate-950">{result.data.evaluation.overall.toFixed(1)}</p>
                  <p className="text-sm font-semibold text-red-600">-{result.points?.spent ?? 7} diem</p>
                </div>
              </div>
              <Link href={`/student/results/${result.assessmentId}`} className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
                Xem chi tiet da luu
              </Link>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              {Object.entries(result.data.evaluation.scores).map(([key, value]) => (
                <div key={key} className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-sm capitalize text-slate-500">{key.replace(/([A-Z])/g, " $1")}</p>
                  <p className="mt-2 text-2xl font-bold text-slate-950">{value}/10</p>
                </div>
              ))}
            </div>

            <FeedbackBlock title="Feedback chi tiet" items={result.data.analysis.feedback} />
            <FeedbackBlock title="Phat am / grammar / tu vung / fluency" items={[
              ...result.data.mistakes.pronunciation,
              ...result.data.mistakes.grammar,
              ...result.data.mistakes.vocabulary,
              ...result.data.mistakes.fluency,
            ]} />
            <FeedbackBlock title="Phuong phap cai thien" items={[...result.data.analysis.suggestions, ...result.data.improvements.practiceMethods]} />
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
        {items.map((item, index) => <li key={index}>- {item}</li>)}
      </ul>
    </section>
  );
}
