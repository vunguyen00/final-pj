"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

type Language = { id: string; name: string };
type Question = {
  id: string;
  type: string;
  content: string;
  audioUrl: string | null;
  score: number;
  answers: { id: string; content: string; order: number }[] | null;
};
type EntranceTest = {
  id: string;
  name: string;
  description: string | null;
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
  createdAt: string;
  submittedAt: string | null;
};

export default function TeacherRegistrationPage() {
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
  const [submitting, setSubmitting] = useState(false);
  const lastHiddenAt = useRef<number | null>(null);

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    if (timeLeft === null || !activeApplication) return;
    if (timeLeft <= 0) {
      void submitTest();
      return;
    }
    const timer = window.setTimeout(() => setTimeLeft((value) => (value === null ? null : value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [timeLeft, activeApplication]);

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

  async function loadData() {
    const response = await fetch("/api/teacher-applications", { cache: "no-store" });
    const data = await response.json();
    setEnabled(Boolean(data.setting?.enabled));
    setLanguages(data.languages || []);
    setApplications(data.applications || []);
    const draft = (data.applications || []).find((item: Application) => item.status === "DRAFT" && item.entranceTest);
    if (draft) {
      setActiveApplication(draft);
      setAnswers((draft.answerState as Record<string, string>) || {});
      setTimeLeft(draft.entranceTest?.timeLimit ? draft.entranceTest.timeLimit * 60 : null);
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
      setMessage(data?.error || "Khong the nop ho so.");
      return;
    }

    setActiveApplication(data.application);
    setTimeLeft(data.application.entranceTest?.timeLimit ? data.application.entranceTest.timeLimit * 60 : null);
    setAnswers({});
    setFiles([]);
    setExpiryDates([]);
    setMessage(data.application.entranceTest ? "Da luu chung chi. Bat dau bai test." : "Da nop ho so, cho admin review.");
    await loadData();
  }

  async function submitTest() {
    if (!activeApplication || submitting) return;
    setSubmitting(true);
    const response = await fetch(`/api/teacher-applications/${activeApplication.id}/submit-test`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers }),
    });
    const data = await response.json().catch(() => ({}));
    setSubmitting(false);
    if (!response.ok) {
      setMessage(data?.error || "Khong the nop bai test.");
      return;
    }
    setMessage("Da nop bai test. Ho so dang cho admin review.");
    setActiveApplication(null);
    setTimeLeft(null);
    await loadData();
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
  };

  if (!enabled) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-6">
          <h1 className="text-2xl font-bold text-slate-900">Dang ky giang vien</h1>
          <p className="mt-3 text-slate-600">Chuc nang dang ky giang vien dang tam tat.</p>
          <Link href="/" className="mt-5 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
            Ve trang chu
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
              <h1 className="text-3xl font-bold text-slate-950">Dang ky giang vien</h1>
              <p className="mt-2 text-slate-600">Chon ngon ngu, upload chung chi va hoan thanh bai test dau vao.</p>
            </div>
            {timeLeft !== null ? (
              <div className={`rounded-lg px-4 py-2 text-lg font-bold ${timeLeft < 300 ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>
                {formatTime(timeLeft)}
              </div>
            ) : null}
          </div>
        </section>

        {message ? <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">{message}</div> : null}

        {activeApplication?.entranceTest ? (
          <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-bold text-slate-950">{activeApplication.entranceTest.name}</h2>
            <div className="mt-5 space-y-5">
              {questions.map((question, index) => (
                <article key={question.id} className="rounded-lg border border-slate-200 p-4">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <span className="font-semibold text-slate-900">Cau {index + 1}</span>
                    <span>{question.score} diem</span>
                  </div>
                  {question.audioUrl ? <audio controls className="mt-3 w-full max-w-md" src={question.audioUrl} /> : null}
                  <p className="mt-3 font-medium text-slate-900">{question.content}</p>
                  <div className="mt-3 space-y-2">
                    {(question.type === "MULTIPLE_CHOICE" || question.type === "TRUE_FALSE") && question.answers
                      ? question.answers.map((answer) => (
                          <label key={answer.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50">
                            <input
                              type="radio"
                              name={question.id}
                              checked={answers[question.id] === answer.id}
                              onChange={() => setAnswers((prev) => ({ ...prev, [question.id]: answer.id }))}
                            />
                            <span>{answer.content}</span>
                          </label>
                        ))
                      : null}
                    {question.type === "FILL_IN_BLANK" ? (
                      <input
                        value={answers[question.id] || ""}
                        onChange={(event) => setAnswers((prev) => ({ ...prev, [question.id]: event.target.value }))}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2"
                      />
                    ) : null}
                    {question.type === "ESSAY" ? (
                      <textarea
                        rows={6}
                        value={answers[question.id] || ""}
                        onChange={(event) => setAnswers((prev) => ({ ...prev, [question.id]: event.target.value }))}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2"
                      />
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
            <button
              onClick={() => void submitTest()}
              disabled={submitting}
              className="mt-6 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? "Dang nop..." : "Nop bai test"}
            </button>
          </section>
        ) : (
          <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-bold text-slate-950">Ho so moi</h2>
            <form onSubmit={submitCertificates} className="mt-5 grid gap-4">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Ngon ngu apply</span>
                <select value={languageId} onChange={(event) => setLanguageId(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2">
                  <option value="">Chon ngon ngu</option>
                  {languages.map((language) => (
                    <option key={language.id} value={language.id}>
                      {language.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Chung chi JPG, PNG hoac PDF</span>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  multiple
                  onChange={(event) => onFilesSelected(event.target.files)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
              {files.map((file, index) => (
                <div key={`${file.name}-${index}`} className="grid gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-[1fr_180px]">
                  <div>
                    <p className="font-medium text-slate-900">{file.name}</p>
                    <p className="text-sm text-slate-500">{Math.round(file.size / 1024)} KB</p>
                  </div>
                  <input
                    type="date"
                    value={expiryDates[index] || ""}
                    onChange={(event) => setExpiryDates((prev) => prev.map((value, itemIndex) => (itemIndex === index ? event.target.value : value)))}
                    className="rounded-lg border border-slate-300 px-3 py-2"
                  />
                </div>
              ))}
              <button disabled={submitting} className="w-fit rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                {submitting ? "Dang luu..." : "Tiep tuc"}
              </button>
            </form>
          </section>
        )}

        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-bold text-slate-950">Lich su apply</h2>
          <div className="mt-4 space-y-3">
            {latestApplications.length === 0 ? <p className="text-sm text-slate-500">Chua co ho so nao.</p> : null}
            {latestApplications.map((application) => (
              <div key={application.id} className="rounded-lg border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-slate-900">
                    Lan #{application.attemptNo} - {application.language.name}
                  </p>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{application.status}</span>
                </div>
                <p className="mt-1 text-sm text-slate-500">{new Date(application.createdAt).toLocaleString("vi-VN")}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
