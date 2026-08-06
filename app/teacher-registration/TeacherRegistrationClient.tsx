"use client";

import { FormEvent, useState } from "react";
import { readJsonResponse } from "@/lib/http-response";

type TeacherRegistrationData = Awaited<ReturnType<typeof import("@/lib/teacher-registration-data").getTeacherRegistrationData>>;

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) : "Chưa cập nhật";
}

const statusLabel: Record<string, string> = {
  PENDING: "Đang chờ duyệt hồ sơ",
  INVITED_TO_EXAM: "Đã được mời dự thi",
  CHECKED_IN: "Đã đến thi",
  EXAM_COMPLETED: "Đã hoàn thành bài thi",
  PASSED: "Đã đạt",
  CONVERTED_TO_TEACHER: "Đã chuyển thành giảng viên",
  UNDER_REVIEW: "Đang xem xét",
  APPROVED: "Đã duyệt",
  REJECTED: "Từ chối",
  EXPIRED: "Hết hạn",
};

export default function TeacherRegistrationClient({ initialData }: { initialData: TeacherRegistrationData }) {
  const [applications, setApplications] = useState(initialData.applications);
  const [form, setForm] = useState({
    languageId: "",
    locationId: "",
    files: [] as File[],
    expiryDates: [] as string[],
    message: "",
    submitting: false,
  });
  const { languageId, locationId, files, expiryDates, message, submitting } = form;
  const { setting, activeRound, registrationOpen, languages } = initialData;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setForm((current) => ({ ...current, submitting: true, message: "" }));
    try {
      const formData = new FormData();
      formData.set("languageId", languageId);
      formData.set("locationId", locationId);
      formData.set("expiryDates", JSON.stringify(expiryDates));
      files.forEach((file) => formData.append("certificates", file));
      const response = await fetch("/api/teacher-applications", { method: "POST", body: formData });
      const data = await readJsonResponse(response).catch(() => ({}));
      if (!response.ok) {
        setForm((current) => ({ ...current, message: data.error ?? "Không thể đăng ký." }));
        return;
      }
      setApplications((current) => [data.application, ...current]);
      setForm((current) => ({
        ...current,
        languageId: "",
        locationId: "",
        files: [],
        expiryDates: [],
        message: "Đăng ký thành công. Vui lòng tham dự kỳ thi trực tiếp theo thông báo.",
      }));
    } finally {
      setForm((current) => ({ ...current, submitting: false }));
    }
  }

  return (
    <main className="min-h-dvh bg-slate-50 py-8">
      <div className="mx-auto max-w-5xl space-y-6 px-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-wide text-blue-700">Thông báo tuyển giảng viên</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">{setting.title}</h1>
          {activeRound ? <p className="mt-2 text-sm font-bold text-blue-700">Đợt tuyển hiện tại: {activeRound.name}</p> : null}
          <p className="mt-3 whitespace-pre-wrap leading-7 text-slate-600">{setting.description}</p>
          <dl className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-4 sm:col-span-2"><dt className="text-xs font-bold uppercase text-slate-500">Địa điểm thi</dt><dd className="mt-2 space-y-2">{setting.locations.length > 0 ? setting.locations.map((location) => <div key={location.id} className="rounded-lg border border-slate-200 bg-white p-3"><p className="font-bold text-slate-900">{location.name}</p><p className="mt-1 text-sm text-slate-600">{location.address}</p>{location.note ? <p className="mt-1 text-xs text-slate-500">{location.note}</p> : null}</div>) : <span className="font-semibold text-slate-900">{setting.location || "Chưa cập nhật"}</span>}</dd></div>
            <div className="rounded-xl bg-slate-50 p-4"><dt className="text-xs font-bold uppercase text-slate-500">Thời gian thi</dt><dd className="mt-1 font-semibold text-slate-900">{formatDate(setting.examStartsAt)}{setting.examEndsAt ? ` – ${formatDate(setting.examEndsAt)}` : ""}</dd></div>
            <div className="rounded-xl bg-slate-50 p-4"><dt className="text-xs font-bold uppercase text-slate-500">Mở đăng ký</dt><dd className="mt-1 font-semibold text-slate-900">{formatDate(setting.registrationOpensAt)}</dd></div>
            <div className="rounded-xl bg-slate-50 p-4"><dt className="text-xs font-bold uppercase text-slate-500">Đóng đăng ký</dt><dd className="mt-1 font-semibold text-slate-900">{formatDate(setting.registrationClosesAt)}</dd></div>
          </dl>
        </section>

        {registrationOpen ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-950">Đăng ký tham dự kỳ thi trực tiếp</h2>
            <p className="mt-2 text-sm text-slate-600">Chọn ngôn ngữ, địa điểm thi và nộp chứng chỉ. Bài thi được thực hiện trực tiếp trên giấy.</p>
            <form onSubmit={submit} className="mt-5 grid gap-4">
              <label className="text-sm font-semibold text-slate-700">Ngôn ngữ giảng dạy
                <select value={languageId} onChange={(event) => setForm((current) => ({ ...current, languageId: event.target.value }))} required className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5">
                  <option value="">Chọn ngôn ngữ</option>
                  {languages.map((language) => <option key={language.id} value={language.id}>{language.name}</option>)}
                </select>
              </label>
              <label className="text-sm font-semibold text-slate-700">Địa điểm thi
                <select value={locationId} onChange={(event) => setForm((current) => ({ ...current, locationId: event.target.value }))} required className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5">
                  <option value="">Chọn địa điểm thi</option>
                  {setting.locations.map((location) => <option key={location.id} value={location.id}>{location.name} — {location.address}</option>)}
                </select>
              </label>
              <label className="text-sm font-semibold text-slate-700">Chứng chỉ (1–3 tệp JPG, PNG hoặc PDF)
                <input type="file" accept=".jpg,.jpeg,.png,.pdf" multiple required onChange={(event) => {
                  const selected = Array.from(event.target.files ?? []).slice(0, 3);
                  setForm((current) => ({ ...current, files: selected, expiryDates: selected.map(() => "") }));
                }} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5" />
              </label>
              {files.map((file, index) => (
                <label key={`${file.name}-${file.lastModified}`} className="rounded-xl border border-slate-200 p-4 text-sm font-semibold text-slate-700">Ngày hết hạn — {file.name}
                  <input type="date" required value={expiryDates[index] ?? ""} onChange={(event) => setForm((current) => ({ ...current, expiryDates: current.expiryDates.map((value, itemIndex) => itemIndex === index ? event.target.value : value) }))} className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2" />
                </label>
              ))}
              {message ? <p className="text-sm font-medium text-blue-700">{message}</p> : null}
              <button type="submit" disabled={submitting} className="w-fit rounded-xl bg-blue-600 px-5 py-2.5 font-bold text-white hover:bg-blue-700 disabled:opacity-60">{submitting ? "Đang gửi..." : "Đăng ký kỳ thi"}</button>
            </form>
          </section>
        ) : (
          <p className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-semibold text-amber-800">Hiện chưa mở đăng ký hoặc đã qua thời hạn đăng ký.</p>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-950">Lịch sử đăng ký</h2>
          <div className="mt-4 space-y-3">
            {applications.length === 0 ? <p className="text-sm text-slate-500">Chưa có hồ sơ.</p> : null}
            {applications.map((application) => (
              <article key={application.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-bold text-slate-900">{application.language.name} · lần #{application.attemptNo}</p><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{statusLabel[application.status] ?? application.status}</span></div>
                {application.examLocationName ? <p className="mt-2 text-sm font-semibold text-slate-700">{application.examLocationName} — {application.examLocationAddress}</p> : null}
                <p className="mt-1 text-sm text-slate-500">{formatDate(application.createdAt)}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
