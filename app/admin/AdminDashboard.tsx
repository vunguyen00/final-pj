"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ModalDialog } from "@/app/components/ModalDialog";
import { readJsonResponse } from "@/lib/http-response";
import type { Application, Course } from "./types";

type TeacherEntranceQuestionResult = {
  questionId: string;
  questionInstanceId?: string;
  sequence?: number;
  questionType: string;
  content: string;
  studentAnswer: string;
  correctAnswer: string | null;
  isCorrect: boolean;
  score: number;
  earnedScore: number;
  audioUrl?: string | null;
  aiEvaluation?: {
    overallScore?: number;
    summary?: string;
    detailedComment?: string;
    strengths?: string[];
    weaknesses?: string[];
    suggestions?: string[];
  };
};

type TeacherEntranceApplicationSummary = {
  id: string;
  status: string;
  user: { username: string; email: string };
  language: { name: string };
};

type TeacherEntranceAttemptDetail = {
  application: TeacherEntranceApplicationSummary;
  manualGradingRequired: false;
  submission?: never;
  attempt: {
    id: string;
    attemptNo: number;
    score: number;
    maxScore: number;
    isPassed: boolean;
    startedAt: string;
    submittedAt: string;
    questionResults: TeacherEntranceQuestionResult[];
  };
} | {
  application: TeacherEntranceApplicationSummary;
  manualGradingRequired: true;
  attempt?: never;
  submission: {
    submittedAt: string;
    passingScore: number;
    maxScore: number;
    questionResults: TeacherEntranceQuestionResult[];
  };
};

type ManualGradingResult = {
  status: string;
  attempt: {
    score: number;
    maxScore: number;
    isPassed: boolean;
  };
};

const USER_BEHAVIOR_LABELS: Record<string, string> = {
  CONSENT_ACCEPTED: "Đã đồng ý quy định giám sát",
  TAB_HIDDEN: "Rời khỏi tab bài thi",
  WINDOW_BLUR: "Chuyển sang cửa sổ khác",
  FULLSCREEN_EXIT: "Thoát chế độ toàn màn hình",
  COPY_ATTEMPT: "Thực hiện thao tác sao chép",
  PASTE_ATTEMPT: "Dán nội dung vào bài làm",
  CONTEXT_MENU: "Mở menu chuột phải",
  DEVTOOLS_SHORTCUT: "Dùng phím tắt mở công cụ trình duyệt",
  NO_FACE: "Không phát hiện khuôn mặt",
  MULTIPLE_FACES: "Phát hiện nhiều khuôn mặt",
  FACE_MISMATCH: "Khuôn mặt không khớp với lúc bắt đầu",
  LOOKING_AWAY: "Nhìn ra khỏi màn hình quá lâu",
  PHONE_DETECTED: "Phát hiện vật thể giống điện thoại",
  CAMERA_DISABLED: "Camera bị tắt hoặc mất kết nối",
  PAGE_RELOAD_OR_CLOSE: "Tải lại hoặc đóng trang thi",
  PROCTOR_HEARTBEAT_GAP: "Kết nối giám sát bị gián đoạn",
  MULTIPLE_DISPLAYS: "Sử dụng nhiều màn hình",
  MULTIPLE_EXAM_SESSIONS: "Mở bài thi ở nhiều phiên cùng lúc",
};

const APPLICATIONS_PER_PAGE = 5;
const COLLAPSED_BEHAVIOR_COUNT = 5;

function userBehaviorLabel(eventType: string) {
  return USER_BEHAVIOR_LABELS[eventType] ?? "Hành vi bất thường khác";
}

function behaviorSummary(count: number, totalDurationSeconds: number) {
  const occurrence = `${count} lần`;
  if (totalDurationSeconds <= 0) return occurrence;
  return `${occurrence}, tổng thời gian ${totalDurationSeconds} giây`;
}

