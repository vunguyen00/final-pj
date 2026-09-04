"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { readJsonResponse } from "@/lib/http-response";
import AdminWorkspace from "./AdminWorkspace";
import type { AdminManagedTest, Language } from "./types";

export default function AdminTestsManagement({
  initialLanguages,
  initialAdminManagedTests,
}: {
  initialLanguages: Language[];
  initialAdminManagedTests: AdminManagedTest[];
  initialAdminManagedTestTotal: number;
  isAdmin: boolean;
}) {
  const [tests, setTests] = useState(initialAdminManagedTests);
  const [form, setForm] = useState({ name: "", description: "", languageId: "", assessmentMode: "STANDARD", timeLimit: "60" });
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [pendingAction, setPendingAction] = useState<"create" | string | null>(null);
  const saving = pendingAction === "create";
  const deletingTestId = pendingAction && pendingAction !== "create" ? pendingAction : null;

  async function refresh() {
    const query = new URLSearchParams({ search });
    const response = await fetch(`/api/admin/tests?${query}`, { cache: "no-store" });
    const data = await readJsonResponse(response).catch(() => ({}));
    if (response.ok) setTests(data.tests ?? []);
  }

  async function createTest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPendingAction("create");
    setMessage("");
    try {
      const response = await fetch("/api/teacher/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "PUBLIC_PRACTICE",
          name: form.name,
          description: form.description,
          languageId: form.languageId,
          assessmentMode: form.assessmentMode,
          timeLimit: Number(form.timeLimit) || null,
          passingScore: 50,
          maxScore: 100,
          shuffleQuestions: true,
        }),
      });
      const data = await readJsonResponse(response).catch(() => ({}));
      if (!response.ok) {
        setMessage(data.error ?? "Không thể tạo bài luyện tập.");
        return;
      }
      setForm({ name: "", description: "", languageId: "", assessmentMode: "STANDARD", timeLimit: "60" });
      setMessage("Đã tạo bài luyện tập công khai. Hãy mở phần câu hỏi để hoàn thiện đề.");
      await refresh();
    } finally {
      setPendingAction(null);
    }
  }

  async function deleteTest(testId: string) {
    if (deletingTestId || !window.confirm("Bạn có chắc chắn muốn xóa bài luyện tập này?")) return;

    setPendingAction(testId);
    setMessage("");
    try {
      const response = await fetch(`/api/teacher/tests/${testId}`, {
        method: "DELETE",
      });
      const data = await readJsonResponse(response).catch(() => ({}));
      if (!response.ok) {
        setMessage(data.error ?? "Không thể xóa bài luyện tập.");
        return;
      }

      setTests((current) => current.filter((test) => test.id !== testId));
      setMessage("Đã xóa bài luyện tập.");
    } catch {
      setMessage("Có lỗi khi xóa bài luyện tập. Vui lòng thử lại.");
    } finally {
      setPendingAction(null);
    }
  }

  const keyword = search.trim().toLocaleLowerCase("vi");
  const visibleTests = tests.filter((test) => test.name.toLocaleLowerCase("vi").includes(keyword));

  return (
    <AdminWorkspace
      items={[
        { id: "create", label: "Tạo bài luyện tập công khai", description: "Khai báo thông tin đề mới" },
        { id: "list", label: "Danh sách bài luyện tập", description: "Tìm kiếm và quản lý câu hỏi" },
      ]}
      initialActiveId="create"
      ariaLabel="Chức năng quản lý bài luyện tập"
      renderContent={(activeView) => (
        <div className="space-y-4">
          {message ? <p role="status" className="rounded-xl bg-blue-50 p-3 text-sm font-semibold text-blue-800">{message}</p> : null}
          {activeView === "create" ? (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-950">Tạo bài luyện tập công khai</h2>
        <p className="mt-1 text-sm text-slate-500">Bài thi đầu vào giảng viên đã chuyển sang thi bàn giấy và không còn tạo tại đây.</p>
        <form className="mt-5 space-y-4" onSubmit={createTest}>
          <label className="block text-sm font-semibold text-slate-700">Tên đề<input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label>
          <label className="block text-sm font-semibold text-slate-700">Mô tả<textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows={3} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label>
          <label className="block text-sm font-semibold text-slate-700">Ngôn ngữ<select value={form.languageId} onChange={(event) => setForm((current) => ({ ...current, languageId: event.target.value }))} required className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5"><option value="">Chọn ngôn ngữ</option>{initialLanguages.map((language) => <option key={language.id} value={language.id}>{language.name}</option>)}</select></label>
          <label className="block text-sm font-semibold text-slate-700">Chế độ chấm<select value={form.assessmentMode} onChange={(event) => setForm((current) => ({ ...current, assessmentMode: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5"><option value="STANDARD">Tiêu chuẩn</option><option value="WRITING">Writing AI</option><option value="SPEAKING">Speaking AI</option></select></label>
          <label className="block text-sm font-semibold text-slate-700">Thời gian (phút)<input type="number" min="1" max="300" value={form.timeLimit} onChange={(event) => setForm((current) => ({ ...current, timeLimit: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label>
          <button type="submit" disabled={saving} className="rounded-xl bg-blue-600 px-5 py-2.5 font-bold text-white hover:bg-blue-700 disabled:opacity-60">{saving ? "Đang tạo..." : "Tạo bài luyện tập"}</button>
        </form>
      </section>
          ) : (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-xl font-bold text-slate-950">Danh sách bài luyện tập</h2><p className="mt-1 text-sm text-slate-500">Bài test khóa học vẫn do giảng viên quản lý.</p></div>
          <div className="flex gap-2"><input aria-label="Tìm tên bài luyện tập" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm tên đề..." className="rounded-xl border border-slate-300 px-3 py-2 text-sm" /><button type="button" onClick={() => void refresh()} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold">Làm mới</button></div>
        </div>
        <div className="mt-4 space-y-3">
          {visibleTests.length === 0 ? <p className="text-sm text-slate-500">Chưa có bài luyện tập phù hợp.</p> : visibleTests.map((test) => (
            <article key={test.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div><h3 className="font-bold text-slate-950">{test.name}</h3><p className="mt-1 text-sm text-slate-500">{test.language?.name ?? "Chưa có ngôn ngữ"} · {test.assessmentMode} · {test._count.questions} câu hỏi · {test._count.attempts} lượt làm</p></div>
              <div className="flex flex-wrap gap-2">
                <Link href={`/teacher/tests/${test.id}/questions`} className="rounded-lg bg-slate-900 px-4 py-2 text-center text-sm font-bold text-white hover:bg-slate-800">Quản lý câu hỏi</Link>
                <Link href={`/teacher/tests/${test.id}`} className="rounded-lg border border-slate-300 px-4 py-2 text-center text-sm font-bold text-slate-700 hover:bg-slate-50">Chỉnh sửa</Link>
                <button
                  type="button"
                  disabled={deletingTestId === test.id}
                  onClick={() => void deleteTest(test.id)}
                  className="rounded-lg border border-red-200 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deletingTestId === test.id ? "Đang xóa..." : "Xóa"}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
          )}
        </div>
      )}
    />
  );
}
