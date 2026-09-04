"use client";

import { useMemo, useState } from "react";
import { readJsonResponse } from "@/lib/http-response";
import {
  normalizeTeacherExamScoreInput,
  TEACHER_EXAM_MAX_SCORE,
  TEACHER_EXAM_MIN_SCORE,
  TEACHER_EXAM_PASSING_AVERAGE,
} from "@/lib/teacher-exam-skills";

type SkillLabels = { writing: string; speaking: string; listening: string; reading: string };

export type GradingApplication = {
  id: string;
  status: string;
  user: { username: string; email: string };
  language: { id: string; name: string; code: string };
  examLocationName: string | null;
  examLocationAddress: string | null;
  certificates: { id: string; fileName: string; fileUrl: string }[];
  skillLabels: SkillLabels;
  examResult: {
    checkedIn: boolean;
    completed: boolean;
    writingScore: number | null;
    speakingScore: number | null;
    listeningScore: number | null;
    readingScore: number | null;
    failed: boolean;
    submittedAt: string | null;
  } | null;
};

type GradingForm = {
  checkedIn: boolean;
  completed: boolean;
  writingScore: string;
  speakingScore: string;
  listeningScore: string;
  readingScore: string;
  failed: boolean;
};

type SavedGradingResult = {
  applicationId: string;
  status: string;
  failed: boolean;
  submittedAt: string;
};

function createGradingForm(application: GradingApplication): GradingForm {
  const canHaveExamOutcome = Boolean(application.examResult?.checkedIn && application.examResult.completed);
  return {
    checkedIn: application.examResult?.checkedIn ?? false,
    completed: application.examResult?.completed ?? false,
    writingScore: canHaveExamOutcome ? application.examResult?.writingScore?.toString() ?? "" : "",
    speakingScore: canHaveExamOutcome ? application.examResult?.speakingScore?.toString() ?? "" : "",
    listeningScore: canHaveExamOutcome ? application.examResult?.listeningScore?.toString() ?? "" : "",
    readingScore: canHaveExamOutcome ? application.examResult?.readingScore?.toString() ?? "" : "",
    failed: canHaveExamOutcome ? application.examResult?.failed ?? false : false,
  };
}

function isApplicationLocked(application: GradingApplication) {
  return (["DRAFT", "SUBMITTED", "UNDER_REVIEW", "PENDING", "CONVERTED_TO_TEACHER"] as string[]).includes(application.status)
    || (application.status === "REJECTED" && !application.examResult);
}

export type GradingRoundData = {
  id: string;
  name: string;
  status: string;
  examStartsAt: string;
  examEndsAt: string;
  locations: { id: string; name: string; address: string; note: string }[];
  applications: GradingApplication[];
};

function ScoreInput({ label, value, disabled, onChange }: { label: string; value: string; disabled: boolean; onChange: (value: string) => void }) {
  return (
    <label className="grid w-full gap-2 text-sm font-bold text-slate-600">
      {label}
      <input
        type="number"
        min={TEACHER_EXAM_MIN_SCORE}
        max={TEACHER_EXAM_MAX_SCORE}
        step="0.1"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(normalizeTeacherExamScoreInput(event.target.value))}
        className="h-11 w-full rounded-xl border border-slate-300 px-3 text-base text-slate-950 disabled:bg-slate-100 disabled:opacity-60"
      />
    </label>
  );
}