function questionTypeLabel(questionType: string) {
  const labels: Record<string, string> = {
    MULTIPLE_CHOICE: "Trắc nghiệm",
    TRUE_FALSE: "Đúng / Sai",
    FILL_IN_BLANK: "Điền vào chỗ trống",
    ESSAY: "Tự luận",
    SPEAKING: "Nói",
  };
  return labels[questionType] ?? "Câu hỏi";
}

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
  if (status === "SUBMITTED") return "Đang chấm bài";
  if (status === "EXPIRED") return "Hết hạn";
  if (status === "FAILED_CHEATING") return "Trượt do gian lận";
  return "Bản nháp";
}

function canReviewTeacherApplication(status: string) {
  return status === "UNDER_REVIEW";
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
  const [loadingAttemptApplicationId, setLoadingAttemptApplicationId] = useState<string | null>(null);
  const [attemptDetail, setAttemptDetail] = useState<TeacherEntranceAttemptDetail | null>(null);
  const [refreshingApplications, setRefreshingApplications] = useState(false);

  const pendingCourses = useMemo(
    () => courses.filter((course) => course.status === "PENDING_APPROVAL" || course.status === "PENDING_DELETE"),
    [courses],
  );

  const pendingApplications = useMemo(
    () => applications.filter((application) => canReviewTeacherApplication(application.status)),
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

  async function refreshApplications() {
    if (refreshingApplications) return;
    setRefreshingApplications(true);
    try {
      const response = await fetch("/api/admin/teacher-applications", {
        cache: "no-store",
      });
      const data = await readJsonResponse(response).catch(() => ({}));
      if (response.ok && Array.isArray(data?.applications)) {
        setApplications(data.applications as Application[]);
      }
    } catch {
      // The admin can retry from the applications dialog.
    } finally {
      setRefreshingApplications(false);
    }
  }

  function openTeacherApplications() {
    setShowApplications(true);
    void refreshApplications();
  }

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
      const data = await readJsonResponse(response).catch(() => ({}));

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
      const data = await readJsonResponse(response).catch(() => ({}));

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
    if (!canReviewTeacherApplication(application.status)) {
      setMessage("Chỉ hồ sơ đã hoàn tất bài kiểm tra và đang chờ duyệt mới có thể xử lý.");
      return;
    }

    let rejectionReason = "";
    if (action === "REJECT") {
      const promptedReason = window.prompt("Lý do từ chối?");
      if (promptedReason === null) return;

      rejectionReason = promptedReason.trim();
      if (!rejectionReason) {
        setMessage("Vui lòng nhập lý do từ chối.");
        return;
      }
    }

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
      const data = await readJsonResponse(response).catch(() => ({}));

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

  async function viewTeacherEntranceAttempt(application: Application) {
    const canOpen =
      Boolean(application.entranceAttempt) ||
      application.failureReason === "AI_GRADING_FAILED";
    if (!canOpen || loadingAttemptApplicationId) return;
    setLoadingAttemptApplicationId(application.id);
    setMessage("");
    try {
      const response = await fetch(
        `/api/admin/teacher-applications/${application.id}/attempt`,
        { cache: "no-store" },
      );
      const data = await readJsonResponse(response).catch(() => ({}));
      if (!response.ok) {
        setMessage(data?.error || "Không thể tải chi tiết bài làm.");
        return;
      }
      setAttemptDetail(data as TeacherEntranceAttemptDetail);
    } finally {
      setLoadingAttemptApplicationId(null);
    }
  }

  function handleManualGradingCompleted(result: ManualGradingResult) {
    if (!attemptDetail) return;
    const applicationId = attemptDetail.application.id;
    setApplications((previous) =>
      previous.map((application) =>
        application.id === applicationId
          ? {
              ...application,
              status: result.status,
              failureReason: null,
              entranceAttempt: result.attempt,
            }
          : application,
      ),
    );
    setAttemptDetail(null);
    setMessage(
      result.attempt.isPassed
        ? "Đã lưu điểm thủ công. Hồ sơ đã chuyển sang chờ admin xét duyệt."
        : "Đã lưu điểm thủ công. Bài thi không đạt mức điểm yêu cầu.",
    );
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
      const data = await readJsonResponse(response).catch(() => ({}));

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
          openTeacherApplications,
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
            loadingAttemptApplicationId,
            refreshingApplications,
            setApplicationSearch,
            setShowApplications,
            reviewTeacherApplication,
            viewTeacherEntranceAttempt,
            refreshApplications,
          }}
        />
      ) : null}
      {attemptDetail ? (
        <TeacherEntranceAttemptDialog
          detail={attemptDetail}
          onClose={() => setAttemptDetail(null)}
          onManualGradingCompleted={handleManualGradingCompleted}
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
  openTeacherApplications,
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
  openTeacherApplications: () => void;
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
                {enabled ? "Đã bật" : "Đã tắt"}
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
                {courseAutoApproval ? "Đã bật" : "Đã tắt"}
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
              onClick={openTeacherApplications}
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
  loadingAttemptApplicationId,
  refreshingApplications,
  setApplicationSearch,
  setShowApplications,
  reviewTeacherApplication,
  viewTeacherEntranceAttempt,
  refreshApplications,
}: {
  filteredApplications: Application[];
  applicationSearch: string;
  currentTs: number;
  reviewingApplicationId: string | null;
  loadingAttemptApplicationId: string | null;
  refreshingApplications: boolean;
  setApplicationSearch: (search: string) => void;
  setShowApplications: (show: boolean) => void;
  reviewTeacherApplication: (application: Application, action: "APPROVE" | "REJECT") => Promise<void>;
  viewTeacherEntranceAttempt: (application: Application) => Promise<void>;
  refreshApplications: () => Promise<void>;
}) {
  const [applicationPage, setApplicationPage] = useState(1);
  const [behaviorDetailApplication, setBehaviorDetailApplication] =
    useState<Application | null>(null);
  const applicationPageCount = Math.max(
    1,
    Math.ceil(filteredApplications.length / APPLICATIONS_PER_PAGE),
  );
  const currentApplicationPage = Math.min(applicationPage, applicationPageCount);
  const applicationPageStart =
    (currentApplicationPage - 1) * APPLICATIONS_PER_PAGE;
  const visibleApplications = filteredApplications.slice(
    applicationPageStart,
    applicationPageStart + APPLICATIONS_PER_PAGE,
  );

  return (
    <>
      <ModalDialog labelledBy="teacher-applications-title" onClose={() => setShowApplications(false)} className="z-[70] p-3 md:p-6">
          <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-slate-200 p-4 md:p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 id="teacher-applications-title" className="text-xl font-bold text-slate-950">
                    Hồ sơ đăng ký giảng viên
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Tìm kiếm, kiểm tra chứng chỉ và hành vi người dùng trước khi duyệt.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setApplicationPage(1);
                      void refreshApplications();
                    }}
                    disabled={refreshingApplications}
                    className="rounded-lg border border-blue-200 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {refreshingApplications ? "Đang làm mới..." : "Làm mới"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowApplications(false)}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Đóng
                  </button>
                </div>
              </div>
              <input
                type="search"
                aria-label="Tìm hồ sơ đăng ký giảng viên"
                value={applicationSearch}
                onChange={(event) => {
                  setApplicationSearch(event.target.value);
                  setApplicationPage(1);
                }}
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
                visibleApplications.map((application) => {
                  const suspicious =
                    application.suspiciousEvents.some((event) => event.severity >= 2) ||
                    application.antiCheatLogs.some((log) => (log.severity ?? 1) >= 2);

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
                            <div className="mt-2 flex flex-wrap items-center gap-3">
                              <p className="text-sm font-semibold text-slate-700">
                                Điểm thi: {application.entranceAttempt.score.toFixed(1)} /{" "}
                                {application.entranceAttempt.maxScore}
                              </p>
                              <button
                                type="button"
                                onClick={() => void viewTeacherEntranceAttempt(application)}
                                disabled={Boolean(loadingAttemptApplicationId)}
                                className="rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {loadingAttemptApplicationId === application.id
                                  ? "Đang tải bài..."
                                  : "Xem bài làm"}
                              </button>
                            </div>
                          ) : application.failureReason === "AI_GRADING_FAILED" ? (
                            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                              <p className="text-sm font-semibold text-amber-900">
                                AI không thể hoàn tất việc chấm bài.
                              </p>
                              <p className="mt-1 text-xs leading-5 text-amber-800">
                                Bài làm đã được lưu. Admin có thể mở bài và nhập điểm cho từng câu.
                              </p>
                              <button
                                type="button"
                                onClick={() => void viewTeacherEntranceAttempt(application)}
                                disabled={Boolean(loadingAttemptApplicationId)}
                                className="mt-2 rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {loadingAttemptApplicationId === application.id
                                  ? "Đang tải bài..."
                                  : "Mở và chấm thủ công"}
                              </button>
                            </div>
                          ) : null}
                        </div>
                        <div className="flex gap-2">
                          {canReviewTeacherApplication(application.status) ? (
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

                        <UserBehaviorPanel
                          application={application}
                          onShowDetails={() => setBehaviorDetailApplication(application)}
                        />
                      </div>
                    </article>
                  );
                })
              )}
            </div>
            {filteredApplications.length > 0 ? (
              <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:px-5">
                <p className="text-sm text-slate-500">
                  Hiển thị {applicationPageStart + 1}–
                  {Math.min(
                    applicationPageStart + APPLICATIONS_PER_PAGE,
                    filteredApplications.length,
                  )}{" "}
                  trong {filteredApplications.length} hồ sơ
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setApplicationPage(Math.max(1, currentApplicationPage - 1))
                    }
                    disabled={currentApplicationPage === 1}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Trước
                  </button>
                  <span className="min-w-20 text-center text-sm font-semibold text-slate-700">
                    Trang {currentApplicationPage}/{applicationPageCount}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setApplicationPage(
                        Math.min(applicationPageCount, currentApplicationPage + 1),
                      )
                    }
                    disabled={currentApplicationPage === applicationPageCount}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Sau
                  </button>
                </div>
              </div>
            ) : null}
          </div>
      </ModalDialog>
      {behaviorDetailApplication ? (
        <UserBehaviorDetailDialog
          application={behaviorDetailApplication}
          onClose={() => setBehaviorDetailApplication(null)}
        />
      ) : null}
    </>
  );
}

