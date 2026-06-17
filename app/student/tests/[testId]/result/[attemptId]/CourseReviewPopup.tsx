"use client";

import { useEffect, useReducer } from "react";
import StarRatingInput from "@/app/components/StarRatingInput";

type ReviewState = {
  open: boolean;
  rating: number;
  comment: string;
  message: string;
  submitting: boolean;
};

type ReviewAction =
  | { type: "PATCH"; patch: Partial<ReviewState> }
  | { type: "CLOSE" };

function reviewReducer(state: ReviewState, action: ReviewAction): ReviewState {
  switch (action.type) {
    case "PATCH":
      return { ...state, ...action.patch };
    case "CLOSE":
      return { ...state, open: false };
    default:
      return state;
  }
}

export default function CourseReviewPopup({
  courseId,
  courseName,
  shouldOpen,
}: {
  courseId: string;
  courseName: string;
  shouldOpen: boolean;
}) {
  const storageKey = `course-review-popup-dismissed-${courseId}`;
  const [state, dispatch] = useReducer(reviewReducer, {
    open: false,
    rating: 5,
    comment: "",
    message: "",
    submitting: false,
  });

  useEffect(() => {
    if (shouldOpen && sessionStorage.getItem(storageKey) !== "1") {
      dispatch({ type: "PATCH", patch: { open: true } });
    }
  }, [shouldOpen, storageKey]);

  function closePopup() {
    sessionStorage.setItem(storageKey, "1");
    dispatch({ type: "CLOSE" });
  }

  async function submitReview() {
    dispatch({ type: "PATCH", patch: { submitting: true, message: "" } });

    try {
      const response = await fetch(`/api/courses/${courseId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: state.rating, comment: state.comment }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        dispatch({ type: "PATCH", patch: { message: data.error || "Không thể lưu đánh giá." } });
        return;
      }

      closePopup();
    } finally {
      dispatch({ type: "PATCH", patch: { submitting: false } });
    }
  }

  if (!state.open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Hoàn thành khóa học</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-950">Đánh giá {courseName}</h2>
            <p className="mt-2 text-sm text-slate-600">
              Chọn điểm từ 1 đến 5 sao. Bình luận là tùy chọn và bạn có thể sửa lại sau.
            </p>
          </div>
          <button type="button" onClick={closePopup} className="rounded-lg border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-600 hover:bg-slate-50">
            Bỏ qua
          </button>
        </div>

        <StarRatingInput
          value={state.rating}
          onChange={(rating) => dispatch({ type: "PATCH", patch: { rating } })}
          disabled={state.submitting}
          className="mt-5"
        />
        <p className="mt-2 text-sm font-semibold text-amber-600">{state.rating} / 5 sao</p>

        <textarea
          value={state.comment}
          onChange={(event) => dispatch({ type: "PATCH", patch: { comment: event.target.value } })}
          rows={4}
          placeholder="Bình luận tùy chọn..."
          className="mt-4 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
        {state.message ? <p className="mt-2 text-sm text-red-600">{state.message}</p> : null}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={closePopup} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Để sau
          </button>
          <button type="button" onClick={() => void submitReview()} disabled={state.submitting} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-slate-300">
            {state.submitting ? "Đang lưu..." : "Gửi đánh giá"}
          </button>
        </div>
      </div>
    </div>
  );
}
