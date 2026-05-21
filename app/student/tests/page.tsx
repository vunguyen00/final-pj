"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type Test = {
  id: string;
  name: string;
  description: string | null;
  courseId: string;
  courseName: string;
  maxScore: number;
  passingScore: number;
  maxAttempts: number;
  timeLimit: number | null;
  questionCount: number;
  userAttempts: number;
  hasAttempt: boolean;
  progress: number;
  isUnlocked: boolean;
  lastAttempt: {
    id: string;
    score: number;
    isPassed: boolean;
    submittedAt: string;
  } | null;
  canAttempt: boolean;
};

export default function StudentTestsPage() {
  const searchParams = useSearchParams();
  const courseId = searchParams.get("courseId");
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    fetchTests();
  }, [courseId]);

  const fetchTests = async () => {
    try {
      const query = courseId ? `?courseId=${encodeURIComponent(courseId)}` : "";
      const res = await fetch(`/api/student/tests${query}`);
      if (res.ok) {
        const data = await res.json();
        setTests(data.tests);
        setError("");
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data?.error || "Khong the tai danh sach bai test.");
      }
    } catch (error) {
      console.error("Error fetching tests:", error);
      setError("Khong the tai danh sach bai test.");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-emerald-50 py-8">
      <div className="mx-auto max-w-5xl px-4">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-emerald-900">Danh sach bai test</h1>
            <p className="mt-1 text-sm text-emerald-700">Chi mo khi tien do khoa hoc dat 100%</p>
          </div>
          <Link href="/student" className="text-sm text-emerald-700 hover:text-emerald-900">
            Quay lai
          </Link>
        </div>

        <div className="space-y-4">
          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          ) : null}
          {tests.length === 0 ? (
            <div className="rounded-xl border border-emerald-200 bg-white p-8 text-center text-sm text-emerald-700">
              Khong co bai test nao cho khoa hoc nay.
            </div>
          ) : null}
          {tests.map((test) => (
            <div key={test.id} className="rounded-xl border border-emerald-200 bg-white p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-emerald-900">{test.name}</h3>
                    {test.hasAttempt ? (
                      test.lastAttempt?.isPassed ? (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Da dat</span>
                      ) : (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Chua dat</span>
                      )
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">Chua lam</span>
                    )}
                    {!test.isUnlocked ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Khoa test</span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-emerald-600">Khoa hoc: {test.courseName}</p>
                  <p className="mt-2 text-sm text-emerald-700">Tien do khoa hoc: {test.progress}%</p>
                  {!test.isUnlocked ? (
                    <p className="mt-1 text-sm text-amber-700">Can hoan thanh 100% noi dung hoc truoc khi lam test.</p>
                  ) : null}

                  {test.lastAttempt ? (
                    <div className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
                      Lan gan nhat: {formatDate(test.lastAttempt.submittedAt)} | Diem: {test.lastAttempt.score.toFixed(1)}/{test.maxScore}
                    </div>
                  ) : null}
                </div>

                <div className="ml-4 flex flex-col gap-2">
                  {test.canAttempt ? (
                    <Link href={`/student/tests/${test.id}`} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
                      {test.userAttempts > 0 ? "Lam lai" : "Bat dau"}
                    </Link>
                  ) : (
                    <span className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-500">
                      {!test.isUnlocked ? "Chua mo" : "Het lan lam"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
