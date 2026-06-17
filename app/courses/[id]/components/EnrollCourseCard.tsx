"use client";

import Link from "next/link";
import { useState } from "react";

type Props = {
  courseId: string;
  price: number;
  initiallyEnrolled: boolean;
  canLearnDirectly?: boolean;
};

export default function EnrollCourseCard({
  courseId,
  price,
  initiallyEnrolled,
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
        if (data.requiresTopUp) {
          setError(`Số dư ${Math.round(data.balance).toLocaleString("vi-VN")}đ không đủ. Cần nạp thêm.`);
          return;
        }

        setError(data.error ?? "Đăng ký thất bại.");
        return;
      }

      setEnrolled(true);
      const remainingBalance =
        typeof data?.balance === "number"
          ? ` Số dư còn lại: ${Math.round(data.balance).toLocaleString("vi-VN")}đ.`
          : "";
      setInfo(`Đăng ký khóa học thành công.${remainingBalance} Bạn có thể vào học ngay.`);
    } catch {
      setError("Lỗi mạng. Vui lòng thử lại.");
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
        body: JSON.stringify({ amount: Math.max(Math.ceil(price), 50000) }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Nạp tiền thất bại.");
        return;
      }

      if (!data?.paymentUrl) {
        setError("Không tạo được đường dẫn thanh toán.");
        return;
      }

      window.location.href = data.paymentUrl;
    } catch {
      setError("Lỗi mạng. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="text-3xl font-bold text-slate-900">{price.toLocaleString("vi-VN")}đ</div>
      {!canLearnDirectly ? (
        <button
          type="button"
          disabled={loading || enrolled}
          onClick={handleEnroll}
          className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {enrolled ? "Đã đăng ký" : loading ? "Đang xử lý..." : "Đăng ký ngay"}
        </button>
      ) : (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Bạn là giảng viên của khóa học này. Có thể vào học ngay.
        </p>
      )}

      {enrolled ? (
        <Link
          href={`/student/hoc-bai?courseId=${courseId}`}
          className="mt-3 block w-full rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-center text-sm font-medium text-emerald-700 hover:bg-emerald-100"
        >
          Vào học
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
            Nạp tiền nhanh
          </button>
          <Link
            href="/student/wallet"
            className="ml-2 inline-block rounded-md border border-amber-400 px-3 py-1.5 text-amber-800 hover:bg-amber-100"
          >
            Mở ví
          </Link>
        </div>
      ) : null}
      {info ? <p className="mt-3 text-sm text-emerald-700">{info}</p> : null}
    </div>
  );
}

