"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type CourseFilter = {
  id: string;
  name: string;
};

type TestFilter = {
  id: string;
  name: string;
  courseId: string;
};

type AttemptHistory = {
  attemptId: string;
  attemptNo: number;
  score: number;
  maxScore: number;
  isPassed: boolean;
  submittedAt: string;
  totalQuestions: number;
  correctAnswers: number;
  test: {
    id: string;
    name: string;
    maxScore: number;
  };
  course: {
    id: string;
    name: string;
  };
};

export default function StudentTestHistoryPage() {
  const [courses, setCourses] = useState<CourseFilter[]>([]);
  const [tests, setTests] = useState<TestFilter[]>([]);
  const [history, setHistory] = useState<AttemptHistory[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState("all");
  const [selectedTestId, setSelectedTestId] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchHistory() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (selectedCourseId !== "all") params.set("courseId", selectedCourseId);
        if (selectedTestId !== "all") params.set("testId", selectedTestId);
        const query = params.toString() ? `?${params.toString()}` : "";
        const res = await fetch(`/api/student/tests/history${query}`, { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data?.error || "Không thể tải lịch sử làm bài.");
          return;
        }
        setCourses(data.courses || []);
        setTests(data.tests || []);
        setHistory(data.history || []);
        setError("");
      } catch {
        setError("Không thể tải lịch sử làm bài.");
      } finally {
        setLoading(false);
      }
    }

    void fetchHistory();
  }, [selectedCourseId, selectedTestId]);

  const visibleTests = useMemo(() => {
    if (selectedCourseId === "all") return tests;
    return tests.filter((item) => item.courseId === selectedCourseId);
  }, [tests, selectedCourseId]);

  const stats = useMemo(() => {
    const totalAttempts = history.length;
    const passed = history.filter((item) => item.isPassed).length;
    const averageScore = totalAttempts
      ? history.reduce((sum, item) => sum + (item.maxScore > 0 ? (item.score / item.maxScore) * 100 : 0), 0) /
        totalAttempts
      : 0;
    return {
      totalAttempts,
      passed,
      averageScore: Math.round(averageScore),
    };
  }, [history]);

  return (
    <main className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-7xl px-4">
        <section className="rounded-3xl bg-gradient-to-br from-slate-900 to-blue-900 p-6 text-white shadow-lg sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-200">Lịch sử bài test</p>
              <h1 className="mt-2 text-3xl font-bold">Lịch sử làm bài của tôi</h1>
              <p className="mt-2 text-slate-200">
                Xem lại toàn bộ kết quả, câu trả lời và phản hồi AI cho từng lần nộp bài.
              </p>
            </div>
            <div className="flex gap-2">
              <Link href="/student/tests" className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-blue-800 hover:bg-blue-50">
                Quay lại danh sách bài test
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <Stat label="Tổng số lần làm" value={stats.totalAttempts} />
          <Stat label="Số lần đạt" value={stats.passed} />
          <Stat label="Điểm trung bình" value={`${stats.averageScore}%`} />
        </section>

        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-semibold text-slate-700">Lọc theo khóa học</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setSelectedCourseId("all");
                setSelectedTestId("all");
              }}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                selectedCourseId === "all" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"
              }`}
            >
              Tất cả khóa học
            </button>
            {courses.map((course) => (
              <button
                key={course.id}
                type="button"
                onClick={() => {
                  setSelectedCourseId(course.id);
                  setSelectedTestId("all");
                }}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  selectedCourseId === course.id ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"
                }`}
              >
                {course.name}
              </button>
            ))}
          </div>
          <p className="mt-4 text-sm font-semibold text-slate-700">Lọc theo bài test</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedTestId("all")}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                selectedTestId === "all" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"
              }`}
            >
              Tất cả bài test
            </button>
            {visibleTests.map((test) => (
              <button
                key={test.id}
                type="button"
                onClick={() => setSelectedTestId(test.id)}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  selectedTestId === test.id ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"
                }`}
              >
                {test.name}
              </button>
            ))}
          </div>
        </section>

        {loading ? (
          <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
            <div className="h-10 animate-pulse rounded bg-slate-200" />
          </section>
        ) : null}

        {error ? <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

        {!loading && !error ? (
          <section className="mt-6 space-y-3">
            {history.map((item) => {
              const scorePct = item.maxScore > 0 ? Math.round((item.score / item.maxScore) * 100) : 0;
              return (
                <article key={item.attemptId} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-blue-600">{item.course.name}</p>
                      <h2 className="text-lg font-bold text-slate-950">{item.test.name}</h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Lần làm #{item.attemptNo} - {new Date(item.submittedAt).toLocaleString("vi-VN")}
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-lg font-bold text-slate-950">
                        {item.score.toFixed(1)} / {item.maxScore}
                      </p>
                      <p className={`text-sm font-semibold ${item.isPassed ? "text-emerald-600" : "text-amber-600"}`}>
                        {item.isPassed ? "Đạt" : "Chưa đạt"} - {scorePct}%
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                    <Metric label="Số câu đúng" value={`${item.correctAnswers}/${item.totalQuestions}`} />
                    <Metric label="Tổng câu hỏi" value={`${item.totalQuestions}`} />
                    <Link
                      href={`/student/tests/${item.test.id}/result/${item.attemptId}`}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-center font-semibold text-white hover:bg-blue-700"
                    >
                      Xem chi tiết kết quả
                    </Link>
                  </div>
                </article>
              );
            })}
            {history.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
                Chưa có lịch sử làm bài cho bộ lọc này.
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-950">{value}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-950">{value}</p>
    </div>
  );
}