function GradingRow({ application, form, onChange }: { application: GradingApplication; form: GradingForm; onChange: (nextForm: GradingForm) => void }) {
  const locked = isApplicationLocked(application);
  const completionLocked = locked || !form.checkedIn;
  const gradingLocked = completionLocked || !form.completed;
  const updateForm = (changes: Partial<GradingForm>) => onChange({ ...form, ...changes });
  return (
    <tr className="border-t border-slate-200 align-middle">
      <td className="px-4 py-5"><strong className="text-slate-950">{application.user.username}</strong><p className="mt-1 text-xs text-slate-500">{application.user.email}</p></td>
      <td className="px-4 py-5 text-sm font-semibold text-slate-700">{application.language.name}</td>
      <td className="px-4 py-5"><strong className="text-sm text-slate-800">{application.examLocationName ?? "Chưa chọn"}</strong>{application.examLocationAddress ? <p className="mt-1 text-xs text-slate-500">{application.examLocationAddress}</p> : null}</td>
      <td className="px-4 py-5">
        {application.certificates.length > 0 ? <div className="space-y-1">{application.certificates.map((certificate, index) => <a key={certificate.id} href={certificate.fileUrl} target="_blank" rel="noreferrer" title={certificate.fileName} className="block text-sm font-semibold text-blue-700 underline">Chứng chỉ {index + 1}</a>)}</div> : <span className="text-sm text-slate-400">Không có</span>}
      </td>
      <td className="px-4 py-5"><div className="flex h-[72px] items-end justify-center"><input type="checkbox" checked={form.checkedIn} disabled={locked} onChange={(event) => updateForm(event.target.checked ? { checkedIn: true } : { checkedIn: false, completed: false, writingScore: "", speakingScore: "", listeningScore: "", readingScore: "", failed: false })} className="size-11 cursor-pointer rounded-lg disabled:cursor-not-allowed" aria-label={`Đã đến: ${application.user.username}`} /></div></td>
      <td className="px-4 py-5"><div className="flex h-[72px] items-end justify-center"><input type="checkbox" checked={form.completed} disabled={completionLocked} onChange={(event) => updateForm(event.target.checked ? { completed: true } : { completed: false, writingScore: "", speakingScore: "", listeningScore: "", readingScore: "", failed: false })} className="size-11 cursor-pointer rounded-lg disabled:cursor-not-allowed disabled:opacity-40" aria-label={`Hoàn thành bài thi: ${application.user.username}`} /></div></td>
      <td className="px-4 py-5"><ScoreInput label={application.skillLabels.writing} value={form.writingScore} disabled={gradingLocked} onChange={(writingScore) => updateForm({ writingScore })} /></td>
      <td className="px-4 py-5"><ScoreInput label={application.skillLabels.speaking} value={form.speakingScore} disabled={gradingLocked} onChange={(speakingScore) => updateForm({ speakingScore })} /></td>
      <td className="px-4 py-5"><ScoreInput label={application.skillLabels.listening} value={form.listeningScore} disabled={gradingLocked} onChange={(listeningScore) => updateForm({ listeningScore })} /></td>
      <td className="px-4 py-5"><ScoreInput label={application.skillLabels.reading} value={form.readingScore} disabled={gradingLocked} onChange={(readingScore) => updateForm({ readingScore })} /></td>
      <td className="px-4 py-5"><div className="flex h-[72px] items-end justify-center"><input type="checkbox" checked={form.failed} disabled={gradingLocked} onChange={(event) => updateForm({ failed: event.target.checked })} className="size-11 cursor-pointer rounded-lg disabled:cursor-not-allowed disabled:opacity-40" aria-label={`Trượt: ${application.user.username}`} /></div></td>
    </tr>
  );
}

