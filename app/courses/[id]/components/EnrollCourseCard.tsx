"use client";

import Link from "next/link";
import { useState } from "react";

type Props = {
  courseId: string;
  price: number;
  initiallyEnrolled: boolean;
};

export default function EnrollCourseCard({ courseId, price, initiallyEnrolled }: Props) {
  const [enrolled, setEnrolled] = useState(initiallyEnrolled);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  async function handleEnroll() {
    setLoading(true);
    setError("");
    setInfo("");

    try {
      const response = await fetch(`/api/courses/${courseId}/enroll`, {
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok) {
        if (data.requiresTopUp) {
          setError(`So du ${Math.round(data.balance).toLocaleString("vi-VN")}d khong du. Can nap them.`);
          return;
        }

        setError(data.error ?? "Dang ky that bai.");
        return;
      }

      setEnrolled(true);
      setInfo("Dang ky khoa hoc thanh cong. Ban co the vao hoc ngay.");
    } catch {
      setError("Loi mang. Vui long thu lai.");
    } finally {
      setLoading(false);
    }
  }

  async function handleTopUp() {
    setLoading(true);
    setError("");
    setInfo("");

    try {
      const response = await fetch("/api/wallet/top-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Math.max(price, 50000) }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Nap tien that bai.");
        return;
      }

      setInfo("Nap tien thanh cong. Ban co the dang ky lai khoa hoc.");
    } catch {
      setError("Loi mang. Vui long thu lai.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="text-3xl font-bold text-slate-900">{price.toLocaleString("vi-VN")}d</div>
      <button
        disabled={loading || enrolled}
        onClick={handleEnroll}
        className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {enrolled ? "Da dang ky" : loading ? "Dang xu ly..." : "Dang ky ngay"}
      </button>

      {enrolled ? (
        <Link
          href={`/student/hoc-bai?courseId=${courseId}`}
          className="mt-3 block w-full rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-center text-sm font-medium text-emerald-700 hover:bg-emerald-100"
        >
          Vao hoc
        </Link>
      ) : null}

      {error ? (
        <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          <p>{error}</p>
          <button
            type="button"
            disabled={loading}
            onClick={handleTopUp}
            className="mt-2 rounded-md bg-amber-600 px-3 py-1.5 text-white hover:bg-amber-700 disabled:bg-amber-300"
          >
            Nap tien nhanh
          </button>
        </div>
      ) : null}
      {info ? <p className="mt-3 text-sm text-emerald-700">{info}</p> : null}
    </div>
  );
}
