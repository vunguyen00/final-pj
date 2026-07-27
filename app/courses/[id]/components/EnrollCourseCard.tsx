"use client";

import Link from "next/link";
import { useState } from "react";
import { readJsonResponse } from "@/lib/http-response";
import { getLearningUiLabels } from "@/lib/test-language-labels";

type Props = {
  courseId: string;
  price: number;
  initiallyEnrolled: boolean;
  accessSuspended?: boolean;
  canLearnDirectly?: boolean;
  languageCode?: string | null;
};

export default function EnrollCourseCard({
  courseId,
  price,
  initiallyEnrolled,
  accessSuspended = false,
  canLearnDirectly = false,
  languageCode,
}: Props) {
  const labels = getLearningUiLabels(languageCode).course;
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
      const data = await readJsonResponse(response);

      if (!response.ok) {
        setError(data.error ?? labels.paymentError);
        return;
      }

      if (data.enrolled) {
        setEnrolled(true);
        setInfo(labels.enrollmentSuccess);
        return;
      }

      if (!data.paymentUrl) {
        setError(labels.paymentError);
        return;
      }

      window.location.href = data.paymentUrl;
    } catch {
      setError(labels.networkError);
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
          {enrolled ? labels.enrolled : loading ? labels.creatingPayment : labels.buyWithVnpay}
        </button>
      ) : (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {labels.teacherCanLearn}
        </p>
      )}

      {enrolled && !accessSuspended ? (
        <Link
          href={`/student/hoc-bai?courseId=${courseId}`}
          className="mt-3 block w-full rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-center text-sm font-medium text-emerald-700 hover:bg-emerald-100"
        >
          {labels.enterCourse}
        </Link>
      ) : null}

      {accessSuspended ? (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          {labels.accessSuspended}
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