export default function RecruitmentGradingClient({ token, initialRound }: { token: string; initialRound: GradingRoundData }) {
  const [round, setRound] = useState(initialRound);
  const [forms, setForms] = useState<Record<string, GradingForm>>(() => Object.fromEntries(initialRound.applications.map((application) => [application.id, createGradingForm(application)])));
  const [dirtyIds, setDirtyIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [languageId, setLanguageId] = useState("");
  const [locationName, setLocationName] = useState("");
  const [submitState, setSubmitState] = useState({ saving: false, message: "", error: false });

  const languages = useMemo(() => Array.from(new Map(round.applications.map((application) => [application.language.id, application.language])).values()), [round.applications]);
  const locations = useMemo(() => Array.from(new Set(round.applications.map((application) => application.examLocationName).filter((name): name is string => Boolean(name)))).sort((left, right) => left.localeCompare(right, "vi")), [round.applications]);
  const filteredApplications = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase("vi");
    return round.applications.filter((application) => {
      const matchesSearch = !keyword || `${application.user.username} ${application.user.email}`.toLocaleLowerCase("vi").includes(keyword);
      const matchesLanguage = !languageId || application.language.id === languageId;
      const matchesLocation = !locationName || application.examLocationName === locationName;
      return matchesSearch && matchesLanguage && matchesLocation;
    });
  }, [languageId, locationName, round.applications, search]);

  function updateApplicationForm(applicationId: string, nextForm: GradingForm) {
    setForms((current) => ({ ...current, [applicationId]: nextForm }));
    setDirtyIds((current) => current.includes(applicationId) ? current : [...current, applicationId]);
    setSubmitState((current) => ({ ...current, message: "", error: false }));
  }

  async function submitResults() {
    if (submitState.saving || dirtyIds.length === 0) return;
    const submittedIds = dirtyIds.filter((applicationId) => {
      const application = round.applications.find((item) => item.id === applicationId);
      return application && !isApplicationLocked(application);
    });
    if (submittedIds.length === 0) {
      setSubmitState({ saving: false, message: "Không có kết quả hợp lệ để nộp.", error: true });
      return;
    }

    setSubmitState({ saving: true, message: "", error: false });
    const response = await fetch(`/api/recruitment-grading/${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ results: submittedIds.map((applicationId) => ({ applicationId, ...forms[applicationId] })) }),
    });
    const data = await readJsonResponse(response).catch(() => ({}));
    if (!response.ok) {
      setSubmitState({ saving: false, message: data.error ?? "Không thể nộp kết quả.", error: true });
      return;
    }

    const savedResults = (data.results ?? []) as SavedGradingResult[];
    const savedById = new Map(savedResults.map((result) => [result.applicationId, result]));
    setRound((current) => ({
      ...current,
      applications: current.applications.map((application) => {
        const saved = savedById.get(application.id);
        const form = forms[application.id];
        if (!saved || !form) return application;
        return {
          ...application,
          status: saved.status,
          examResult: {
            checkedIn: form.checkedIn,
            completed: form.completed,
            writingScore: form.writingScore === "" ? null : Number(form.writingScore),
            speakingScore: form.speakingScore === "" ? null : Number(form.speakingScore),
            listeningScore: form.listeningScore === "" ? null : Number(form.listeningScore),
            readingScore: form.readingScore === "" ? null : Number(form.readingScore),
            failed: saved.failed,
            submittedAt: saved.submittedAt,
          },
        };
      }),
    }));
    setDirtyIds((current) => current.filter((applicationId) => !savedById.has(applicationId)));
    setSubmitState({ saving: false, message: `Đã nộp ${savedResults.length} kết quả.`, error: false });
  }

  return (
    <main className="min-h-dvh bg-slate-100 py-8">
      <div className="mx-auto max-w-[1600px] space-y-5 px-4">
        <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">Bảng chấm thi tuyển giảng viên</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">{round.name}</h1>
          <p className="mt-2 text-sm text-slate-600">Thời gian thi: {new Date(round.examStartsAt).toLocaleString("vi-VN")} – {new Date(round.examEndsAt).toLocaleString("vi-VN")}</p>
          <p className="mt-1 text-sm text-slate-600">{round.applications.length} ứng viên · Điều kiện đạt: trung bình bốn kỹ năng từ {TEACHER_EXAM_PASSING_AVERAGE}/100 · Link này chỉ cho phép nhập kết quả, không thể cấp quyền tài khoản.</p>
        </header>
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="overflow-x-auto">
            <div className="items-end gap-3" style={{ display: "flex", minWidth: 900 }}>
              <label className="grid min-w-0 gap-1 text-sm font-bold text-slate-700" style={{ flex: "1 1 420px" }}>Tìm kiếm thí sinh<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nhập họ tên hoặc email..." className="h-11 w-full rounded-xl border border-slate-300 px-3 font-normal outline-none focus:border-blue-500" /></label>
              <label className="grid shrink-0 gap-1 text-sm font-bold text-slate-700" style={{ width: 180 }}>Ngôn ngữ<select value={languageId} onChange={(event) => setLanguageId(event.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 font-normal outline-none focus:border-blue-500"><option value="">Tất cả ngôn ngữ</option>{languages.map((language) => <option key={language.id} value={language.id}>{language.name}</option>)}</select></label>
              <label className="grid shrink-0 gap-1 text-sm font-bold text-slate-700" style={{ width: 210 }}>Địa điểm thi<select value={locationName} onChange={(event) => setLocationName(event.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 font-normal outline-none focus:border-blue-500"><option value="">Tất cả địa điểm</option>{locations.map((location) => <option key={location} value={location}>{location}</option>)}</select></label>
              <button type="button" onClick={() => void submitResults()} disabled={submitState.saving || dirtyIds.length === 0} className="h-11 shrink-0 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50" style={{ width: 176 }}>{submitState.saving ? "Đang nộp..." : `Nộp kết quả (${dirtyIds.length})`}</button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
            <p>Hiển thị {filteredApplications.length}/{round.applications.length} thí sinh · {dirtyIds.length} kết quả chưa nộp</p>
            {submitState.message ? <p role={submitState.error ? "alert" : "status"} className={`font-semibold ${submitState.error ? "text-red-600" : "text-emerald-600"}`}>{submitState.message}</p> : null}
          </div>
        </section>
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1750px] table-fixed text-left">
              <colgroup>
                <col className="w-[250px]" />
                <col className="w-[120px]" />
                <col className="w-[190px]" />
                <col className="w-[140px]" />
                <col className="w-[110px]" />
                <col className="w-[120px]" />
                <col className="w-[150px]" />
                <col className="w-[150px]" />
                <col className="w-[150px]" />
                <col className="w-[150px]" />
                <col className="w-[110px]" />
              </colgroup>
              <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-4">Họ tên / Email</th><th className="px-4 py-4">Ngôn ngữ</th><th className="px-4 py-4">Địa điểm thi</th><th className="px-4 py-4">Chứng chỉ</th><th className="px-4 py-4 text-center">Đã đến</th><th className="px-4 py-4 text-center">Hoàn thành</th><th className="px-4 py-4">Kỹ năng 1</th><th className="px-4 py-4">Kỹ năng 2</th><th className="px-4 py-4">Kỹ năng 3</th><th className="px-4 py-4">Kỹ năng 4</th><th className="px-4 py-4 text-center">Trượt</th></tr></thead>
              <tbody>{filteredApplications.length > 0 ? filteredApplications.map((application) => <GradingRow key={application.id} application={application} form={forms[application.id] ?? createGradingForm(application)} onChange={(nextForm) => updateApplicationForm(application.id, nextForm)} />) : <tr><td colSpan={11} className="px-4 py-12 text-center text-sm text-slate-500">Không tìm thấy thí sinh phù hợp.</td></tr>}</tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
