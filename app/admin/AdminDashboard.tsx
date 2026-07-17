"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ModalDialog } from "@/app/components/ModalDialog";
import type { Application, Course } from "./types";

function statusLabel(status: Course["status"]) {
  if (status === "ACTIVE") return "Đang hoạt động";
  if (status === "LOCKED") return "Đã khóa";
  if (status === "PENDING_APPROVAL") return "Chờ duyệt";
  if (status === "PENDING_DELETE") return "Chờ duyệt xóa";
  return "Bị từ chối";
}

function statusClass(status: Course["status"]) {
  if (status === "ACTIVE") return "bg-emerald-100 text-emerald-700";
  if (status === "LOCKED") return "bg-slate-200 text-slate-700";
  if (status === "PENDING_APPROVAL") return "bg-amber-100 text-amber-700";
  if (status === "PENDING_DELETE") return "bg-orange-100 text-orange-700";
  return "bg-red-100 text-red-700";
}

function applicationStatusLabel(status: string) {
  if (status === "APPROVED") return "Đã duyệt";
  if (status === "REJECTED") return "Từ chối";
  if (status === "UNDER_REVIEW") return "Đang xem xét";
  if (status === "SUBMITTED") return "Đã nộp";
  if (status === "EXPIRED") return "Hết hạn";
  return "Bản nháp";
}

