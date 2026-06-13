"use client";

import { useState } from "react";

type StarRatingInputProps = {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  className?: string;
};

const ratings = [1, 2, 3, 4, 5];

export default function StarRatingInput({
  value,
  onChange,
  disabled = false,
  className = "",
}: StarRatingInputProps) {
  const [hoveredRating, setHoveredRating] = useState(0);
  const visibleRating = hoveredRating || value;

  return (
    <div
      role="group"
      aria-label="Đánh giá khóa học"
      className={`flex items-center gap-1 ${className}`}
      onMouseLeave={() => setHoveredRating(0)}
    >
      {ratings.map((rating) => {
        const active = rating <= visibleRating;

        return (
          <button
            key={rating}
            type="button"
            aria-pressed={rating === value}
            aria-label={`${rating} sao`}
            title={`${rating} sao`}
            disabled={disabled}
            onClick={() => onChange(rating)}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight" || event.key === "ArrowUp") {
                event.preventDefault();
                onChange(Math.min(5, value + 1));
              }
              if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
                event.preventDefault();
                onChange(Math.max(1, value - 1));
              }
            }}
            onMouseEnter={() => setHoveredRating(rating)}
            onFocus={() => setHoveredRating(rating)}
            onBlur={() => setHoveredRating(0)}
            className={`rounded-lg p-1.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
              active
                ? "text-amber-400 hover:text-amber-500"
                : "text-slate-300 hover:text-amber-300"
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="h-9 w-9"
              fill={active ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m12 2.8 2.82 5.72 6.31.92-4.56 4.44 1.08 6.28L12 17.19l-5.65 2.97 1.08-6.28-4.56-4.44 6.31-.92L12 2.8Z" />
            </svg>
          </button>
        );
      })}
    </div>
  );
}
