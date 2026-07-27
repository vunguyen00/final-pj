"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type CourseFilter = {
  id: string;
  name: string;
};

type TestFilter = {
  id: string;
  name: string;
  courseId: string | null;
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
    id: string | null;
    name: string;
  };
};

function historyHref(courseId = "all", testId = "all") {
  const params = new URLSearchParams();
  if (courseId !== "all") params.set("courseId", courseId);
  if (testId !== "all") params.set("testId", testId);
  const query = params.toString();
  return query ? `/student/tests/history?${query}` : "/student/tests/history";
}

export default function StudentTestHistoryClient({
  courses,
  tests,
  history,
  selectedCourseId,
  selectedTestId,
  error = "",
}: {
  courses: CourseFilter[];
  tests: TestFilter[];
  history: AttemptHistory[];
  selectedCourseId: string;
  selectedTestId: string;
  error?: string;
}) {
  const router = useRouter();
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
          <div className="grid gap-4 md:grid-cols-2">
            <FilterSelect
              id="history-course-filter"
              label="Lọc theo khóa học"
              value={selectedCourseId}
              onChange={(courseId) => router.push(historyHref(courseId))}
            >
              <option value="all">Tất cả khóa học</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </FilterSelect>

            <FilterSelect
              id="history-test-filter"
              label="Lọc theo bài test"
              value={selectedTestId}
              onChange={(testId) =>
                router.push(historyHref(selectedCourseId, testId))
              }
            >
              <option value="all">Tất cả bài test chính</option>
              {visibleTests.map((test) => (
                <option key={test.id} value={test.id}>
                  {test.name}
                </option>
              ))}
            </FilterSelect>
          </div>
        </section>

        {error ? <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

        {!error ? (
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

                  <div className="mt-4 flex flex-col gap-4 border-t border-slate-100 pt-4 text-sm sm:flex-row sm:items-end sm:justify-between">
                    <dl className="grid w-full flex-1 grid-cols-2 gap-x-12 gap-y-3 sm:max-w-xl sm:gap-x-20">
                      <Metric label="Số câu đúng" value={`${item.correctAnswers}/${item.totalQuestions}`} />
                      <Metric label="Tổng câu hỏi" value={`${item.totalQuestions}`} />
                    </dl>
                    <Link
                      href={`/student/tests/${item.test.id}/result/${item.attemptId}`}
                      className="w-fit font-semibold text-blue-700 underline decoration-blue-300 underline-offset-4 hover:text-blue-900"
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
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 font-semibold text-slate-950">{value}</dd>
    </div>
  );
}

function FilterSelect({
  id,
  label,
  value,
  onChange,
  children,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={id} className="block text-sm font-semibold text-slate-700">
      {label}
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 block h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      >
        {children}
      </select>
    </label>
  );
}
