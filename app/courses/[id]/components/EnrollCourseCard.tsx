"use client";

import Link from "next/link";
import { useState } from "react";

type Props = {
  courseId: string;
  price: number;
  initiallyEnrolled: boolean;
  accessSuspended?: boolean;
  canLearnDirectly?: boolean;
};

export default function EnrollCourseCard({
  courseId,
  price,
  initiallyEnrolled,
  accessSuspended = false,
  canLearnDirectly = false,
}: Props) {
  const [enrolled, setEnrolled] = useState(initiallyEnrolled || canLearnDirectly);
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
        setError(data.error ?? "Khong tao duoc don thanh toan.");
        return;
      }

      if (data.enrolled) {
        setEnrolled(true);
        setInfo("Dang ky khoa hoc thanh cong. Ban co the vao hoc ngay.");
        return;
      }

      if (!data.paymentUrl) {
        setError("Khong tao duoc duong dan thanh toan VNPay.");
        return;
      }

      window.location.href = data.paymentUrl;
    } catch {
      setError("Loi mang. Vui long thu lai.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="text-3xl font-bold text-slate-900">{price.toLocaleString("vi-VN")}d</div>
      {!canLearnDirectly ? (
        <button
          type="button"
          disabled={loading || enrolled}
          onClick={handleEnroll}
          className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {enrolled ? "Da dang ky" : loading ? "Dang tao don thanh toan..." : "Mua khoa hoc qua VNPay"}
        </button>
      ) : (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Ban la giang vien cua khoa hoc nay. Co the vao hoc ngay.
        </p>
      )}

      {enrolled && !accessSuspended ? (
        <Link
          href={`/student/hoc-bai?courseId=${courseId}`}
          className="mt-3 block w-full rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-center text-sm font-medium text-emerald-700 hover:bg-emerald-100"
        >
          Vao hoc
        </Link>
      ) : null}

      {accessSuspended ? (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          Quyền học đang tạm khóa trong khi yêu cầu hoàn tiền được admin xử lý.
        </p>
      ) : null}

      {error ? (
        <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          <p>{error}</p>
        </div>
      ) : null}
      {info ? <p className="mt-3 text-sm text-emerald-700">{info}</p> : null}
    </div>
  );
}
