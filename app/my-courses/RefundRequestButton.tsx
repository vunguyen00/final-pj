"use client";

import { useMemo, useState, type FormEvent } from "react";

type RefundStatus = "PENDING" | "APPROVED" | "REJECTED";

export type RefundableCourse = {
  courseId: string;
  courseName: string;
  enrolledAt: string;
  refundAmount: number;
  progress: number;
  completed: number;
  lessonsCount: number;
  initialStatus: RefundStatus | null;
};

const statusCopy: Record<RefundStatus, string> = {
  PENDING: "Chờ hoàn tiền",
  APPROVED: "Đã hoàn tiền",
  REJECTED: "Bị từ chối",
};

const statusClass: Record<RefundStatus, string> = {
  PENDING: "border-amber-200 bg-amber-50 text-amber-700",
  APPROVED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  REJECTED: "border-rose-200 bg-rose-50 text-rose-700",
};

const currency = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

export default function RefundRequestButton({ courses }: { courses: RefundableCourse[] }) {
  const [open, setOpen] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState(courses[0]?.courseId ?? "");
  const [statuses, setStatuses] = useState<Record<string, RefundStatus | null>>(() =>
    Object.fromEntries(courses.map((course) => [course.courseId, course.initialStatus])),
  );
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const selectedCourse = useMemo(
    () => courses.find((course) => course.courseId === selectedCourseId) ?? courses[0] ?? null,
    [courses, selectedCourseId],
  );
  const selectedStatus = selectedCourse ? statuses[selectedCourse.courseId] : null;

  async function submitRefund(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCourse) return;

    const trimmedReason = reason.trim();
    if (trimmedReason.length < 10) {
      setMessage("Vui lòng nhập lý do tối thiểu 10 ký tự.");
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/course-refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: selectedCourse.courseId, reason: trimmedReason }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string; refund?: { status: RefundStatus } };

      if (!response.ok || !data.refund) {
        setMessage(data.error ?? "Không thể gửi yêu cầu hoàn tiền.");
        return;
      }

      setStatuses((current) => ({ ...current, [selectedCourse.courseId]: data.refund!.status }));
      setReason("");
      setMessage("Đã gửi yêu cầu hoàn tiền tới admin.");
    } catch {
      setMessage("Lỗi mạng. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center justify-center rounded-md border border-rose-200 bg-white px-3 text-sm font-bold text-rose-700 shadow-sm hover:bg-rose-50"
      >
        Yêu cầu hoàn tiền
      </button>

      {open ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 p-4" role="dialog" aria-modal="true" aria-label="Yêu cầu hoàn tiền">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="border-b border-slate-200 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">Yêu cầu hoàn tiền</h2>
                  <p className="mt-1 text-sm text-slate-500">Chỉ hiển thị khóa học đăng ký trong 7 ngày gần nhất và tiến độ chưa vượt 50%.</p>
                </div>
                <button type="button" onClick={() => setOpen(false)} className="rounded-md border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  Đóng
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {courses.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                  Hiện không có khóa học nào đủ điều kiện hoàn tiền.
                </div>
              ) : (
                <form onSubmit={submitRefund} className="space-y-4">
                  <label className="block text-sm font-semibold text-slate-700">
                    Chọn khóa học cần hoàn tiền
                    <select
                      value={selectedCourse?.courseId ?? ""}
                      onChange={(event) => {
                        setSelectedCourseId(event.target.value);
                        setMessage("");
                        setReason("");
                      }}
                      className="mt-2 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                      {courses.map((course) => {
                        const status = statuses[course.courseId];
                        return (
                          <option key={course.courseId} value={course.courseId}>
                            {course.courseName} - {currency.format(course.refundAmount)}{status ? ` - ${statusCopy[status]}` : ""}
                          </option>
                        );
                      })}
                    </select>
                  </label>

                  {selectedCourse ? (
                    <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h3 className="font-bold text-slate-950">{selectedCourse.courseName}</h3>
                          <div className="mt-2 grid gap-1 text-xs font-semibold text-slate-500">
                            <span>Đăng ký: {new Date(selectedCourse.enrolledAt).toLocaleString("vi-VN")}</span>
                            <span>Tiến độ: {selectedCourse.completed}/{selectedCourse.lessonsCount} bài ({selectedCourse.progress}%)</span>
                          </div>
                        </div>
                        <div className="rounded-lg bg-white px-3 py-2 text-right shadow-sm">
                          <p className="text-xs font-semibold uppercase text-slate-500">Số tiền hoàn</p>
                          <p className="mt-1 text-lg font-black text-emerald-700">{currency.format(selectedCourse.refundAmount)}</p>
                        </div>
                      </div>

                      {selectedStatus ? (
                        <p className={`mt-4 rounded-lg border px-3 py-2 text-sm font-semibold ${statusClass[selectedStatus]}`}>
                          {statusCopy[selectedStatus]}
                        </p>
                      ) : (
                        <div className="mt-4">
                          <label className="block text-sm font-semibold text-slate-700">
                            Lý do hoàn tiền
                            <textarea
                              required
                              rows={5}
                              value={reason}
                              onChange={(event) => setReason(event.target.value)}
                              placeholder="Ví dụ: Tôi đăng ký nhầm khóa học và chưa có nhu cầu học khóa này."
                              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            />
                          </label>

                          {message ? <p className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">{message}</p> : null}

                          <div className="mt-4 flex justify-end">
                            <button type="submit" disabled={loading} className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60">
                              {loading ? "Đang gửi..." : "Gửi yêu cầu"}
                            </button>
                          </div>
                        </div>
                      )}
                    </section>
                  ) : null}
                </form>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
