"use client";

import Link from "next/link";
import { useState } from "react";
import type { AdminManagedTest, Language } from "./types";

type TestForm = {
  name: string;
  description: string;
  languageId: string;
  assessmentMode: "STANDARD" | "WRITING" | "SPEAKING";
  timeLimit: string;
};

type ManagedTestKind = "TEACHER_ENTRANCE" | "PUBLIC_PRACTICE";

const DEFAULT_FORM_BY_KIND: Record<ManagedTestKind, TestForm> = {
  TEACHER_ENTRANCE: {
    name: "",
    description: "",
    languageId: "",
    assessmentMode: "WRITING",
    timeLimit: "60",
  },
  PUBLIC_PRACTICE: {
    name: "",
    description: "",
    languageId: "",
    assessmentMode: "STANDARD",
    timeLimit: "30",
  },
};

function labelForKind(kind: AdminManagedTest["kind"]) {
  return kind === "TEACHER_ENTRANCE"
    ? "Đề đầu vào giảng viên"
    : "Đề luyện tập công khai";
}

function descriptionForKind(kind: ManagedTestKind) {
  return kind === "TEACHER_ENTRANCE"
    ? "Hệ thống chọn ngẫu nhiên một đề hợp lệ theo ngôn ngữ khi ứng viên bắt đầu thi."
    : "Tạo đề luyện tập cho học viên và gắn đúng ngôn ngữ.";
}

