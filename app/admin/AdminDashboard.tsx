"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { readJsonResponse } from "@/lib/http-response";
import AdminWorkspace from "./AdminWorkspace";
import type { Application, Course } from "./types";

function applicationStatusLabel(status: string) {
  if (status === "PENDING") return "Chờ duyệt hồ sơ";
  if (status === "INVITED_TO_EXAM") return "Đã mời dự thi";
  if (status === "APPROVED") return "Đã duyệt";
  if (status === "REJECTED") return "Từ chối";
  if (status === "UNDER_REVIEW") return "Chờ xem xét";
  if (status === "EXPIRED") return "Hết hạn";
  return status;
}

function canReviewTeacherApplication(application: Application) {
  return Boolean(application.recruitmentRoundId) && (application.status === "PENDING" || application.status === "UNDER_REVIEW");
}

function courseStatusLabel(status: Course["status"]) {
  if (status === "PENDING_APPROVAL") return "Chờ duyệt";
  if (status === "PENDING_DELETE") return "Chờ duyệt xóa";
  if (status === "ACTIVE") return "Đang hoạt động";
  if (status === "LOCKED") return "Đã khóa";
  return "Bị từ chối";
}

const APPLICATIONS_PER_PAGE = 10;

function certificateDisplayName(fileName: string) {
  const normalizedName = fileName.trim();
  return normalizedName.length > 5 ? `${normalizedName.slice(0, 5)}…` : normalizedName;
}