function sortedUserBehaviorEvents(application: Application) {
  return [...application.suspiciousEvents].sort(
    (left, right) =>
      right.severity - left.severity ||
      right.count - left.count ||
      left.eventType.localeCompare(right.eventType),
  );
}

function UserBehaviorPanel({
  application,
  onShowDetails,
}: {
  application: Application;
  onShowDetails: () => void;
}) {
  const sortedEvents = sortedUserBehaviorEvents(application);
  const visibleEvents = sortedEvents.slice(0, COLLAPSED_BEHAVIOR_COUNT);
  const hasBehavior = sortedEvents.length > 0 || application.antiCheatLogs.length > 0;
  const canShowDetails =
    sortedEvents.length > COLLAPSED_BEHAVIOR_COUNT ||
    application.antiCheatLogs.length > 0;

  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-sm font-semibold text-slate-700">
        Hành vi người dùng
      </p>
      {!hasBehavior ? (
        <p className="mt-2 text-sm text-slate-500">
          Không có sự kiện đáng ngờ.
        </p>
      ) : null}

      {visibleEvents.length > 0 ? (
        <p className="mt-3 text-xs font-bold uppercase tracking-wide text-slate-400">
          Tổng hợp sự kiện
        </p>
      ) : null}
      {visibleEvents.map((event) => (
        <div
          key={event.eventType}
          className="mt-2 border-l-2 border-amber-300 pl-2.5"
        >
          <p className="text-sm font-semibold text-slate-800">
            {userBehaviorLabel(event.eventType)}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {behaviorSummary(event.count, event.totalDurationSeconds)}
          </p>
        </div>
      ))}

      {canShowDetails ? (
        <button
          type="button"
          onClick={onShowDetails}
          className="mt-3 text-xs font-bold text-blue-700 hover:text-blue-800 hover:underline"
        >
          Xem chi tiết
        </button>
      ) : null}
    </div>
  );
}

