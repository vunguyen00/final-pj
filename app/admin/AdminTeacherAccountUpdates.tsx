"use client";

import { useMemo, useState } from "react";
import { readJsonResponse } from "@/lib/http-response";
import { calculateTeacherExamAverage, TEACHER_EXAM_PASSING_AVERAGE } from "@/lib/teacher-exam-skills";
import type { AdminRecruitmentRound } from "./AdminRecruitmentRounds";

export default function AdminTeacherAccountUpdates({ initialRounds }: { initialRounds: AdminRecruitmentRound[] }) {
  const [rounds, setRounds] = useState(initialRounds);
  const [selectedRoundId, setSelectedRoundId] = useState(initialRounds[0]?.id ?? "");
  const [selectedApplicationIds, setSelectedApplicationIds] = useState<string[]>([]);
  const [state, setState] = useState({ saving: false, message: "", error: false });
  const selectedRound = rounds.find((round) => round.id === selectedRoundId) ?? rounds[0] ?? null;
  const groupedApplications = useMemo(() => {
    const groups = new Map<string, {
      languageName: string;
      applications: NonNullable<typeof selectedRound>["applications"];
    }>();
    for (const application of selectedRound?.applications ?? []) {
      const group = groups.get(application.language.id);
      groups.set(application.language.id, {
        languageName: application.language.name,
        applications: [...(group?.applications ?? []), application],
      });
    }
    return [...groups.entries()].map(([languageId, group]) => ({
      languageId,
      ...group,
    }));
  }, [selectedRound]);
  const eligibleIds = selectedRound?.applications.filter((application) => {
    const average = application.examResult ? calculateTeacherExamAverage(application.examResult) : null;
    return application.status === "PASSED" && !application.examResult?.failed && average !== null && average >= TEACHER_EXAM_PASSING_AVERAGE;
  }).map((application) => application.id) ?? [];

  function toggleApplication(applicationId: string, checked: boolean) {
    setSelectedApplicationIds((current) => checked
      ? [...new Set([...current, applicationId])]
      : current.filter((id) => id !== applicationId));
  }

  async function refresh() {
    const response = await fetch("/api/admin/recruitment-rounds", { cache: "no-store" });
    const data = await readJsonResponse(response).catch(() => ({}));
    if (response.ok) setRounds(data.rounds as AdminRecruitmentRound[]);
  }

  async function convertSelected() {
    if (state.saving || selectedApplicationIds.length === 0) return;
    setState({ saving: true, message: "", error: false });
    const results = await Promise.all(selectedApplicationIds.map(async (applicationId) => {
      const response = await fetch(`/api/admin/recruitment-applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "CONVERT_TO_TEACHER" }),
      });
      const data = await readJsonResponse(response).catch(() => ({}));
      return { ok: response.ok, error: data.error as string | undefined };
    }));
    const converted = results.filter((result) => result.ok).length;
    const failed = results.length - converted;
    await refresh();
    setSelectedApplicationIds([]);
    setState({
      saving: false,
      message: failed > 0
        ? `Đã chuyển ${converted} tài khoản; ${failed} tài khoản không thể cập nhật.`
        : `Đã chuyển ${converted} tài khoản thành giảng viên đúng ngôn ngữ đăng ký.`,
      error: failed > 0,
    });
  }

  return (
    <section className="rounded-2xl border border-border bg-card shadow-sm">
      <header className="border-b border-border px-6 py-5">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Cập nhật theo danh sách đăng ký</p>
        <h2 className="mt-1 text-2xl font-bold text-foreground">Chuyển tài khoản Student thành Teacher</h2>
        <p className="mt-1 text-sm text-muted-foreground">Chỉ tích ứng viên có điểm trung bình bốn kỹ năng từ {TEACHER_EXAM_PASSING_AVERAGE}/100. Tài khoản không được tích vẫn giữ nguyên Student; ngôn ngữ giảng dạy luôn lấy từ hồ sơ đăng ký.</p>
      </header>
      <div className="space-y-5 p-6">
        <label className="grid max-w-xl gap-2 text-sm font-bold">Đợt tuyển<select value={selectedRound?.id ?? ""} onChange={(event) => { setSelectedRoundId(event.target.value); setSelectedApplicationIds([]); }} className="rounded-xl border border-border bg-background px-3 py-2.5">{rounds.map((round) => <option key={round.id} value={round.id}>{round.name}</option>)}</select></label>
        {selectedRound ? <>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted p-4"><div><p className="font-bold text-foreground">{selectedRound.name}</p><p className="mt-1 text-sm text-muted-foreground">{eligibleIds.length} ứng viên đủ điều kiện · {selectedApplicationIds.length} tài khoản được chọn</p></div><div className="flex gap-2"><button type="button" disabled={eligibleIds.length === 0 || state.saving} onClick={() => setSelectedApplicationIds(eligibleIds)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-bold disabled:opacity-40">Chọn tất cả đủ điều kiện</button><button type="button" disabled={selectedApplicationIds.length === 0 || state.saving} onClick={() => void convertSelected()} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-40">{state.saving ? "Đang cập nhật..." : `Chuyển ${selectedApplicationIds.length} tài khoản`}</button></div></div>
          {state.message ? <p role="status" className={`rounded-lg p-3 text-sm font-semibold ${state.error ? "bg-red-500/10 text-red-600" : "bg-emerald-500/10 text-emerald-600"}`}>{state.message}</p> : null}
          <div className="space-y-5">{groupedApplications.map((group) => <section key={group.languageId} className="overflow-hidden rounded-xl border border-border"><header className="flex items-center justify-between bg-muted px-4 py-3"><h3 className="font-bold text-foreground">Giảng viên {group.languageName}</h3><span className="text-xs font-bold text-muted-foreground">{group.applications.length} hồ sơ</span></header><div className="overflow-x-auto"><table className="min-w-[760px] w-full text-left text-sm"><thead className="text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-3 text-center">Chuyển Teacher</th><th className="px-4 py-3">Tài khoản</th><th className="px-4 py-3">Ngôn ngữ được cấp</th><th className="px-4 py-3">Điểm trung bình 4 kỹ năng</th></tr></thead><tbody>{group.applications.map((application) => {
            const average = application.examResult ? calculateTeacherExamAverage(application.examResult) : null;
            const eligible = application.status === "PASSED" && !application.examResult?.failed && average !== null && average >= TEACHER_EXAM_PASSING_AVERAGE;
            const converted = application.status === "CONVERTED_TO_TEACHER";
            const passed = !application.examResult?.failed && average !== null && average >= TEACHER_EXAM_PASSING_AVERAGE;
            return <tr key={application.id} className="border-t border-border"><td className="px-4 py-4 text-center"><input type="checkbox" checked={converted || selectedApplicationIds.includes(application.id)} disabled={!eligible || state.saving} onChange={(event) => toggleApplication(application.id, event.target.checked)} aria-label={`Chuyển ${application.user.username} thành giáo viên ${application.language.name}`} className="size-5" /></td><td className="px-4 py-4"><strong>{application.user.username}</strong><p className="mt-1 text-xs text-muted-foreground">{application.user.email}</p></td><td className="px-4 py-4"><span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">Giáo viên {application.language.name}</span></td><td className="px-4 py-4"><strong className={passed ? "text-emerald-600" : "text-red-600"}>{average === null ? "Chưa có đủ điểm" : `${average}/100 — ${passed ? "Đạt" : "Không đạt"}`}</strong></td></tr>;
          })}</tbody></table></div></section>)}</div>
        </> : <p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">Chưa có đợt tuyển hoặc hồ sơ đăng ký.</p>}
      </div>
    </section>
  );
}
