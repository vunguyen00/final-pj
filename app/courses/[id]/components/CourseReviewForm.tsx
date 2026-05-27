"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CourseReview } from "@/lib/course-reviews";

const ratingOptions = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

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
  const [rating, setRating] = useState(existingReview?.rating ?? 5);
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
        setMessage(data.error || "Khong luu duoc danh gia.");
        return;
      }

      setMessage("Da luu danh gia cua ban.");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  if (!canReview) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        Hoan thanh khoa hoc va pass bai test de mo khoa phan danh gia.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="font-bold text-slate-950">
        {existingReview ? "Cap nhat danh gia cua ban" : "Danh gia khoa hoc"}
      </h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {ratingOptions.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setRating(value)}
            className={`rounded-lg border px-3 py-2 text-sm font-bold ${
              value === rating
                ? "border-amber-300 bg-amber-50 text-amber-600"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
            aria-label={`${value} stars`}
          >
            {value.toFixed(1)}
          </button>
        ))}
      </div>
      <p className="mt-2 text-sm font-semibold text-amber-600">{rating.toFixed(1)} / 5 sao</p>
      <textarea
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        rows={4}
        placeholder="Binh luan tuy chon sau khi hoan thanh khoa hoc..."
        className="mt-3 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
      {message ? <p className="mt-2 text-sm text-slate-600">{message}</p> : null}
      <button
        type="button"
        onClick={() => void submitReview()}
        disabled={submitting}
        className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-slate-300"
      >
        {submitting ? "Dang luu..." : "Gui danh gia"}
      </button>
    </div>
  );
}
