"use client";

import { useReducer } from "react";

const categories = [
  ["INACCURATE_CONTENT", "Nội dung sai hoặc thiếu chính xác"],
  ["BROKEN_RESOURCE", "Video hoặc tài liệu bị lỗi"],
  ["ACCESS_PROBLEM", "Không truy cập được bài học"],
  ["INAPPROPRIATE_CONTENT", "Nội dung không phù hợp"],
  ["QUALITY_MISMATCH", "Chất lượng không đúng mô tả"],
  ["INSTRUCTOR_PROBLEM", "Vấn đề với giảng viên"],
  ["OTHER", "Vấn đề khác"],
] as const;

type ReportCategory = (typeof categories)[number][0];

type ReportFormState = {
  open: boolean;
  category: ReportCategory;
  lessonId: string;
  title: string;
  description: string;
  truthfulConfirmed: boolean;
  submitting: boolean;
  message: string;
};

type ReportFormAction =
  | { type: "opened" }
  | { type: "closed" }
  | {
      type: "fieldChanged";
      field: "category" | "lessonId" | "title" | "description";
      value: string;
    }
  | { type: "truthfulConfirmedChanged"; value: boolean }
  | { type: "submitStarted" }
  | { type: "submitFailed"; message: string }
  | { type: "submitSucceeded"; message: string };

const initialReportFormState: ReportFormState = {
  open: false,
  category: "INACCURATE_CONTENT",
  lessonId: "",
  title: "",
  description: "",
  truthfulConfirmed: false,
  submitting: false,
  message: "",
};

function reportFormReducer(
  state: ReportFormState,
  action: ReportFormAction,
): ReportFormState {
  switch (action.type) {
    case "opened":
      return { ...state, open: true };
    case "closed":
      return { ...state, open: false };
    case "fieldChanged":
      return { ...state, [action.field]: action.value };
    case "truthfulConfirmedChanged":
      return { ...state, truthfulConfirmed: action.value };
    case "submitStarted":
      return { ...state, submitting: true, message: "" };
    case "submitFailed":
      return { ...state, submitting: false, message: action.message };
    case "submitSucceeded":
      return {
        ...state,
        lessonId: "",
        title: "",
        description: "",
        truthfulConfirmed: false,
        submitting: false,
        message: action.message,
      };
  }
}

export default function CourseReportButton({
  courseId,
  lessons,
}: {
  courseId: string;
  lessons: Array<{ id: string; title: string }>;
}) {
  const [state, dispatch] = useReducer(
    reportFormReducer,
    initialReportFormState,
  );
  const {
    open,
    category,
    lessonId,
    title,
    description,
    truthfulConfirmed,
    submitting,
    message,
  } = state;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    dispatch({ type: "submitStarted" });
    const response = await fetch("/api/course-reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courseId,
        category,
        lessonId: lessonId || null,
        title,
        description,
        truthfulConfirmed,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      dispatch({
        type: "submitFailed",
        message: data?.error || "Không thể gửi báo cáo.",
      });
      return;
    }
    dispatch({
      type: "submitSucceeded",
      message:
        "Báo cáo đã được gửi. Admin và giảng viên phụ trách có thể xem báo cáo này.",
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => dispatch({ type: "opened" })}
        className="w-full rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100"
      >
        Báo cáo khóa học
      </button>
      {open ? (
        <dialog
          open
          className="fixed inset-0 z-50 flex h-full w-full max-w-none items-center justify-center overflow-y-auto border-0 bg-slate-950/65 p-4"
          aria-labelledby="course-report-title"
        >
          <form
            onSubmit={submit}
            className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="course-report-title" className="text-xl font-bold text-slate-950">
                  Báo cáo khóa học
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Mô tả rõ vấn đề để giảng viên và admin có thể kiểm tra.
                </p>
              </div>
              <button
                type="button"
                onClick={() => dispatch({ type: "closed" })}
                aria-label="Đóng"
                className="rounded-lg px-3 py-1 text-xl text-slate-500 hover:bg-slate-100"
              >
                ×
              </button>
            </div>
            <div className="mt-5 grid gap-4">
              <label className="text-sm font-semibold text-slate-700">
                Loại vấn đề
                <select
                  value={category}
                  onChange={(event) =>
                    dispatch({
                      type: "fieldChanged",
                      field: "category",
                      value: event.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                >
                  {categories.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              {lessons.length ? (
                <label className="text-sm font-semibold text-slate-700">
                  Bài học liên quan (không bắt buộc)
                  <select
                    value={lessonId}
                    onChange={(event) =>
                      dispatch({
                        type: "fieldChanged",
                        field: "lessonId",
                        value: event.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                  >
                    <option value="">Toàn bộ khóa học</option>
                    {lessons.map((lesson) => (
                      <option key={lesson.id} value={lesson.id}>
                        {lesson.title}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <label className="text-sm font-semibold text-slate-700">
                Tiêu đề
                <input
                  required
                  minLength={5}
                  maxLength={160}
                  value={title}
                  onChange={(event) =>
                    dispatch({
                      type: "fieldChanged",
                      field: "title",
                      value: event.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                />
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Nội dung chi tiết
                <textarea
                  required
                  minLength={20}
                  maxLength={5000}
                  rows={6}
                  value={description}
                  onChange={(event) =>
                    dispatch({
                      type: "fieldChanged",
                      field: "description",
                      value: event.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                />
              </label>
              <label className="flex items-start gap-3 rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={truthfulConfirmed}
                  onChange={(event) =>
                    dispatch({
                      type: "truthfulConfirmedChanged",
                      value: event.target.checked,
                    })
                  }
                  className="mt-0.5"
                />
                Tôi xác nhận nội dung báo cáo là đúng sự thật.
              </label>
            </div>
            {message ? (
              <p
                className={`mt-4 rounded-lg p-3 text-sm ${
                  message.startsWith("Báo cáo đã")
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-red-50 text-red-700"
                }`}
                role="status"
              >
                {message}
              </p>
            ) : null}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => dispatch({ type: "closed" })}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Đóng
              </button>
              <button
                type="submit"
                disabled={submitting || !truthfulConfirmed}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {submitting ? "Đang gửi..." : "Gửi báo cáo"}
              </button>
            </div>
          </form>
        </dialog>
      ) : null}
    </>
  );
}
