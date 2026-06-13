"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import StarRatingInput from "@/app/components/StarRatingInput";
import type { CourseReview } from "@/lib/course-reviews";

export default function CourseReviewForm({
  courseId,
  canReview,
  existingReview,
}: {
  courseId: string;
  canReview: boolean;
  existingReview: CourseReview | null;
}) {
  const router = useRouter();
  const [rating, setRating] = useState(
    Math.max(1, Math.min(5, Math.round(existingReview?.rating ?? 5))),
  );
  const [comment, setComment] = useState(existingReview?.comment ?? "");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submitReview() {
    setSubmitting(true);
    setMessage("");

    try {
      const response = await fetch(`/api/courses/${courseId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setMessage(data.error || "Không lưu được đánh giá.");
        return;
      }

      setMessage("Đã lưu đánh giá của bạn.");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  if (!canReview) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        Hoàn thành khóa học và đạt bài test để mở phần đánh giá.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="font-bold text-slate-950">
        {existingReview ? "Cập nhật đánh giá của bạn" : "Đánh giá khóa học"}
      </h3>
      <StarRatingInput
        value={rating}
        onChange={setRating}
        disabled={submitting}
        className="mt-3"
      />
      <p className="mt-2 text-sm font-semibold text-amber-600">{rating} / 5 sao</p>
      <textarea
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        rows={4}
        placeholder="Bình luận tùy chọn sau khi hoàn thành khóa học..."
        className="mt-3 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
      {message ? <p className="mt-2 text-sm text-slate-600">{message}</p> : null}
      <button
        type="button"
        onClick={() => void submitReview()}
        disabled={submitting}
        className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-slate-300"
      >
        {submitting ? "Đang lưu..." : "Gửi đánh giá"}
      </button>
    </div>
  );
}
