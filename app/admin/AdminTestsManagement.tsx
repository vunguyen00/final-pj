"use client";

import Link from "next/link";
import { useState } from "react";
import type { AdminManagedTest, Language } from "./types";

type TestForm = {
  name: string;
  description: string;
  languageId: string;
  maxScore: string;
  passingScore: string;
  maxAttempts: string;
  timeLimit: string;
};

const defaultTestForm: TestForm = {
  name: "",
  description: "",
  languageId: "",
  maxScore: "100",
  passingScore: "60",
  maxAttempts: "3",
  timeLimit: "",
};

export default function AdminTestsManagement({
  initialLanguages,
  initialAdminManagedTests,
  isAdmin,
}: {
  initialLanguages: Language[];
  initialAdminManagedTests: AdminManagedTest[];
  isAdmin: boolean;
}) {
  const [languages] = useState(initialLanguages);
  const [adminManagedTests, setAdminManagedTests] = useState(initialAdminManagedTests);
  const [teacherEntranceForm, setTeacherEntranceForm] = useState<TestForm>(defaultTestForm);
  const [publicPracticeForm, setPublicPracticeForm] = useState<TestForm>(defaultTestForm);
  const [message, setMessage] = useState("");

  if (!isAdmin) return null;

  function buildTestPayload(form: TestForm, kind: "TEACHER_ENTRANCE" | "PUBLIC_PRACTICE") {
    return {
      name: form.name.trim(),
      description: form.description.trim() || null,
      kind,
      languageId: form.languageId || null,
      maxScore: Number(form.maxScore || "100"),
      passingScore: Number(form.passingScore || "60"),
      maxAttempts: Number(form.maxAttempts || "3"),
      timeLimit: form.timeLimit.trim() ? Number(form.timeLimit) : null,
    };
  }

  async function createTeacherEntranceTest(event: React.FormEvent) {
    event.preventDefault();
    if (!teacherEntranceForm.languageId) {
      setMessage("Vui lòng chọn ngôn ngữ cho đề đầu vào giảng viên.");
      return;
    }
    const response = await fetch("/api/teacher/tests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildTestPayload(teacherEntranceForm, "TEACHER_ENTRANCE")),
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      const language = languages.find((item) => item.id === teacherEntranceForm.languageId) ?? null;
      setAdminManagedTests((prev) => [
        {
          id: data.test.id,
          name: data.test.name,
          kind: data.test.kind,
          language: language ? { id: language.id, name: language.name, code: language.code } : null,
          createdAt: new Date().toISOString(),
          _count: { questions: 0, attempts: 0 },
        },
        ...prev,
      ]);
      setTeacherEntranceForm(defaultTestForm);
      setMessage("Đã tạo đề đầu vào giảng viên.");
    } else {
      setMessage(data?.error || "Không thể tạo đề đầu vào giảng viên.");
    }
  }

  async function createPublicPracticeTest(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/teacher/tests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildTestPayload(publicPracticeForm, "PUBLIC_PRACTICE")),
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      const language = languages.find((item) => item.id === publicPracticeForm.languageId) ?? null;
      setAdminManagedTests((prev) => [
        {
          id: data.test.id,
          name: data.test.name,
          kind: data.test.kind,
          language: language ? { id: language.id, name: language.name, code: language.code } : null,
          createdAt: new Date().toISOString(),
          _count: { questions: 0, attempts: 0 },
        },
        ...prev,
      ]);
      setPublicPracticeForm(defaultTestForm);
      setMessage("Đã tạo đề luyện tập công khai.");
    } else {
      setMessage(data?.error || "Không thể tạo đề luyện tập.");
    }
  }

  return (
    <div className="space-y-6">
      {message ? <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">{message}</div> : null}

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-bold text-slate-950">Quản lý test</h2>
        <p className="mt-1 text-sm text-slate-500">Phần này chỉ dành cho admin tạo và quản lý đề test hệ thống.</p>

        <div className="mt-4 grid gap-6 xl:grid-cols-2">
          <form onSubmit={createTeacherEntranceTest} className="rounded-lg border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-900">Đề đầu vào giảng viên</h3>
            <p className="mt-1 text-sm text-slate-500">Đề theo ngôn ngữ giảng viên đăng ký.</p>
            <div className="mt-3 space-y-3">
              <input
                value={teacherEntranceForm.name}
                onChange={(event) => setTeacherEntranceForm((prev) => ({ ...prev, name: event.target.value }))}
                required
                placeholder="Ví dụ: English Teacher Entrance Test - B1"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <textarea
                value={teacherEntranceForm.description}
                onChange={(event) => setTeacherEntranceForm((prev) => ({ ...prev, description: event.target.value }))}
                rows={2}
                placeholder="Mô tả đề test"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <select
                value={teacherEntranceForm.languageId}
                onChange={(event) => setTeacherEntranceForm((prev) => ({ ...prev, languageId: event.target.value }))}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Chọn ngôn ngữ bắt buộc</option>
                {languages.map((language) => (
                  <option key={language.id} value={language.id}>
                    {language.name} ({language.code})
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  value={teacherEntranceForm.maxScore}
                  onChange={(event) => setTeacherEntranceForm((prev) => ({ ...prev, maxScore: event.target.value }))}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Điểm tối đa"
                />
                <input
                  type="number"
                  value={teacherEntranceForm.passingScore}
                  onChange={(event) => setTeacherEntranceForm((prev) => ({ ...prev, passingScore: event.target.value }))}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Điểm đạt"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  value={teacherEntranceForm.maxAttempts}
                  onChange={(event) => setTeacherEntranceForm((prev) => ({ ...prev, maxAttempts: event.target.value }))}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Số lần làm"
                />
                <input
                  type="number"
                  value={teacherEntranceForm.timeLimit}
                  onChange={(event) => setTeacherEntranceForm((prev) => ({ ...prev, timeLimit: event.target.value }))}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Thời gian (phút)"
                />
              </div>
            </div>
            <button className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Tạo đề đầu vào</button>
          </form>

          <form onSubmit={createPublicPracticeTest} className="rounded-lg border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-900">Đề luyện tập công khai</h3>
            <p className="mt-1 text-sm text-slate-500">Bất kỳ tài khoản đăng nhập đều có thể làm.</p>
            <div className="mt-3 space-y-3">
              <input
                value={publicPracticeForm.name}
                onChange={(event) => setPublicPracticeForm((prev) => ({ ...prev, name: event.target.value }))}
                required
                placeholder="Ví dụ: Public Practice - Grammar Basics"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <textarea
                value={publicPracticeForm.description}
                onChange={(event) => setPublicPracticeForm((prev) => ({ ...prev, description: event.target.value }))}
                rows={2}
                placeholder="Mô tả đề luyện tập"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <select
                value={publicPracticeForm.languageId}
                onChange={(event) => setPublicPracticeForm((prev) => ({ ...prev, languageId: event.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Không gắn ngôn ngữ cụ thể</option>
                {languages.map((language) => (
                  <option key={language.id} value={language.id}>
                    {language.name} ({language.code})
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  value={publicPracticeForm.maxScore}
                  onChange={(event) => setPublicPracticeForm((prev) => ({ ...prev, maxScore: event.target.value }))}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Điểm tối đa"
                />
                <input
                  type="number"
                  value={publicPracticeForm.passingScore}
                  onChange={(event) => setPublicPracticeForm((prev) => ({ ...prev, passingScore: event.target.value }))}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Điểm đạt"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  value={publicPracticeForm.maxAttempts}
                  onChange={(event) => setPublicPracticeForm((prev) => ({ ...prev, maxAttempts: event.target.value }))}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Số lần làm"
                />
                <input
                  type="number"
                  value={publicPracticeForm.timeLimit}
                  onChange={(event) => setPublicPracticeForm((prev) => ({ ...prev, timeLimit: event.target.value }))}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Thời gian (phút)"
                />
              </div>
            </div>
            <button className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Tạo đề luyện tập</button>
          </form>
        </div>

        <div className="mt-6 space-y-2">
          <h3 className="font-semibold text-slate-900">Danh sách đề admin đã tạo</h3>
          {adminManagedTests.length === 0 ? (
            <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">Chưa có đề nào.</p>
          ) : (
            adminManagedTests.map((test) => (
              <div key={test.id} className="flex flex-col gap-2 rounded-lg border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-slate-900">{test.name}</p>
                  <p className="text-xs text-slate-500">
                    {test.kind === "TEACHER_ENTRANCE" ? "Teacher entrance" : "Public practice"} - {test.language?.name || "Không gắn ngôn ngữ"} - {test._count.questions} câu hỏi
                  </p>
                </div>
                <Link href={`/teacher/tests/${test.id}/questions`} className="rounded-lg bg-slate-900 px-3 py-2 text-center text-sm font-semibold text-white">
                  Quản lý câu hỏi
                </Link>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
