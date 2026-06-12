"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { FIXED_TEST_MAX_SCORE, getAssessmentModeLabel } from "@/lib/test-rules";

type EditableTest = {
  id: string;
  name: string;
  description: string | null;
  assessmentMode: "STANDARD" | "WRITING" | "SPEAKING";
  passingScore: number;
  maxAttempts: number;
  timeLimit: number | null;
  shuffleQuestions: boolean;
  language: { name: string } | null;
  course: { id: string; name: string; language: { name: string } | null } | null;
};

type TestForm = {
  name: string;
  description: string;
  passingScore: string;
  maxAttempts: string;
  timeLimit: string;
  shuffleQuestions: boolean;
};

export default function EditTestPage() {
  const { testId } = useParams<{ testId: string }>();
  const [test, setTest] = useState<EditableTest | null>(null);
  const [form, setForm] = useState<TestForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadTest() {
      setLoading(true);
      try {
        const response = await fetch(`/api/teacher/tests/${testId}`, { cache: "no-store" });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          setError(data?.error || "Khong the tai thong tin de test.");
          return;
        }

        const loaded = data.test as EditableTest;
        setTest(loaded);
        setForm({
          name: loaded.name,
          description: loaded.description || "",
          passingScore: String(loaded.passingScore),
          maxAttempts: String(loaded.maxAttempts),
          timeLimit: loaded.timeLimit ? String(loaded.timeLimit) : "",
          shuffleQuestions: loaded.shuffleQuestions,
        });
      } catch {
        setError("Khong the tai thong tin de test.");
      } finally {
        setLoading(false);
      }
    }

    void loadTest();
  }, [testId]);

  async function saveTest(event: React.FormEvent) {
    event.preventDefault();
    if (!form) return;

    setSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch(`/api/teacher/tests/${testId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim() || null,
          passingScore: Number(form.passingScore),
          maxAttempts: Number(form.maxAttempts),
          timeLimit: form.timeLimit ? Number(form.timeLimit) : null,
          shuffleQuestions: form.shuffleQuestions,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data?.error || "Khong the cap nhat de test.");
        return;
      }

      setTest((current) => (current ? { ...current, ...data.test } : current));
      setMessage("Da cap nhat thong tin de test.");
    } catch {
      setError("Khong the cap nhat de test.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <main className="min-h-screen bg-slate-50 p-8 text-center text-slate-600">Dang tai...</main>;
  }

  if (!test || !form) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-2xl rounded-xl border border-red-200 bg-white p-6 text-red-700">
          {error || "Khong tim thay de test."}
        </div>
      </main>
    );
  }

  const backHref = test.course?.id ? `/teacher/courses/${test.course.id}` : "/admin";
  const languageName = test.language?.name || test.course?.language?.name || "Chua gan";

  return (
    <main className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-3xl px-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Link href={backHref} className="text-sm font-semibold text-slate-600 hover:text-slate-900">
            Quay lai
          </Link>
          <Link
            href={`/teacher/tests/${test.id}/questions`}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Quan ly cau hoi
          </Link>
        </div>

        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h1 className="text-2xl font-bold text-slate-950">Chinh sua thong tin de test</h1>
          <p className="mt-2 text-sm text-slate-500">
            {languageName} - {getAssessmentModeLabel(test.assessmentMode)} - Tong diem co dinh {FIXED_TEST_MAX_SCORE}
          </p>

          {message ? <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p> : null}
          {error ? <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

          <form onSubmit={saveTest} className="mt-6 space-y-4">
            <label className="block text-sm font-semibold text-slate-700">
              Ten de
              <input
                required
                value={form.name}
                onChange={(event) => setForm((current) => current && { ...current, name: event.target.value })}
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
              />
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              Mo ta
              <textarea
                rows={3}
                value={form.description}
                onChange={(event) => setForm((current) => current && { ...current, description: event.target.value })}
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="text-sm font-semibold text-slate-700">
                Diem dat
                <input
                  type="number"
                  min={0}
                  max={FIXED_TEST_MAX_SCORE}
                  required
                  value={form.passingScore}
                  onChange={(event) => setForm((current) => current && { ...current, passingScore: event.target.value })}
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                />
              </label>
              <label className="text-sm font-semibold text-slate-700">
                So lan lam
                <input
                  type="number"
                  min={1}
                  required
                  value={form.maxAttempts}
                  onChange={(event) => setForm((current) => current && { ...current, maxAttempts: event.target.value })}
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                />
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Thoi gian (phut)
                <input
                  type="number"
                  min={1}
                  value={form.timeLimit}
                  onChange={(event) => setForm((current) => current && { ...current, timeLimit: event.target.value })}
                  placeholder="Khong gioi han"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                />
              </label>
            </div>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={form.shuffleQuestions}
                onChange={(event) =>
                  setForm((current) => current && { ...current, shuffleQuestions: event.target.checked })
                }
              />
              Xao tron cau hoi khi lam bai
            </label>
            <button
              disabled={saving}
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? "Dang luu..." : "Luu thay doi"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