function TeacherApplicationsSection({
  applications,
  busyId,
  onRefresh,
  onReview,
}: {
  applications: Application[];
  busyId: string | null;
  onRefresh: () => Promise<void>;
  onReview: (application: Application, action: "INVITE_TO_EXAM" | "REJECT") => Promise<void>;
}) {
  const [requestedPage, setRequestedPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(applications.length / APPLICATIONS_PER_PAGE));
  const currentPage = Math.min(requestedPage, totalPages);
  const startIndex = (currentPage - 1) * APPLICATIONS_PER_PAGE;
  const visibleApplications = applications.slice(startIndex, startIndex + APPLICATIONS_PER_PAGE);
  const firstVisible = applications.length === 0 ? 0 : startIndex + 1;
  const lastVisible = Math.min(startIndex + APPLICATIONS_PER_PAGE, applications.length);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-950">Duyệt hồ sơ đăng ký giảng viên</h2>
          <p className="mt-1 text-sm text-slate-500">Kiểm tra hồ sơ, chứng chỉ và địa điểm trước khi mời ứng viên dự thi hoặc từ chối.</p>
        </div>
        <button type="button" onClick={() => void onRefresh()} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Làm mới</button>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-[1180px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr><th className="px-4 py-3">Ứng viên</th><th className="px-4 py-3">Đợt tuyển</th><th className="px-4 py-3">Ngôn ngữ</th><th className="px-4 py-3">Địa điểm thi</th><th className="px-4 py-3">Chứng chỉ</th><th className="px-4 py-3">Trạng thái</th><th className="sticky right-0 z-10 min-w-44 bg-slate-50 px-4 py-3 text-right">Hành động</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visibleApplications.map((application) => (
              <tr key={application.id}>
                <td className="px-4 py-4"><strong>{application.user.username}</strong><p className="text-xs text-slate-500">{application.user.email}</p></td>
                <td className="px-4 py-4"><strong>{application.recruitmentRound?.name ?? "Chưa phân đợt"}</strong>{application.recruitmentRound ? <p className="mt-1 text-xs text-slate-500">{application.recruitmentRound.status}</p> : null}</td>
                <td className="px-4 py-4">{application.language.name}</td>
                <td className="px-4 py-4"><strong>{application.examLocationName || "Chưa chọn"}</strong>{application.examLocationAddress ? <p className="mt-1 text-xs text-slate-500">{application.examLocationAddress}</p> : null}</td>
                <td className="px-4 py-4">{application.certificates.map((certificate) => <a key={certificate.id} href={certificate.fileUrl} target="_blank" rel="noreferrer" title={certificate.fileName} aria-label={`Mở chứng chỉ ${certificate.fileName}`} className="mr-2 text-blue-700 underline">{certificateDisplayName(certificate.fileName)}</a>)}</td>
                <td className="px-4 py-4">{applicationStatusLabel(application.status)}</td>
                <td className="sticky right-0 z-[1] min-w-44 bg-white px-4 py-4 shadow-[-10px_0_14px_-16px_rgba(15,23,42,0.45)]">
                  <div className="flex justify-end gap-2 whitespace-nowrap">
                    {canReviewTeacherApplication(application) ? <>
                      <button type="button" disabled={busyId === application.id} onClick={() => void onReview(application, "INVITE_TO_EXAM")} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-60">Mời dự thi</button>
                      <button type="button" disabled={busyId === application.id} onClick={() => void onReview(application, "REJECT")} className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-60">Từ chối</button>
                    </> : application.status === "PENDING" || application.status === "UNDER_REVIEW" ? <span className="text-xs font-semibold text-amber-700">Cần thuộc một đợt tuyển</span> : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
        <p>Hiển thị {firstVisible}–{lastVisible} / {applications.length} hồ sơ</p>
        <div className="flex items-center gap-2">
          <button type="button" disabled={currentPage === 1} onClick={() => setRequestedPage((page) => Math.max(1, page - 1))} className="rounded-lg border border-slate-200 px-3 py-2 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40">Trước</button>
          <span>Trang {currentPage}/{totalPages}</span>
          <button type="button" disabled={currentPage === totalPages} onClick={() => setRequestedPage((page) => Math.min(totalPages, page + 1))} className="rounded-lg border border-slate-200 px-3 py-2 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40">Sau</button>
        </div>
      </div>
    </section>
  );
}

export default function AdminDashboard({
  initialCourseAutoApproval,
  initialApplications,
  initialCourses,
}: {
  initialEnabled: boolean;
  initialCourseAutoApproval: boolean;
  initialApplications: Application[];
  initialCourses: Course[];
}) {
  const [courseAutoApproval, setCourseAutoApproval] = useState(initialCourseAutoApproval);
  const [applications, setApplications] = useState(initialApplications);
  const [courses, setCourses] = useState(initialCourses);
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const pendingApplications = useMemo(
    () => applications.filter(canReviewTeacherApplication),
    [applications],
  );
  const pendingCourses = useMemo(
    () => courses.filter((course) => course.status === "PENDING_APPROVAL" || course.status === "PENDING_DELETE"),
    [courses],
  );

  async function refreshApplications() {
    const response = await fetch("/api/admin/teacher-applications", { cache: "no-store" });
    const data = await readJsonResponse(response).catch(() => ({}));
    if (response.ok) setApplications(data.applications ?? []);
  }

  async function reviewApplication(application: Application, action: "INVITE_TO_EXAM" | "REJECT") {
    const rejectionReason = action === "REJECT" ? window.prompt("Lý do từ chối hồ sơ:")?.trim() ?? "" : "";
    if (action === "REJECT" && !rejectionReason) return;
    setBusyId(application.id);
    setMessage("");
    const response = await fetch(`/api/admin/recruitment-applications/${application.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, rejectionReason }),
    });
    const data = await readJsonResponse(response).catch(() => ({}));
    setBusyId(null);
    if (!response.ok) {
      setMessage(data.error ?? "Không thể xử lý hồ sơ.");
      return;
    }
    await refreshApplications();
    setMessage(action === "INVITE_TO_EXAM" ? "Đã duyệt hồ sơ và gửi lời mời dự thi." : "Đã từ chối hồ sơ giảng viên.");
  }

  async function reviewCourse(course: Course, action: "APPROVE" | "REJECT") {
    if (busyId) return;
    const isDeleteRequest = course.status === "PENDING_DELETE";
    const reason = action === "REJECT"
      ? window.prompt(isDeleteRequest ? "Lý do từ chối yêu cầu xóa?" : "Lý do từ chối khóa học?")?.trim() ?? ""
      : "";
    if (action === "REJECT" && !reason) return;
    setBusyId(course.id);
    setMessage("");
    try {
      const response = await fetch(`/api/teacher/courses/${encodeURIComponent(course.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reviewCourse",
          decision: action,
          rejectionReason: reason,
        }),
      });
      const data = await readJsonResponse(response).catch(() => ({}));
      if (!response.ok) {
        setMessage(data.error ?? "Không thể xử lý khóa học.");
        return;
      }
      if (data.deleted) {
        setCourses((current) => current.filter((item) => item.id !== course.id));
      } else if (data.course?.status) {
        setCourses((current) => current.map((item) => item.id === course.id
          ? { ...item, status: data.course.status }
          : item));
      }
      setMessage(
        isDeleteRequest
          ? action === "APPROVE" ? "Đã duyệt xóa khóa học." : "Đã từ chối yêu cầu xóa khóa học."
          : action === "APPROVE" ? "Đã duyệt khóa học." : "Đã từ chối khóa học.",
      );
    } catch {
      setMessage("Không thể kết nối máy chủ để xử lý khóa học.");
    } finally {
      setBusyId(null);
    }
  }

  async function toggleCourseAutoApproval(enabled: boolean) {
    if (busyId) return;
    setBusyId("course-auto-approval");
    setMessage(enabled ? "Đang bật và kiểm tra các khóa học chờ duyệt..." : "Đang tắt tự động duyệt khóa học...");
    try {
      const response = await fetch("/api/admin/course-approval", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      const data = await readJsonResponse(response).catch(() => ({}));
      if (!response.ok) {
        setMessage(data.error ?? "Không thể cập nhật cấu hình.");
        return;
      }

      setCourseAutoApproval(enabled);
      if (!enabled) {
        setMessage("Đã tắt tự động duyệt khóa học.");
        return;
      }

      const scan = data.scan as {
        scanned: number;
        approved: number;
        rejected: number;
        skipped: number;
        failed: number;
        outcomes: Array<{ courseId: string; status: Course["status"] }>;
      } | null;
      if (scan?.outcomes?.length) {
        const statusByCourseId = new Map(
          scan.outcomes.map((outcome) => [outcome.courseId, outcome.status]),
        );
        setCourses((current) => current.map((course) => {
          const status = statusByCourseId.get(course.id);
          return status ? { ...course, status } : course;
        }));
      }

      if (!scan || scan.scanned === 0) {
        setMessage("Đã bật tự động duyệt khóa học. Không có khóa học nào đang chờ duyệt.");
        return;
      }

      const incompletePart = scan.rejected > 0
        ? `, từ chối ${scan.rejected} khóa chưa đủ module, bài học hoặc bài kiểm tra`
        : "";
      const unresolved = scan.skipped + scan.failed;
      setMessage(
        `Đã bật và quét ${scan.scanned} khóa học: duyệt ${scan.approved} khóa${incompletePart}${unresolved > 0 ? `; ${unresolved} khóa chưa xử lý được` : ""}.`,
      );
    } catch {
      setMessage("Không thể kết nối máy chủ để cập nhật tự động duyệt khóa học.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-5">
      {message ? <p className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-800">{message}</p> : null}
      <section className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-semibold text-slate-500">Hồ sơ giảng viên</p><p className="mt-2 text-2xl font-bold text-slate-950">{pendingApplications.length}</p><p className="text-xs text-slate-500">đang chờ mời dự thi hoặc từ chối</p></article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-semibold text-slate-500">Khóa học</p><p className="mt-2 text-2xl font-bold text-slate-950">{pendingCourses.length}</p><p className="text-xs text-slate-500">yêu cầu đang chờ xử lý</p></article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">Tự động duyệt khóa</p>
          <label className="mt-3 flex items-center gap-3 text-sm font-bold text-slate-800">
            <input
              type="checkbox"
              checked={courseAutoApproval}
              disabled={Boolean(busyId)}
              onChange={(event) => void toggleCourseAutoApproval(event.target.checked)}
            />
            {busyId === "course-auto-approval" ? "Đang kiểm tra..." : courseAutoApproval ? "Đang bật" : "Đang tắt"}
          </label>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Khi bật, hệ thống quét toàn bộ khóa chờ duyệt. Khóa đủ module, bài học và bài kiểm tra sẽ được duyệt; khóa chưa đủ sẽ bị từ chối kèm lý do.
          </p>
        </article>
      </section>

      <AdminWorkspace
        items={[
          { id: "teacher-applications", label: "Duyệt hồ sơ", description: "Mời ứng viên dự thi hoặc từ chối hồ sơ" },
          { id: "teacher-courses", label: "Duyệt khóa học giảng viên", description: "Xử lý khóa mới và yêu cầu xóa" },
        ]}
        initialActiveId="teacher-applications"
        ariaLabel="Chức năng tổng quan quản trị"
        sidebarWidth={260}
        renderContent={(activeView) => activeView === "teacher-applications" ? (
          <TeacherApplicationsSection
            applications={applications}
            busyId={busyId}
            onRefresh={refreshApplications}
            onReview={reviewApplication}
          />
        ) : (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-slate-950">Duyệt khóa học giảng viên</h2>
        <div className="mt-4 space-y-3">{pendingCourses.length === 0 ? <p className="text-sm text-slate-500">Không có khóa học chờ duyệt.</p> : pendingCourses.map((course) => <article key={course.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-slate-950">{course.name}</h3><span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">{courseStatusLabel(course.status)}</span></div><p className="mt-1 text-sm text-slate-500">{course.instructor?.username ?? "Không rõ"} · {course.language?.name ?? course.registeredLanguage?.name ?? "Chưa có ngôn ngữ"}</p></div><div className="flex gap-2"><Link href={`/teacher/courses/${course.id}`} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">Chi tiết</Link><button type="button" disabled={busyId === course.id} onClick={() => void reviewCourse(course, "APPROVE")} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-60">Duyệt</button><button type="button" disabled={busyId === course.id} onClick={() => void reviewCourse(course, "REJECT")} className="rounded-lg bg-red-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-60">Từ chối</button></div></article>)}</div>
      </section>
        )}
      />
    </div>
  );
}