export default function AdminDashboard({
  initialEnabled,
  initialCourseAutoApproval,
  initialApplications,
  initialCourses,
}: {
  initialEnabled: boolean;
  initialCourseAutoApproval: boolean;
  initialApplications: Application[];
  initialCourses: Course[];
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [courseAutoApproval, setCourseAutoApproval] = useState(initialCourseAutoApproval);
  const [applications, setApplications] = useState(initialApplications);
  const [courses, setCourses] = useState(initialCourses);
  const [message, setMessage] = useState("");
  const [showApplications, setShowApplications] = useState(false);
  const [applicationSearch, setApplicationSearch] = useState("");
  const [currentTs] = useState(() => Date.now());
  const [updatingTeacherEntrance, setUpdatingTeacherEntrance] = useState(false);
  const [updatingCourseAutoApproval, setUpdatingCourseAutoApproval] = useState(false);
  const [reviewingApplicationId, setReviewingApplicationId] = useState<string | null>(null);
  const [reviewingCourseId, setReviewingCourseId] = useState<string | null>(null);

  const pendingCourses = useMemo(
    () => courses.filter((course) => course.status === "PENDING_APPROVAL" || course.status === "PENDING_DELETE"),
    [courses],
  );

  const pendingApplications = useMemo(
    () => applications.filter((application) => !["APPROVED", "REJECTED", "EXPIRED"].includes(application.status)),
    [applications],
  );

  const filteredApplications = useMemo(() => {
    const keyword = applicationSearch.trim().toLocaleLowerCase("vi");
    if (!keyword) return applications;

    return applications.filter((application) =>
      `${application.user.username} ${application.user.email}`
        .toLocaleLowerCase("vi")
        .includes(keyword),
    );
  }, [applicationSearch, applications]);

  async function toggleTeacherEntrance(nextEnabled: boolean) {
    if (updatingTeacherEntrance) return;
    setUpdatingTeacherEntrance(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/teacher-entrance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: nextEnabled }),
      });
      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        setEnabled(nextEnabled);
        setMessage(
          nextEnabled
            ? `Đã bật đăng ký. Email gửi thành công: ${data.notified ?? 0}.`
            : "Đã tắt đăng ký giảng viên.",
        );
      } else {
        setMessage(data?.error || "Không thể cập nhật cài đặt.");
      }
    } finally {
      setUpdatingTeacherEntrance(false);
    }
  }

  async function toggleCourseAutoApproval(nextEnabled: boolean) {
    if (updatingCourseAutoApproval) return;
    setUpdatingCourseAutoApproval(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/course-approval", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: nextEnabled }),
      });
      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        setCourseAutoApproval(nextEnabled);
        setMessage(
          nextEnabled
            ? "Đã bật tự động duyệt khóa học."
            : "Đã tắt tự động duyệt khóa học.",
        );
      } else {
        setMessage(data?.error || "Không thể cập nhật chế độ tự động duyệt.");
      }
    } finally {
      setUpdatingCourseAutoApproval(false);
    }
  }

  async function reviewTeacherApplication(
    application: Application,
    action: "APPROVE" | "REJECT",
  ) {
    if (reviewingApplicationId) return;
    const rejectionReason =
      action === "REJECT" ? window.prompt("Lý do từ chối?") || "" : "";
    setReviewingApplicationId(application.id);
    setMessage("");
    try {
      const response = await fetch(
        `/api/admin/teacher-applications/${application.id}/review`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, rejectionReason }),
        },
      );
      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        setApplications((previous) =>
          previous.map((item) =>
            item.id === application.id
              ? { ...item, status: data.status, rejectionReason }
              : item,
          ),
        );
        setMessage(
          action === "APPROVE"
            ? "Đã duyệt hồ sơ giảng viên."
            : "Đã từ chối hồ sơ giảng viên.",
        );
      } else {
        setMessage(data?.error || "Không thể duyệt hồ sơ.");
      }
    } finally {
      setReviewingApplicationId(null);
    }
  }

  async function reviewCourse(course: Course, decision: "APPROVE" | "REJECT") {
    if (reviewingCourseId) return;
    const isDeleteRequest = course.status === "PENDING_DELETE";
    const rejectionReason =
      decision === "REJECT"
        ? window.prompt(isDeleteRequest ? "Lý do từ chối yêu cầu xóa?" : "Lý do từ chối khóa học?") || ""
        : "";
    setReviewingCourseId(course.id);
    setMessage("");
    try {
      const response = await fetch(`/api/teacher/courses/${course.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reviewCourse", decision, rejectionReason }),
      });
      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        if (data?.deleted) {
          setCourses((previous) => previous.filter((item) => item.id !== course.id));
        } else {
          setCourses((previous) =>
            previous.map((item) =>
              item.id === course.id ? { ...item, status: data.course.status, deleteRequestedFromStatus: data.course.deleteRequestedFromStatus ?? null } : item,
            ),
          );
        }
        setMessage(
          isDeleteRequest
            ? decision === "APPROVE"
              ? "Đã duyệt xóa khóa học."
              : "Đã từ chối yêu cầu xóa khóa học."
            : decision === "APPROVE"
              ? "Đã duyệt khóa học."
              : "Đã từ chối khóa học.",
        );
      } else {
        setMessage(data?.error || "Không thể duyệt khóa học.");
      }
    } finally {
      setReviewingCourseId(null);
    }
  }

  useEffect(() => {
    if (!message) return;

    const timeout = window.setTimeout(() => setMessage(""), 5000);
    return () => window.clearTimeout(timeout);
  }, [message]);

  return (
    <>
      <AdminDashboardContent
        {...{
          message,
          enabled,
          courseAutoApproval,
          applications,
          pendingApplications,
          pendingCourses,
          updatingTeacherEntrance,
          updatingCourseAutoApproval,
          reviewingCourseId,
          setMessage,
          setShowApplications,
          toggleTeacherEntrance,
          toggleCourseAutoApproval,
          reviewCourse,
        }}
      />
      {showApplications ? (
        <TeacherApplicationsDialog
          {...{
            filteredApplications,
            applicationSearch,
            currentTs,
            reviewingApplicationId,
            setApplicationSearch,
            setShowApplications,
            reviewTeacherApplication,
          }}
        />
      ) : null}
    </>
  );
}

function AdminDashboardContent({
  message,
  enabled,
  courseAutoApproval,
  applications,
  pendingApplications,
  pendingCourses,
  updatingTeacherEntrance,
  updatingCourseAutoApproval,
  reviewingCourseId,
  setMessage,
  setShowApplications,
  toggleTeacherEntrance,
  toggleCourseAutoApproval,
  reviewCourse,
}: {
  message: string;
  enabled: boolean;
  courseAutoApproval: boolean;
  applications: Application[];
  pendingApplications: Application[];
  pendingCourses: Course[];
  updatingTeacherEntrance: boolean;
  updatingCourseAutoApproval: boolean;
  reviewingCourseId: string | null;
  setMessage: (message: string) => void;
  setShowApplications: (show: boolean) => void;
  toggleTeacherEntrance: (enabled: boolean) => Promise<void>;
  toggleCourseAutoApproval: (enabled: boolean) => Promise<void>;
  reviewCourse: (course: Course, decision: "APPROVE" | "REJECT") => Promise<void>;
}) {
  return (
    <div className="space-y-5">
      {message ? (
        <div className="fixed right-4 top-20 z-[90] w-[min(calc(100vw-2rem),24rem)] rounded-xl border border-blue-200 bg-white p-4 text-sm text-slate-700 shadow-2xl">
          <div className="flex items-start justify-between gap-3">
            <p className="font-semibold text-blue-700">{message}</p>
            <button
              type="button"
              onClick={() => setMessage("")}
              className="rounded-md px-2 py-1 text-sm font-bold text-slate-500 hover:bg-slate-100"
              aria-label="Đóng thông báo"
            >
              x
            </button>
          </div>
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">Đăng ký giảng viên</p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <div>
              <p className="text-lg font-bold text-slate-950">
                {enabled ? "Đang bật" : "Đang tắt"}
              </p>
              <p className="text-xs text-slate-500">Cho phép học viên nộp hồ sơ</p>
            </div>
            <button
              type="button"
              onClick={() => void toggleTeacherEntrance(!enabled)}
              disabled={updatingTeacherEntrance}
              className={`rounded-lg px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 ${
                enabled
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {updatingTeacherEntrance ? "Đang lưu..." : enabled ? "Tắt" : "Bật"}
            </button>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">Tự động duyệt khóa học</p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <div>
              <p className="text-lg font-bold text-slate-950">
                {courseAutoApproval ? "Đang bật" : "Đang tắt"}
              </p>
              <p className="text-xs text-slate-500">Khóa mới chuyển thẳng sang hoạt động</p>
            </div>
            <button
              type="button"
              onClick={() => void toggleCourseAutoApproval(!courseAutoApproval)}
              disabled={updatingCourseAutoApproval}
              className={`rounded-lg px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 ${
                courseAutoApproval
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-emerald-600 hover:bg-emerald-700"
              }`}
            >
              {updatingCourseAutoApproval ? "Đang lưu..." : courseAutoApproval ? "Tắt" : "Bật"}
            </button>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">Hồ sơ giảng viên</p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <div>
              <p className="text-lg font-bold text-slate-950">
                {pendingApplications.length} chờ xử lý
              </p>
              <p className="text-xs text-slate-500">{applications.length} hồ sơ tất cả</p>
            </div>
            <button
              type="button"
              onClick={() => setShowApplications(true)}
              className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Xem hồ sơ
            </button>
          </div>
        </article>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-950">
              Duyệt khóa học giảng viên
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Hiện có <strong>{pendingCourses.length}</strong> yêu cầu khóa học đang chờ duyệt.
            </p>
          </div>
          <Link
            href="/teacher/courses"
            className="text-sm font-semibold text-blue-700 hover:text-blue-800"
          >
            Xem tất cả khóa học
          </Link>
        </div>

        {pendingCourses.length === 0 ? (
          <p className="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
            Không có khóa học chờ duyệt.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-[1040px] w-full border-collapse bg-white text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Khóa học</th>
                  <th className="px-4 py-3 font-semibold">Giảng viên</th>
                  <th className="px-4 py-3 font-semibold">Ngôn ngữ</th>
                  <th className="px-4 py-3 text-center font-semibold">Chương</th>
                  <th className="px-4 py-3 text-center font-semibold">Bài test</th>
                  <th className="px-4 py-3 text-center font-semibold">Học viên</th>
                  <th className="px-4 py-3 font-semibold">Trạng thái</th>
                  <th className="px-4 py-3 text-right font-semibold">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendingCourses.map((course) => {
                  const language = course.language ?? course.registeredLanguage;
                  const isDeleteRequest = course.status === "PENDING_DELETE";

                  return (
                    <tr key={course.id} className="align-top hover:bg-slate-50/70">
                      <td className="max-w-[320px] px-4 py-4">
                        <p className="truncate font-bold text-slate-950">{course.name}</p>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{course.description}</p>
                      </td>
                      <td className="max-w-[240px] px-4 py-4">
                        <p className="truncate font-semibold text-slate-900">{course.instructor?.username || "Không rõ"}</p>
                        <p className="truncate text-xs text-slate-500">{course.instructor?.email || "Không có email"}</p>
                      </td>
                      <td className="px-4 py-4 text-slate-700">{language?.name || "Chưa xác định"}</td>
                      <td className="px-4 py-4 text-center font-semibold text-slate-700">{course._count.modules}</td>
                      <td className="px-4 py-4 text-center font-semibold text-slate-700">{course._count.tests}</td>
                      <td className="px-4 py-4 text-center font-semibold text-slate-700">{course._count.enrollments}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${statusClass(course.status)}`}>
                          {statusLabel(course.status)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/teacher/courses/${course.id}`}
                            className="inline-flex h-9 items-center rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            Chi tiết
                          </Link>
                          <button
                            type="button"
                            onClick={() => void reviewCourse(course, "APPROVE")}
                            disabled={Boolean(reviewingCourseId)}
                            className="inline-flex h-9 items-center rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {reviewingCourseId === course.id ? "Đang xử lý..." : isDeleteRequest ? "Duyệt xóa" : "Duyệt"}
                          </button>
                          <button
                            type="button"
                            onClick={() => void reviewCourse(course, "REJECT")}
                            disabled={Boolean(reviewingCourseId)}
                            className="inline-flex h-9 items-center rounded-lg bg-red-600 px-3 text-xs font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {reviewingCourseId === course.id ? "Đang xử lý..." : isDeleteRequest ? "Từ chối xóa" : "Từ chối"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="hidden">
          {pendingCourses.length === 0 ? (
            <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
              Không có khóa học chờ duyệt.
            </p>
          ) : (
            pendingCourses.map((course) => {
              const language = course.language ?? course.registeredLanguage;
              const isDeleteRequest = course.status === "PENDING_DELETE";

              return (
                <article
                  key={course.id}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-slate-950">{course.name}</h3>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClass(course.status)}`}
                        >
                          {statusLabel(course.status)}
                        </span>
                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                          Ngôn ngữ: {language?.name || "Chưa xác định"}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">
                        GV: {course.instructor?.username || "Không rõ"} -{" "}
                        {course.instructor?.email || "Không có email"}
                      </p>
                      <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                        {course.description}
                      </p>
                      <p className="mt-2 text-xs text-slate-500">
                        {course._count.modules} chương - {course._count.tests} bài test -{" "}
                        {course._count.enrollments} học viên
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/teacher/courses/${course.id}`}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Xem chi tiết
                      </Link>
                      <button
                        type="button"
                        onClick={() => void reviewCourse(course, "APPROVE")}
                        disabled={Boolean(reviewingCourseId)}
                        className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {reviewingCourseId === course.id ? "Đang xử lý..." : isDeleteRequest ? "Duyệt xóa" : "Duyệt"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void reviewCourse(course, "REJECT")}
                        disabled={Boolean(reviewingCourseId)}
                        className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {reviewingCourseId === course.id ? "Đang xử lý..." : isDeleteRequest ? "Từ chối xóa" : "Từ chối"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>

    </div>
  );
}

function TeacherApplicationsDialog({
  filteredApplications,
  applicationSearch,
  currentTs,
  reviewingApplicationId,
  setApplicationSearch,
  setShowApplications,
  reviewTeacherApplication,
}: {
  filteredApplications: Application[];
  applicationSearch: string;
  currentTs: number;
  reviewingApplicationId: string | null;
  setApplicationSearch: (search: string) => void;
  setShowApplications: (show: boolean) => void;
  reviewTeacherApplication: (application: Application, action: "APPROVE" | "REJECT") => Promise<void>;
}) {
  return (
    <ModalDialog labelledBy="teacher-applications-title" onClose={() => setShowApplications(false)} className="z-[70] p-3 md:p-6">
          <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-slate-200 p-4 md:p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 id="teacher-applications-title" className="text-xl font-bold text-slate-950">
                    Hồ sơ đăng ký giảng viên
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Tìm kiếm, kiểm tra chứng chỉ và Cheat logs trước khi duyệt.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowApplications(false)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Đóng
                </button>
              </div>
              <input
                type="search"
                aria-label="Tìm hồ sơ đăng ký giảng viên"
                value={applicationSearch}
                onChange={(event) => setApplicationSearch(event.target.value)}
                placeholder="Tìm theo tên người dùng hoặc email..."
                className="mt-4 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50 p-4 md:p-5">
              {filteredApplications.length === 0 ? (
                <p className="rounded-xl bg-white p-6 text-center text-sm text-slate-500">
                  Không tìm thấy hồ sơ phù hợp.
                </p>
              ) : (
                filteredApplications.map((application) => {
                  const suspicious =
                    application.suspiciousEvents.length > 0 ||
                    application.antiCheatLogs.length > 0;

                  return (
                    <article
                      key={application.id}
                      className="rounded-xl border border-slate-200 bg-white p-4"
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-bold text-slate-950">
                              {application.user.username}
                            </h3>
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                              {applicationStatusLabel(application.status)}
                            </span>
                            {suspicious ? (
                              <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700">
                                Có cảnh báo
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-sm text-slate-500">
                            {application.user.email} - {application.language.name} - lần #
                            {application.attemptNo}
                          </p>
                          {application.entranceAttempt ? (
                            <p className="mt-2 text-sm font-semibold text-slate-700">
                              Điểm thi: {application.entranceAttempt.score.toFixed(1)} /{" "}
                              {application.entranceAttempt.maxScore}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex gap-2">
                          {!["APPROVED", "REJECTED"].includes(application.status) ? (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  void reviewTeacherApplication(application, "APPROVE")
                                }
                                disabled={Boolean(reviewingApplicationId)}
                                className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {reviewingApplicationId === application.id ? "Đang xử lý..." : "Duyệt"}
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  void reviewTeacherApplication(application, "REJECT")
                                }
                                disabled={Boolean(reviewingApplicationId)}
                                className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {reviewingApplicationId === application.id ? "Đang xử lý..." : "Từ chối"}
                              </button>
                            </>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-sm font-semibold text-slate-700">
                            Chứng chỉ
                          </p>
                          {application.certificates.length === 0 ? (
                            <p className="mt-2 text-sm text-slate-500">
                              Chưa có chứng chỉ.
                            </p>
                          ) : (
                            application.certificates.map((certificate) => {
                              const expired = certificate.expiryDate
                                ? new Date(certificate.expiryDate).getTime() < currentTs
                                : false;
                              return (
                                <a
                                  key={certificate.id}
                                  href={certificate.fileUrl}
                                  className="mt-2 block text-sm font-medium text-blue-700 hover:underline"
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  {certificate.fileName} {expired ? "(đã hết hạn)" : ""}
                                </a>
                              );
                            })
                          )}
                        </div>

                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-sm font-semibold text-slate-700">
                            Cheat logs
                          </p>
                          {application.suspiciousEvents.length === 0 &&
                          application.antiCheatLogs.length === 0 ? (
                            <p className="mt-2 text-sm text-slate-500">
                              Không có sự kiện đáng ngờ.
                            </p>
                          ) : null}
                          {application.suspiciousEvents.map((event) => (
                            <p
                              key={event.eventType}
                              className="mt-2 text-sm text-slate-700"
                            >
                              {event.eventType}: {event.count} lần,{" "}
                              {event.totalDurationSeconds}s
                            </p>
                          ))}
                          {application.antiCheatLogs.slice(0, 5).map((log) => (
                            <p key={log.id} className="mt-2 text-xs text-slate-500">
                              {log.eventType}
                              {log.detail ? ` - ${log.detail}` : ""}
                            </p>
                          ))}
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </div>
    </ModalDialog>
  );
}