function UserBehaviorDetailDialog({
  application,
  onClose,
}: {
  application: Application;
  onClose: () => void;
}) {
  const sortedEvents = sortedUserBehaviorEvents(application);

  return (
    <ModalDialog
      labelledBy="user-behavior-detail-title"
      onClose={onClose}
      className="z-[80] p-3 md:p-6"
    >
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-4 md:p-5">
          <div>
            <h2 id="user-behavior-detail-title" className="text-xl font-bold text-slate-950">
              Chi tiết hành vi người dùng
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {application.user.username} · {application.user.email}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Đóng
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-5">
          {sortedEvents.length > 0 ? (
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Tổng hợp sự kiện
              </h3>
              <div className="mt-3 space-y-3">
                {sortedEvents.map((event) => (
                  <div
                    key={event.eventType}
                    className="border-l-2 border-amber-300 pl-3"
                  >
                    <p className="text-sm font-semibold text-slate-800">
                      {userBehaviorLabel(event.eventType)}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {behaviorSummary(event.count, event.totalDurationSeconds)}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {application.antiCheatLogs.length > 0 ? (
            <section className={sortedEvents.length > 0 ? "mt-6" : ""}>
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Ghi nhận gần nhất
              </h3>
              <div className="mt-3 space-y-3">
                {application.antiCheatLogs.map((log) => (
                  <div key={log.id} className="border-l-2 border-amber-300 pl-3">
                    <p className="text-sm font-semibold text-slate-700">
                      {userBehaviorLabel(log.eventType)}
                    </p>
                    {log.serverTimestamp ? (
                      <p className="mt-0.5 text-xs text-slate-400">
                        Ghi nhận lúc{" "}
                        {new Date(log.serverTimestamp).toLocaleString("vi-VN", {
                          timeZone: "Asia/Bangkok",
                        })}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </ModalDialog>
  );
}

function TeacherEntranceAttemptDialog({
  detail,
  onClose,
  onManualGradingCompleted,
}: {
  detail: TeacherEntranceAttemptDetail;
  onClose: () => void;
  onManualGradingCompleted: (result: ManualGradingResult) => void;
}) {
  if (detail.manualGradingRequired) {
    return (
      <TeacherEntranceManualGradingDialog
        detail={detail}
        onClose={onClose}
        onCompleted={onManualGradingCompleted}
      />
    );
  }

  const { application, attempt } = detail;
  return (
    <ModalDialog
      labelledBy="teacher-attempt-detail-title"
      onClose={onClose}
      className="z-[80] p-3 md:p-6"
    >
      <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-slate-200 p-4 md:p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="teacher-attempt-detail-title" className="text-xl font-bold text-slate-950">
                Bài làm đầu vào của {application.user.username}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {application.user.email} · {application.language.name} · Nộp lúc{" "}
                {new Date(attempt.submittedAt).toLocaleString("vi-VN", {
                  timeZone: "Asia/Bangkok",
                })}
              </p>
              <p className={`mt-2 text-sm font-bold ${attempt.isPassed ? "text-emerald-700" : "text-red-700"}`}>
                Tổng điểm: {attempt.score.toFixed(1)} / {attempt.maxScore} ·{" "}
                {attempt.isPassed ? "Đạt" : "Không đạt"}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Đóng
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50 p-4 md:p-5">
          {attempt.questionResults.length === 0 ? (
            <p className="rounded-xl bg-white p-6 text-center text-sm text-slate-500">
              Bài làm này chưa có dữ liệu chi tiết theo từng câu.
            </p>
          ) : (
            attempt.questionResults.map((question, index) => (
              <article
                key={question.questionId}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
                      Câu {question.sequence ?? index + 1} ·{" "}
                      {questionTypeLabel(question.questionType)}
                    </p>
                    <h3 className="mt-2 font-semibold leading-6 text-slate-950">
                      {question.content}
                    </h3>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${question.isCorrect ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                    {question.earnedScore.toFixed(1)} / {question.score} điểm
                  </span>
                </div>

                {question.audioUrl ? (
                  <div className="mt-4">
                    <a
                      href={question.audioUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex rounded-lg border border-blue-200 px-3 py-2 text-sm font-bold text-blue-700 hover:bg-blue-50"
                    >
                      Mở audio Speaking đã nộp
                    </a>
                  </div>
                ) : null}

                <div className="mt-4 rounded-lg bg-slate-50 p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Câu trả lời của ứng viên
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-800">
                    {question.studentAnswer || "(Bỏ trống)"}
                  </p>
                </div>

                {question.correctAnswer ? (
                  <div className="mt-3 rounded-lg bg-emerald-50 p-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                      Đáp án đúng
                    </p>
                    <p className="mt-2 text-sm text-emerald-900">{question.correctAnswer}</p>
                  </div>
                ) : null}

                {question.aiEvaluation ? (
                  <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 p-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
                      Nhận xét chấm AI
                      {typeof question.aiEvaluation.overallScore === "number"
                        ? ` · ${question.aiEvaluation.overallScore}/10`
                        : ""}
                    </p>
                    {question.aiEvaluation.detailedComment || question.aiEvaluation.summary ? (
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-blue-950">
                        {question.aiEvaluation.detailedComment || question.aiEvaluation.summary}
                      </p>
                    ) : null}
                    <AttemptFeedbackList
                      label="Điểm mạnh"
                      items={question.aiEvaluation.strengths}
                    />
                    <AttemptFeedbackList
                      label="Điểm cần cải thiện"
                      items={question.aiEvaluation.weaknesses}
                    />
                    <AttemptFeedbackList
                      label="Gợi ý"
                      items={question.aiEvaluation.suggestions}
                    />
                  </div>
                ) : null}
              </article>
            ))
          )}
        </div>
      </div>
    </ModalDialog>
  );
}

function TeacherEntranceManualGradingDialog({
  detail,
  onClose,
  onCompleted,
}: {
  detail: Extract<TeacherEntranceAttemptDetail, { manualGradingRequired: true }>;
  onClose: () => void;
  onCompleted: (result: ManualGradingResult) => void;
}) {
  const { application, submission } = detail;
  const [scores, setScores] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      submission.questionResults.flatMap((question) =>
        question.questionInstanceId
          ? [[question.questionInstanceId, question.earnedScore]]
          : [],
      ),
    ),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const totalScore = submission.questionResults.reduce(
    (total, question) =>
      total + (question.questionInstanceId ? scores[question.questionInstanceId] ?? 0 : 0),
    0,
  );

  async function saveManualGrades() {
    if (saving) return;
    const missingQuestion = submission.questionResults.some(
      (question) => !question.questionInstanceId,
    );
    if (missingQuestion) {
      setError("Bài làm thiếu mã câu hỏi. Vui lòng làm mới và thử lại.");
      return;
    }
    if (
      !window.confirm(
        `Xác nhận lưu kết quả chấm thủ công ${totalScore.toFixed(1)}/${submission.maxScore}?`,
      )
    ) {
      return;
    }

    setSaving(true);
    setError("");
    try {
      const response = await fetch(
        `/api/admin/teacher-applications/${application.id}/attempt`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scores: submission.questionResults.map((question) => ({
              questionInstanceId: question.questionInstanceId,
              earnedScore: question.questionInstanceId
                ? scores[question.questionInstanceId] ?? 0
                : 0,
            })),
          }),
        },
      );
      const data = await readJsonResponse(response).catch(() => ({}));
      if (!response.ok) {
        setError(data?.error || "Không thể lưu kết quả chấm thủ công.");
        return;
      }
      onCompleted(data as ManualGradingResult);
    } catch {
      setError("Không thể kết nối máy chủ. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalDialog
      labelledBy="teacher-manual-grading-title"
      onClose={saving ? () => undefined : onClose}
      className="z-[80] p-3 md:p-6"
    >
      <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-amber-200 bg-amber-50 p-4 md:p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="teacher-manual-grading-title" className="text-xl font-bold text-slate-950">
                Chấm thủ công bài của {application.user.username}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                {application.user.email} · {application.language.name} · Nộp lúc{" "}
                {new Date(submission.submittedAt).toLocaleString("vi-VN", {
                  timeZone: "Asia/Bangkok",
                })}
              </p>
              <p className="mt-2 text-sm font-semibold text-amber-900">
                AI chấm bài không thành công. Hãy kiểm tra câu trả lời và nhập điểm cho từng câu.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Đóng
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50 p-4 md:p-5">
          {submission.questionResults.map((question, index) => {
            const questionInstanceId = question.questionInstanceId ?? "";
            return (
              <article
                key={questionInstanceId || question.questionId}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
                      Câu {question.sequence ?? index + 1} ·{" "}
                      {questionTypeLabel(question.questionType)}
                    </p>
                    <h3 className="mt-2 font-semibold leading-6 text-slate-950">
                      {question.content}
                    </h3>
                  </div>
                  <label className="flex shrink-0 items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm font-bold text-blue-900">
                    Điểm
                    <input
                      type="number"
                      min={0}
                      max={question.score}
                      step="0.1"
                      value={questionInstanceId ? scores[questionInstanceId] ?? 0 : 0}
                      onChange={(event) => {
                        const nextScore = Math.min(
                          question.score,
                          Math.max(0, Number(event.target.value) || 0),
                        );
                        setScores((previous) => ({
                          ...previous,
                          [questionInstanceId]: nextScore,
                        }));
                      }}
                      disabled={!questionInstanceId || saving}
                      aria-label={`Điểm câu ${question.sequence ?? index + 1}`}
                      className="w-20 rounded-md border border-blue-200 bg-white px-2 py-1 text-right outline-none focus:border-blue-500"
                    />
                    / {question.score}
                  </label>
                </div>

                {question.audioUrl ? (
                  <a
                    href={question.audioUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex rounded-lg border border-blue-200 px-3 py-2 text-sm font-bold text-blue-700 hover:bg-blue-50"
                  >
                    Mở audio Speaking đã nộp
                  </a>
                ) : null}

                <div className="mt-4 rounded-lg bg-slate-50 p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Câu trả lời của ứng viên
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-800">
                    {question.studentAnswer || "(Bỏ trống)"}
                  </p>
                </div>

                {question.correctAnswer ? (
                  <div className="mt-3 rounded-lg bg-emerald-50 p-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                      Đáp án đúng
                    </p>
                    <p className="mt-2 text-sm text-emerald-900">{question.correctAnswer}</p>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>

        <div className="border-t border-slate-200 bg-white p-4 md:p-5">
          {error ? (
            <p role="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">
              {error}
            </p>
          ) : null}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-lg font-bold text-slate-950">
                Tổng điểm: {totalScore.toFixed(1)} / {submission.maxScore}
              </p>
              <p className="text-xs text-slate-500">
                Mức đạt: {submission.passingScore} điểm
              </p>
            </div>
            <button
              type="button"
              onClick={() => void saveManualGrades()}
              disabled={saving || submission.questionResults.length === 0}
              className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Đang lưu kết quả..." : "Lưu kết quả chấm"}
            </button>
          </div>
        </div>
      </div>
    </ModalDialog>
  );
}

function AttemptFeedbackList({
  label,
  items,
}: {
  label: string;
  items: string[] | undefined;
}) {
  if (!items?.length) return null;
  return (
    <div className="mt-3">
      <p className="text-xs font-bold text-blue-800">{label}</p>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-blue-950">
        {items.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}
      </ul>
    </div>
  );
}
