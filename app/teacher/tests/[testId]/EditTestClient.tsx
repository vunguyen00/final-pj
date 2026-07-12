"use client";

import Link from "next/link";
import { useState } from "react";
import { FIXED_TEST_MAX_SCORE, getAssessmentModeLabel } from "@/lib/test-rules";

export type EditableTest = {
  id: string;
  name: string;
  description: string | null;
  assessmentMode: "STANDARD" | "WRITING" | "SPEAKING";
  passingScore: number;
  timeLimit: number | null;
  shuffleQuestions: boolean;
  language: { id: string; name: string; code: string } | null;
  course: { id: string; name: string; language: { id: string; name: string; code: string } | null } | null;
};

export type Language = {
  id: string;
  name: string;
  code: string;
};

type TestForm = {
  name: string;
  description: string;
  languageId: string;
  passingScore: string;
  timeLimit: string;
  shuffleQuestions: boolean;
};

function buildInitialForm(test: EditableTest): TestForm {
  return {
    name: test.name,
    description: test.description || "",
    languageId: test.language?.id || test.course?.language?.id || "",
    passingScore: String(test.passingScore),
    timeLimit: test.timeLimit ? String(test.timeLimit) : "",
    shuffleQuestions: test.shuffleQuestions,
  };
}

export default function EditTestClient({
  initialTest,
  initialLanguages,
  initialError,
}: {
  initialTest: EditableTest | null;
  initialLanguages: Language[];
  initialError: string;
}) {
  const [test, setTest] = useState<EditableTest | null>(initialTest);
  const [form, setForm] = useState<TestForm | null>(
    initialTest ? buildInitialForm(initialTest) : null,
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(initialError);

  async function saveTest(event: React.FormEvent) {
    event.preventDefault();
    if (!test || !form) return;

    setSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch(`/api/teacher/tests/${test.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim() || null,
          languageId: form.languageId,
          passingScore: Number(form.passingScore),
          timeLimit: form.timeLimit ? Number(form.timeLimit) : null,
          shuffleQuestions: form.shuffleQuestions,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data?.error || "Không thể cập nhật đề test.");
        return;
      }

      setTest((current) => (current ? { ...current, ...data.test } : current));
      setMessage("Đã cập nhật thông tin đề test.");
    } catch {
      setError("Không thể cập nhật đề test.");
    } finally {
      setSaving(false);
    }
  }

  if (!test || !form) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-2xl rounded-xl border border-red-200 bg-white p-6 text-red-700">
          {error || "Không tìm thấy đề test."}
        </div>
      </main>
    );
  }

  const backHref = test.course?.id ? `/teacher/courses/${test.course.id}` : "/admin";
  const selectedLanguage =
    initialLanguages.find((language) => language.id === form.languageId) ??
    test.language ??
    test.course?.language ??
    null;
  const languageName = selectedLanguage?.name || "Chưa gán";

  return (
    <main className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-3xl px-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Link href={backHref} className="text-sm font-semibold text-slate-600 hover:text-slate-900">
            Quay lại
          </Link>
          <Link
            href={`/teacher/tests/${test.id}/questions`}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Quản lý câu hỏi
          </Link>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-950">Chỉnh sửa thông tin đề test</h1>
          <p className="mt-2 text-sm text-slate-500">
            {languageName} - {getAssessmentModeLabel(test.assessmentMode)} - Tổng điểm cố định {FIXED_TEST_MAX_SCORE}
          </p>

          {message ? <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p> : null}
          {error ? <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

          <form onSubmit={saveTest} className="mt-6 space-y-4">
            <label className="block text-sm font-semibold text-slate-700">
              Tên đề
              <input
                required
                value={form.name}
                onChange={(event) => setForm((current) => current && { ...current, name: event.target.value })}
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
              />
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              Mô tả
              <textarea
                rows={3}
                value={form.description}
                onChange={(event) => setForm((current) => current && { ...current, description: event.target.value })}
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
              />
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              Ngôn ngữ
              <select
                required
                value={form.languageId}
                onChange={(event) => setForm((current) => current && { ...current, languageId: event.target.value })}
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
              >
                <option value="">Chọn ngôn ngữ</option>
                {initialLanguages.map((language) => (
                  <option key={language.id} value={language.id}>
                    {language.name} ({language.code})
                  </option>
                ))}
              </select>
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold text-slate-700">
                Điểm đạt
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
                Giới hạn thời gian (phút)
                <input
                  type="number"
                  min={1}
                  value={form.timeLimit}
                  onChange={(event) => setForm((current) => current && { ...current, timeLimit: event.target.value })}
                  placeholder="Để trống nếu không giới hạn"
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
              Xáo trộn câu hỏi khi làm bài
            </label>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