function buildTestPayload(
  form: TestForm,
  kind: ManagedTestKind,
) {
  return {
    name: form.name.trim(),
    description: form.description.trim() || null,
    kind,
    languageId: form.languageId,
    assessmentMode: form.assessmentMode,
    passingScore: 60,
    timeLimit: form.timeLimit ? Number(form.timeLimit) : null,
  };
}

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
  const [adminManagedTests, setAdminManagedTests] = useState(
    initialAdminManagedTests,
  );
  const [selectedKind, setSelectedKind] =
    useState<ManagedTestKind>("TEACHER_ENTRANCE");
  const [testForm, setTestForm] = useState<TestForm>(
    DEFAULT_FORM_BY_KIND.TEACHER_ENTRANCE,
  );
  const [message, setMessage] = useState("");

  if (!isAdmin) return null;

  async function createManagedTest(
    event: React.FormEvent,
    form: TestForm,
    kind: ManagedTestKind,
    reset: () => void,
  ) {
    event.preventDefault();
    setMessage("");

    if (!form.languageId) {
      setMessage("Vui lòng chọn ngôn ngữ trước khi tạo đề.");
      return;
    }

    const response = await fetch("/api/teacher/tests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildTestPayload(form, kind)),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setMessage(data?.error || "Không thể tạo đề test.");
      return;
    }

    const language =
      languages.find((item) => item.id === form.languageId) ?? null;
    setAdminManagedTests((previous) => [
      {
        id: data.test.id,
        name: data.test.name,
        kind: data.test.kind,
        assessmentMode: data.test.assessmentMode,
        timeLimit: data.test.timeLimit,
        language: language
          ? {
              id: language.id,
              name: language.name,
              code: language.code,
            }
          : null,
        createdAt: new Date().toISOString(),
        _count: { questions: 0, attempts: 0 },
      },
      ...previous,
    ]);
    reset();
    setMessage(
      kind === "TEACHER_ENTRANCE"
        ? "Đã tạo đề đầu vào giảng viên."
        : "Đã tạo đề luyện tập.",
    );
  }

  async function deleteTest(testId: string) {
    if (!window.confirm("Bạn chắc chắn muốn xóa đề này?")) return;

    try {
      const response = await fetch(`/api/teacher/tests/${testId}`, {
        method: "DELETE",
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setMessage(data?.error || "Không thể xóa đề.");
        return;
      }

      setAdminManagedTests((previous) =>
        previous.filter((test) => test.id !== testId),
      );
      setMessage("Đã xóa đề.");
    } catch {
      setMessage("Lỗi khi xóa đề.");
    }
  }

  return (
    <div className="space-y-6">
      {message ? (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          {message}
        </div>
      ) : null}

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-950">Quản lý đề test</h2>
          <p className="mt-1 text-sm text-slate-500">
            Tạo đề đầu vào giảng viên và đề luyện tập theo từng ngôn ngữ.
          </p>
        </div>

        <div className="mt-5">
          <ManagedTestForm
            kind={selectedKind}
            form={testForm}
            languages={languages}
            onKindChange={(kind) => {
              setSelectedKind(kind);
              setTestForm((current) => ({
                ...current,
                assessmentMode: DEFAULT_FORM_BY_KIND[kind].assessmentMode,
                timeLimit: DEFAULT_FORM_BY_KIND[kind].timeLimit,
              }));
            }}
            onChange={setTestForm}
            onSubmit={(event) =>
              void createManagedTest(
                event,
                testForm,
                selectedKind,
                () => setTestForm(DEFAULT_FORM_BY_KIND[selectedKind]),
              )
            }
          />
        </div>

        <div className="mt-8">
          <h3 className="font-bold text-slate-900">Danh sách các đề</h3>
          {adminManagedTests.length === 0 ? (
            <p className="mt-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
              Chưa có đề nào.
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              {adminManagedTests.map((test) => (
                <article
                  key={test.id}
                  className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-slate-950">{test.name}</p>
                      <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
                        {labelForKind(test.kind)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">
                      {test.language?.name || "Chưa gán ngôn ngữ"} -{" "}
                      {test._count.questions} câu hỏi - {test._count.attempts} lần
                      thi
                    </p>
                    <p className="mt-1 text-xs font-medium text-slate-500">
                      Thời gian:{" "}
                      {test.timeLimit
                        ? `${test.timeLimit} phút`
                        : "Không giới hạn"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/teacher/tests/${test.id}/questions`}
                      className="rounded-lg bg-slate-900 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-slate-800"
                    >
                      Thêm câu hỏi
                    </Link>
                    <Link
                      href={`/teacher/tests/${test.id}`}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Chỉnh sửa
                    </Link>
                    <button
                      type="button"
                      onClick={() => void deleteTest(test.id)}
                      className="rounded-lg px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                    >
                      Xóa
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function ManagedTestForm({
  kind,
  form,
  languages,
  onKindChange,
  onChange,
  onSubmit,
}: {
  kind: ManagedTestKind;
  form: TestForm;
  languages: Language[];
  onKindChange: (kind: ManagedTestKind) => void;
  onChange: (form: TestForm) => void;
  onSubmit: (event: React.FormEvent) => void;
}) {
  const fieldClass =
    "w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
  const isTeacherEntrance = kind === "TEACHER_ENTRANCE";

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5"
    >
      <div>
        <div>
          <h3 className="font-bold text-slate-900">Tạo đề mới</h3>
          <p className="mt-1 text-sm leading-5 text-slate-500">
            {descriptionForKind(kind)}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <label
            htmlFor="managed-test-kind"
            className="text-xs font-bold uppercase tracking-wide text-slate-500"
          >
            Loại đề
          </label>
          <select
            id="managed-test-kind"
            value={kind}
            onChange={(event) =>
              onKindChange(event.target.value as ManagedTestKind)
            }
            className={`${fieldClass} mt-2 bg-white`}
          >
            <option value="TEACHER_ENTRANCE">Đề đầu vào giảng viên</option>
            <option value="PUBLIC_PRACTICE">Đề luyện tập công khai</option>
          </select>
        </div>

        <label className="block text-sm font-semibold text-slate-700">
          Tên đề test
          <input
            value={form.name}
            onChange={(event) => onChange({ ...form, name: event.target.value })}
            required
            placeholder="Tên đề test"
            className={`${fieldClass} mt-2 bg-white`}
          />
        </label>

        <label className="block text-sm font-semibold text-slate-700">
          Mô tả hoặc hướng dẫn làm bài
          <textarea
            value={form.description}
            onChange={(event) =>
              onChange({ ...form, description: event.target.value })
            }
            rows={3}
            placeholder="Mô tả hoặc hướng dẫn làm bài"
            className={`${fieldClass} mt-2 bg-white`}
          />
        </label>

        <label className="block text-sm font-semibold text-slate-700">
          Ngôn ngữ bắt buộc
          <select
            value={form.languageId}
            onChange={(event) =>
              onChange({ ...form, languageId: event.target.value })
            }
            required
            className={`${fieldClass} mt-2 bg-white`}
          >
            <option value="">Chọn ngôn ngữ bắt buộc</option>
            {languages.map((language) => (
              <option key={language.id} value={language.id}>
                {language.name} ({language.code})
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-semibold text-slate-700">
          Giới hạn thời gian
          <div className="relative">
            <input
              type="number"
              min={1}
              value={form.timeLimit}
              onChange={(event) =>
                onChange({ ...form, timeLimit: event.target.value })
              }
              placeholder="Để trống nếu không giới hạn"
              className={`${fieldClass} mt-2 bg-white pr-14`}
            />
            <span className="pointer-events-none absolute bottom-2.5 right-3 text-sm font-normal text-slate-500">
              phút
            </span>
          </div>
          <span className="mt-1 block text-xs font-normal text-slate-500">
            Hết giờ, bài sẽ tự động nộp và toàn bộ đáp án bị khóa.
          </span>
        </label>
      </div>

      <button
        type="submit"
        className={`mt-5 rounded-xl px-4 py-2.5 text-sm font-semibold text-white ${
          isTeacherEntrance
            ? "bg-blue-600 hover:bg-blue-700"
            : "bg-emerald-600 hover:bg-emerald-700"
        }`}
      >
        Tạo {isTeacherEntrance ? "đề đầu vào" : "đề luyện tập"}
      </button>
    </form>
  );
}
