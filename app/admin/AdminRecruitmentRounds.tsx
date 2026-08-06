"use client";

import { FormEvent, useMemo, useState } from "react";
import { ModalDialog } from "@/app/components/ModalDialog";
import { readJsonResponse } from "@/lib/http-response";
import { calculateTeacherExamAverage, getExamSkillLabels, TEACHER_EXAM_PASSING_AVERAGE } from "@/lib/teacher-exam-skills";
import type { TeacherExamLocation } from "@/lib/teacher-onboarding";

type RoundApplication = {
  id: string;
  status: string;
  createdAt: string;
  submittedAt: string | null;
  rejectionReason: string | null;
  user: { username: string; email: string; phoneNumber: string | null; role: string };
  language: { id: string; name: string; code: string };
  examLocationName: string | null;
  examLocationAddress: string | null;
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

export type AdminRecruitmentRound = {
  id: string;
  name: string;
  description: string;
  status: "DRAFT" | "OPEN" | "CLOSED" | "ARCHIVED";
  registrationOpensAt: string;
  registrationClosesAt: string;
  examStartsAt: string;
  examEndsAt: string;
  locations: TeacherExamLocation[];
  gradingTokenIssuedAt: string | null;
  createdAt: string;
  applications: RoundApplication[];
};

const APPLICATIONS_PER_PAGE = 10;

const applicationStatus: Record<string, string> = {
  PENDING: "Pending",
  INVITED_TO_EXAM: "Invited to Exam",
  CHECKED_IN: "Checked In",
  EXAM_COMPLETED: "Exam Completed",
  PASSED: "Passed",
  REJECTED: "Rejected",
  CONVERTED_TO_TEACHER: "Converted to Teacher",
};

const roundStatus = { DRAFT: "Bản nháp", OPEN: "Đang mở", CLOSED: "Đã đóng", ARCHIVED: "Lưu trữ" };

type RoundTimeForm = Pick<
  AdminRecruitmentRound,
  "registrationOpensAt" | "registrationClosesAt" | "examStartsAt" | "examEndsAt"
>;

function toDateTimeInput(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function toIsoTimes(times: RoundTimeForm) {
  return Object.fromEntries(
    Object.entries(times).map(([key, value]) => [key, new Date(value).toISOString()]),
  );
}

function ExamResultSummary({
  application,
  onViewDetails,
}: {
  application: RoundApplication;
  onViewDetails: () => void;
}) {
  const result = application.examResult;
  if (!result?.submittedAt) return <span className="text-sm text-muted-foreground">Chưa có kết quả</span>;
  const average = calculateTeacherExamAverage(result);

  return (
    <div className="flex min-w-[180px] items-center justify-between gap-3">
      <strong className="whitespace-nowrap text-base text-foreground">{average ?? "—"}/100</strong>
      <button
        type="button"
        onClick={onViewDetails}
        className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-bold text-foreground transition hover:border-primary hover:text-primary"
      >
        Chi tiết
      </button>
    </div>
  );
}

function ExamResultDetailDialog({
  application,
  onClose,
}: {
  application: RoundApplication;
  onClose: () => void;
}) {
  const result = application.examResult;
  if (!result?.submittedAt) return null;

  const labels = getExamSkillLabels(application.language.code);
  const average = calculateTeacherExamAverage(result);
  const passed = !result.failed && average !== null && average >= TEACHER_EXAM_PASSING_AVERAGE;
  const skills = [
    [labels.writing, result.writingScore],
    [labels.speaking, result.speakingScore],
    [labels.listening, result.listeningScore],
    [labels.reading, result.readingScore],
  ] as const;

  return (
    <ModalDialog labelledBy="teacher-exam-result-title" onClose={onClose} className="z-[80]">
      <section className="w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Chi tiết kết quả thi</p>
            <h2 id="teacher-exam-result-title" className="mt-1 text-2xl font-bold text-foreground">
              {application.user.username}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {application.user.email} · {application.language.name}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-bold text-foreground"
          >
            Đóng
          </button>
        </header>

        <div className="p-6">
          <div className={`rounded-xl p-4 ${passed ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
            <p className="text-sm font-semibold text-muted-foreground">Điểm trung bình</p>
            <p className={`mt-1 text-3xl font-bold ${passed ? "text-emerald-600" : "text-red-600"}`}>
              {average ?? "—"}/100
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {passed ? "Đạt" : "Không đạt"} · Mức đạt tối thiểu: {TEACHER_EXAM_PASSING_AVERAGE}/100
            </p>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {skills.map(([label, score]) => (
              <div key={label} className="rounded-xl border border-border bg-background p-4">
                <span className="block text-sm font-bold text-muted-foreground">{label}</span>
                <strong className="mt-2 block text-2xl text-foreground">{score ?? "—"}/100</strong>
              </div>
            ))}
          </div>
        </div>
      </section>
    </ModalDialog>
  );
}

export default function AdminRecruitmentRounds({ initialRounds }: {
  initialRounds: AdminRecruitmentRound[];
}) {
  const [rounds, setRounds] = useState(initialRounds);
  const [selectedRoundId, setSelectedRoundId] = useState(initialRounds[0]?.id ?? "");
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");
  const [gradingUrl, setGradingUrl] = useState("");
  const [editingTimes, setEditingTimes] = useState<RoundTimeForm | null>(null);
  const [detailApplication, setDetailApplication] = useState<RoundApplication | null>(null);
  const selectedRound = rounds.find((round) => round.id === selectedRoundId) ?? rounds[0] ?? null;
  const totalPages = Math.max(1, Math.ceil((selectedRound?.applications.length ?? 0) / APPLICATIONS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const visibleApplications = useMemo(() => selectedRound?.applications.slice((currentPage - 1) * APPLICATIONS_PER_PAGE, currentPage * APPLICATIONS_PER_PAGE) ?? [], [currentPage, selectedRound]);

  async function refresh(preferredId?: string) {
    const response = await fetch("/api/admin/recruitment-rounds", { cache: "no-store" });
    const data = await readJsonResponse(response).catch(() => ({}));
    if (response.ok) {
      const nextRounds = data.rounds as AdminRecruitmentRound[];
      setRounds(nextRounds);
      setSelectedRoundId(preferredId && nextRounds.some((round) => round.id === preferredId) ? preferredId : nextRounds[0]?.id ?? "");
    }
  }

  async function roundAction(action: string) {
    if (!selectedRound || busyId) return;
    setBusyId(`round:${selectedRound.id}`);
    setMessage("");
    const response = await fetch(`/api/admin/recruitment-rounds/${selectedRound.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await readJsonResponse(response).catch(() => ({}));
    setBusyId("");
    if (!response.ok) return setMessage(data.error ?? "Không thể cập nhật đợt tuyển.");
    if (data.gradingUrl) {
      setGradingUrl(data.gradingUrl);
      await navigator.clipboard?.writeText(data.gradingUrl).catch(() => undefined);
      setMessage("Đã tạo link chấm thi mới và sao chép vào clipboard. Link cũ đã hết hiệu lực.");
      return;
    }
    await refresh(selectedRound.id);
    setMessage("Đã cập nhật trạng thái đợt tuyển.");
  }

  function startEditingTimes() {
    if (!selectedRound) return;
    setEditingTimes({
      registrationOpensAt: toDateTimeInput(selectedRound.registrationOpensAt),
      registrationClosesAt: toDateTimeInput(selectedRound.registrationClosesAt),
      examStartsAt: toDateTimeInput(selectedRound.examStartsAt),
      examEndsAt: toDateTimeInput(selectedRound.examEndsAt),
    });
    setMessage("");
  }

  async function updateRoundTimes(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedRound || !editingTimes || busyId) return;
    setBusyId(`times:${selectedRound.id}`);
    setMessage("");
    const response = await fetch(`/api/admin/recruitment-rounds/${selectedRound.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "UPDATE_TIMES", ...toIsoTimes(editingTimes) }),
    });
    const data = await readJsonResponse(response).catch(() => ({}));
    setBusyId("");
    if (!response.ok) return setMessage(data.error ?? "Không thể cập nhật thời gian đợt tuyển.");
    setEditingTimes(null);
    await refresh(selectedRound.id);
    setMessage("Đã cập nhật thời gian đợt tuyển.");
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-5">
          <h2 className="text-2xl font-bold text-foreground">Chọn và quản lý đợt tuyển</h2>
          <p className="mt-1 text-sm text-muted-foreground">Chọn một đợt đã tạo để quản lý ứng viên, lịch thi và xuất link chấm thi.</p>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4"><label className="grid min-w-72 gap-2 text-sm font-bold">Chọn đợt tuyển<select value={selectedRound?.id ?? ""} onChange={(event) => { setSelectedRoundId(event.target.value); setPage(1); setGradingUrl(""); setEditingTimes(null); setDetailApplication(null); }} className="rounded-xl border border-border bg-background px-3 py-2.5">{rounds.map((round) => <option key={round.id} value={round.id}>{round.name} — {roundStatus[round.status]}</option>)}</select></label>{selectedRound ? <div className="flex flex-wrap gap-2"><button type="button" disabled={Boolean(busyId) || selectedRound.status === "ARCHIVED"} onClick={startEditingTimes} className="rounded-lg border border-border px-3 py-2 text-sm font-bold disabled:opacity-40">Chỉnh sửa thời gian</button><button type="button" disabled={Boolean(busyId) || selectedRound.status === "OPEN"} onClick={() => void roundAction("OPEN")} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-40">Mở đợt</button><button type="button" disabled={Boolean(busyId) || selectedRound.status !== "OPEN"} onClick={() => void roundAction("CLOSE")} className="rounded-lg border border-border px-3 py-2 text-sm font-bold disabled:opacity-40">Đóng đợt</button><button type="button" disabled={Boolean(busyId) || selectedRound.status === "DRAFT" || selectedRound.status === "ARCHIVED"} onClick={() => void roundAction("EXPORT_GRADING_LINK")} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-40">Xuất link chấm thi</button></div> : null}</div>
        {message ? <p role="status" className="mt-4 rounded-lg bg-blue-500/10 p-3 text-sm font-semibold text-blue-700">{message}</p> : null}
        {gradingUrl ? <div className="mt-3 flex gap-2"><input readOnly value={gradingUrl} className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm" /><button type="button" onClick={() => void navigator.clipboard?.writeText(gradingUrl)} className="rounded-lg border border-border px-3 py-2 text-sm font-bold">Sao chép</button></div> : null}

        {selectedRound && editingTimes ? (
          <form onSubmit={updateRoundTimes} className="mt-5 rounded-xl border border-primary/30 bg-primary/5 p-4">
            <div>
              <h3 className="font-bold text-foreground">Chỉnh sửa thời gian — {selectedRound.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">Nếu đây là đợt đang mở, lịch trên trang đăng ký giảng viên cũng được cập nhật ngay.</p>
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold">Mở đăng ký<input required type="datetime-local" value={editingTimes.registrationOpensAt} onChange={(event) => setEditingTimes((current) => current ? { ...current, registrationOpensAt: event.target.value } : current)} className="rounded-xl border border-border bg-background px-3 py-2.5" /></label>
              <label className="grid gap-2 text-sm font-semibold">Đóng đăng ký<input required type="datetime-local" value={editingTimes.registrationClosesAt} onChange={(event) => setEditingTimes((current) => current ? { ...current, registrationClosesAt: event.target.value } : current)} className="rounded-xl border border-border bg-background px-3 py-2.5" /></label>
              <label className="grid gap-2 text-sm font-semibold">Bắt đầu thi<input required type="datetime-local" value={editingTimes.examStartsAt} onChange={(event) => setEditingTimes((current) => current ? { ...current, examStartsAt: event.target.value } : current)} className="rounded-xl border border-border bg-background px-3 py-2.5" /></label>
              <label className="grid gap-2 text-sm font-semibold">Kết thúc thi<input required type="datetime-local" value={editingTimes.examEndsAt} onChange={(event) => setEditingTimes((current) => current ? { ...current, examEndsAt: event.target.value } : current)} className="rounded-xl border border-border bg-background px-3 py-2.5" /></label>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="submit" disabled={Boolean(busyId)} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-40">{busyId === `times:${selectedRound.id}` ? "Đang lưu..." : "Lưu thời gian"}</button>
              <button type="button" disabled={Boolean(busyId)} onClick={() => setEditingTimes(null)} className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-bold disabled:opacity-40">Hủy</button>
            </div>
          </form>
        ) : null}

        {selectedRound ? <>
          <div className="mt-5 grid gap-3 sm:grid-cols-4"><div className="rounded-xl bg-muted p-4"><p className="text-xs font-bold text-muted-foreground">Trạng thái</p><p className="mt-1 font-bold">{roundStatus[selectedRound.status]}</p></div><div className="rounded-xl bg-muted p-4"><p className="text-xs font-bold text-muted-foreground">Ứng viên</p><p className="mt-1 font-bold">{selectedRound.applications.length}</p></div><div className="rounded-xl bg-muted p-4"><p className="text-xs font-bold text-muted-foreground">Đăng ký</p><p className="mt-1 text-sm font-bold">{new Date(selectedRound.registrationOpensAt).toLocaleString("vi-VN")} – {new Date(selectedRound.registrationClosesAt).toLocaleString("vi-VN")}</p></div><div className="rounded-xl bg-muted p-4"><p className="text-xs font-bold text-muted-foreground">Kỳ thi</p><p className="mt-1 text-sm font-bold">{new Date(selectedRound.examStartsAt).toLocaleString("vi-VN")} – {new Date(selectedRound.examEndsAt).toLocaleString("vi-VN")}</p></div></div>
          <div className="mt-5 overflow-x-auto"><table className="min-w-[1200px] w-full text-left text-sm"><thead className="bg-muted text-xs uppercase text-muted-foreground"><tr><th className="px-3 py-3">Ứng viên</th><th className="px-3 py-3">Liên hệ</th><th className="px-3 py-3">Ngôn ngữ</th><th className="px-3 py-3">Ngày đăng ký</th><th className="px-3 py-3">Trạng thái</th><th className="px-3 py-3">Tham gia thi</th><th className="min-w-[210px] px-3 py-3">Kết quả thi</th></tr></thead><tbody>{visibleApplications.map((application) => {
            const result = application.examResult;
            return <tr key={application.id} className="border-t border-border align-middle"><td className="px-3 py-4"><strong>{application.user.username}</strong><p className="mt-1 text-xs text-muted-foreground">{application.examLocationName ?? "Chưa chọn địa điểm"}</p></td><td className="px-3 py-4"><p>{application.user.email}</p><p className="mt-1 text-xs text-muted-foreground">{application.user.phoneNumber ?? "Chưa có SĐT"}</p></td><td className="px-3 py-4 font-semibold">{application.language.name}</td><td className="px-3 py-4">{new Date(application.createdAt).toLocaleString("vi-VN")}</td><td className="px-3 py-4"><span className="rounded-full bg-muted px-2.5 py-1 text-xs font-bold">{applicationStatus[application.status] ?? application.status}</span></td><td className="px-3 py-4 text-xs"><p>{result?.checkedIn ? "✓ Đã đến" : "Chưa đến"}</p><p className="mt-1">{result?.completed ? "✓ Đã hoàn thành" : "Chưa hoàn thành"}</p></td><td className="px-3 py-4"><ExamResultSummary application={application} onViewDetails={() => setDetailApplication(application)} /></td></tr>;
          })}</tbody></table></div>
          <div className="mt-4 flex items-center justify-between text-sm"><span>Trang {currentPage}/{totalPages} · {selectedRound.applications.length} ứng viên</span><div className="flex gap-2"><button type="button" disabled={currentPage === 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded-lg border border-border px-3 py-2 disabled:opacity-40">Trước</button><button type="button" disabled={currentPage === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} className="rounded-lg border border-border px-3 py-2 disabled:opacity-40">Sau</button></div></div>
        </> : <p className="mt-5 rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">Chưa có đợt tuyển. Hãy mở mục “Tạo đợt tuyển mới” ở cột bên trái.</p>}
        {detailApplication ? (
          <ExamResultDetailDialog
            application={detailApplication}
            onClose={() => setDetailApplication(null)}
          />
        ) : null}
    </section>
  );
}
