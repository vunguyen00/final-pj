"use client";

import Link from "next/link";
import { useState } from "react";
import type { AdminManagedTest, Language } from "./types";

type TestForm = {
  name: string;
  description: string;
  languageId: string;
  assessmentMode: "STANDARD" | "WRITING" | "SPEAKING";
};

const defaultTestForm: TestForm = {
  name: "",
  description: "",
  languageId: "",
  assessmentMode: "WRITING",
};

const defaultPublicPracticeForm: TestForm = {
  ...defaultTestForm,
  assessmentMode: "STANDARD",
};

function labelForKind(kind: AdminManagedTest["kind"]) {
  return kind === "TEACHER_ENTRANCE" ? "De dau vao giang vien" : "De luyen tap cong khai";
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
  const [adminManagedTests, setAdminManagedTests] = useState(initialAdminManagedTests);
  const [teacherEntranceForm, setTeacherEntranceForm] = useState<TestForm>(defaultTestForm);
  const [publicPracticeForm, setPublicPracticeForm] = useState<TestForm>(defaultPublicPracticeForm);
  const [message, setMessage] = useState("");

  if (!isAdmin) return null;

  function buildTestPayload(form: TestForm, kind: "TEACHER_ENTRANCE" | "PUBLIC_PRACTICE") {
    return {
      name: form.name.trim(),
      description: form.description.trim() || null,
      kind,
      languageId: form.languageId,
      assessmentMode: form.assessmentMode,
      passingScore: 60,
      maxAttempts: 3,
      timeLimit: null,
    };
  }

  async function createManagedTest(
    event: React.FormEvent,
    form: TestForm,
    kind: "TEACHER_ENTRANCE" | "PUBLIC_PRACTICE",
    reset: () => void,
    successMessage: string,
    errorMessage: string,
  ) {
    event.preventDefault();

    if (!form.languageId) {
      setMessage("Vui long chon ngon ngu bat buoc truoc khi tao de.");
      return;
    }

    const response = await fetch("/api/teacher/tests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildTestPayload(form, kind)),
    });
    const data = await response.json().catch(() => ({}));

    if (response.ok) {
      const language = languages.find((item) => item.id === form.languageId) ?? null;
      setAdminManagedTests((prev) => [
        {
          id: data.test.id,
          name: data.test.name,
          kind: data.test.kind,
          assessmentMode: data.test.assessmentMode,
          language: language ? { id: language.id, name: language.name, code: language.code } : null,
          createdAt: new Date().toISOString(),
          _count: { questions: 0, attempts: 0 },
        },
        ...prev,
      ]);
      reset();
      setMessage(successMessage);
      return;
    }

    setMessage(data?.error || errorMessage);
  }

  return (
    <div className="space-y-6">
      {message ? <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">{message}</div> : null}

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-bold text-slate-950">Quan ly de test</h2>
        <p className="mt-1 text-sm text-slate-500">Admin co the tao de dau vao va de luyen tap tai day.</p>

        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          <form
            onSubmit={(event) =>
              void createManagedTest(
                event,
                teacherEntranceForm,
                "TEACHER_ENTRANCE",
                () => setTeacherEntranceForm(defaultTestForm),
                "Da tao de dau vao.",
                "Khong the tao de dau vao.",
              )
            }
            className="rounded-lg border border-slate-200 p-4"
          >
            <h3 className="font-semibold text-slate-900">De dau vao giang vien</h3>
            <p className="mt-1 text-sm text-slate-500">
              Co the tao nhieu de cho cung mot ngon ngu. He thong se chon ngau nhien mot de hop le khi bat dau thi.
            </p>
            <div className="mt-3 space-y-3">
              <input
                value={teacherEntranceForm.name}
                onChange={(event) => setTeacherEntranceForm((prev) => ({ ...prev, name: event.target.value }))}
                required
                placeholder="Vi du: English Teacher Entrance Test"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <textarea
                value={teacherEntranceForm.description}
                onChange={(event) => setTeacherEntranceForm((prev) => ({ ...prev, description: event.target.value }))}
                rows={2}
                placeholder="Mo ta de test"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <select
                value={teacherEntranceForm.languageId}
                onChange={(event) => setTeacherEntranceForm((prev) => ({ ...prev, languageId: event.target.value }))}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Chon ngon ngu bat buoc</option>
                {languages.map((language) => (
                  <option key={language.id} value={language.id}>
                    {language.name} ({language.code})
                  </option>
                ))}
              </select>
            </div>
            <button className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
              Tao de dau vao
            </button>
          </form>

          <form
            onSubmit={(event) =>
              void createManagedTest(
                event,
                publicPracticeForm,
                "PUBLIC_PRACTICE",
                () => setPublicPracticeForm(defaultPublicPracticeForm),
                "Da tao de luyen tap.",
                "Khong the tao de luyen tap.",
              )
            }
            className="rounded-lg border border-slate-200 p-4"
          >
            <h3 className="font-semibold text-slate-900">De luyen tap cong khai</h3>
            <p className="mt-1 text-sm text-slate-500">Tao de luyen tap cho hoc sinh. Bat buoc chon ngon ngu.</p>
            <div className="mt-3 space-y-3">
              <input
                value={publicPracticeForm.name}
                onChange={(event) => setPublicPracticeForm((prev) => ({ ...prev, name: event.target.value }))}
                required
                placeholder="Vi du: English Practice Test - Intermediate"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <textarea
                value={publicPracticeForm.description}
                onChange={(event) => setPublicPracticeForm((prev) => ({ ...prev, description: event.target.value }))}
                rows={2}
                placeholder="Mo ta de luyen tap"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <select
                value={publicPracticeForm.languageId}
                onChange={(event) => setPublicPracticeForm((prev) => ({ ...prev, languageId: event.target.value }))}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Chon ngon ngu bat buoc</option>
                {languages.map((language) => (
                  <option key={language.id} value={language.id}>
                    {language.name} ({language.code})
                  </option>
                ))}
              </select>
            </div>
            <button className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
              Tao de luyen tap
            </button>
          </form>
        </div>

        <div className="mt-8 space-y-3">
          <h3 className="font-semibold text-slate-900">Danh sach cac de</h3>
          {adminManagedTests.length === 0 ? (
            <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">Chua co de nao.</p>
          ) : (
            <div className="space-y-2">
              {adminManagedTests.map((test) => (
                <div
                  key={test.id}
                  className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{test.name}</p>
                    <p className="text-sm text-slate-600">{labelForKind(test.kind)}</p>
                    <p className="text-xs text-slate-500">
                      {test.language?.name || "Chua gan ngon ngu"} - {test._count.questions} cau hoi - {test._count.attempts} lan thi
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/teacher/tests/${test.id}/questions`}
                      className="rounded-lg bg-slate-900 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-slate-800"
                    >
                      Them cau hoi
                    </Link>
                    <Link
                      href={`/teacher/tests/${test.id}`}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Chỉnh sửa
                    </Link>
                    <button
                      onClick={async () => {
                        if (!confirm("Ban chac chan muon xoa de nay?")) return;
                        try {
                          const res = await fetch(`/api/teacher/tests/${test.id}`, { method: "DELETE" });
                          if (res.ok) {
                            setAdminManagedTests((prev) => prev.filter((t) => t.id !== test.id));
                            setMessage("Da xoa de.");
                          } else {
                            const data = await res.json().catch(() => ({}));
                            setMessage(data?.error || "Khong the xoa de.");
                          }
                        } catch (err) {
                          console.error(err);
                          setMessage("Loi khi xoa de.");
                        }
                      }}
                      className="rounded-lg px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                    >
                      Xoa
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
