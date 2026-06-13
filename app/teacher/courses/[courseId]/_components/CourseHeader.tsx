import Link from "next/link";
import { Course } from "../types";

type CourseHeaderProps = {
  course: Course;
};

export function CourseHeader({ course }: CourseHeaderProps) {
  const statusLabel =
    course.status === "ACTIVE"
      ? "Hoạt động"
      : course.status === "LOCKED"
        ? "Đã khóa"
        : course.status === "PENDING_APPROVAL"
          ? "Chờ duyệt"
          : "Bị từ chối";
  const statusClass =
    course.status === "ACTIVE"
      ? "bg-green-100 text-green-700"
      : course.status === "LOCKED"
        ? "bg-red-100 text-red-700"
        : course.status === "PENDING_APPROVAL"
          ? "bg-amber-100 text-amber-700"
          : "bg-rose-100 text-rose-700";

  return (
    <>
      <Link
        href="/teacher/courses"
        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Quay lại danh sách khóa học
      </Link>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{course.name}</h1>
            <p className="mt-2 text-slate-600">{course.description}</p>
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-500">
              <span className="flex items-center gap-1">{course._count.enrollments} học viên</span>
              <span className="flex items-center gap-1">{course._count.modules} chương</span>
              <span className="flex items-center gap-1">{course._count.tests} bài test</span>
              <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusClass}`}>
                {statusLabel}
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-slate-900">{course.price.toLocaleString("vi-VN")}đ</p>
            <p className="text-sm text-slate-500">{course.category}</p>
          </div>
        </div>
      </div>
    </>
  );
}
