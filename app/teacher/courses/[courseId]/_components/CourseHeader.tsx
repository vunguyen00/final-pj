import Link from "next/link";
import { getCourseCategoryLabel, getCourseManagementLabels } from "@/lib/language-display";
import { getLearningUiLabels } from "@/lib/test-language-labels";
import { Course } from "../types";

type CourseHeaderProps = {
  course: Course;
  viewerRole: string;
  isResubmitting: boolean;
  approvalMessage: { type: "success" | "error"; text: string } | null;
  onResubmit: () => void;
};

const statusClasses: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  LOCKED: "bg-red-100 text-red-700",
  PENDING_APPROVAL: "bg-amber-100 text-amber-700",
  PENDING_DELETE: "bg-orange-100 text-orange-700",
  REJECTED: "bg-rose-100 text-rose-700",
};

type CourseApprovalPanelProps = Pick<
  CourseHeaderProps,
  "viewerRole" | "isResubmitting" | "approvalMessage" | "onResubmit"
> & {
  status: string;
  labels: ReturnType<typeof getCourseManagementLabels>["approval"];
};

function CourseApprovalPanel({
  viewerRole,
  status,
  labels,
  isResubmitting,
  approvalMessage,
  onResubmit,
}: CourseApprovalPanelProps) {
  const canResubmit = viewerRole === "TEACHER" && status === "REJECTED";

  if (!canResubmit && !approvalMessage) return null;

  return (
    <>
      {canResubmit ? (
        <div className="mt-5 flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-rose-800">{labels.resubmitDescription}</p>
          <button
            type="button"
            disabled={isResubmitting}
            onClick={onResubmit}
            className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isResubmitting ? labels.resubmitting : labels.resubmit}
          </button>
        </div>
      ) : null}
      {approvalMessage ? (
        <p className={`mt-4 rounded-xl border p-3 text-sm ${approvalMessage.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>
          {approvalMessage.text}
        </p>
      ) : null}
    </>
  );
}

export function CourseHeader({ course, viewerRole, isResubmitting, approvalMessage, onResubmit }: CourseHeaderProps) {
  const createdAt = new Date(course.createdAt).toLocaleString("vi-VN");
  const courseLanguageKey = course.language?.code || course.language?.name || "vi";
  const labels = getCourseManagementLabels(courseLanguageKey);
  const learningLabels = getLearningUiLabels(courseLanguageKey).course;
  const statusLabel =
    labels.status[course.status] || course.status;
  const statusClass = statusClasses[course.status] || statusClasses.REJECTED;

  return (
    <>
      <Link
        href="/teacher/courses"
        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        {labels.backToCourses}
      </Link>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{course.name}</h1>
            <p className="mt-2 text-slate-600">{course.description}</p>
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-500">
              <span className="flex items-center gap-1">{labels.instructor}: {course.instructor?.username ?? labels.unassigned}</span>
              <span className="flex items-center gap-1">{labels.createdAt}: {createdAt}</span>
              <span className="flex items-center gap-1">{labels.students(course._count.enrollments)}</span>
              <span className="flex items-center gap-1">{labels.modules(course._count.modules)}</span>
              <span className="flex items-center gap-1">{labels.tests(course._count.tests)}</span>
              <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusClass}`}>
                {statusLabel}
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-slate-900">{course.price.toLocaleString("vi-VN")}đ</p>
            <p className="text-sm text-slate-500">{getCourseCategoryLabel(course.category, courseLanguageKey) || course.category}</p>
            <Link
              href={`/student/hoc-bai?courseId=${course.id}`}
              className="mt-3 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              {learningLabels.enterCourse}
            </Link>
          </div>
        </div>
        <CourseApprovalPanel
          viewerRole={viewerRole}
          status={course.status}
          labels={labels.approval}
          isResubmitting={isResubmitting}
          approvalMessage={approvalMessage}
          onResubmit={onResubmit}
        />
      </div>
    </>
  );
}
