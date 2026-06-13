"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { getCourseLanguage } from "@/app/components/learningMarketplace";

type TestKind = "COURSE" | "PUBLIC_PRACTICE" | "TEACHER_ENTRANCE";

type Test = {
  id: string;
  name: string;
  description: string | null;
  courseId: string | null;
  courseName: string;
  kind: TestKind;
  assessmentMode: "STANDARD" | "WRITING" | "SPEAKING";
  language: { id: string; name: string; code: string } | null;
  maxScore: number;
  passingScore: number;
  timeLimit: number | null;
  questionCount: number;
  totalQuestionScore: number;
  hasAttempt: boolean;
  progress: number;
  isUnlocked: boolean;
  isReady: boolean;
  lastAttempt: {
    id: string;
    score: number;
    isPassed: boolean;
    submittedAt: string;
  } | null;
  canAttempt: boolean;
};

type FilterState = {
  language: string;
  kind: "ALL" | "PRACTICE" | "COURSE";
  availability: "ALL" | "UNLOCKED" | "LOCKED";
  attempt: "ALL" | "ATTEMPTED" | "NOT_ATTEMPTED";
};

const defaultFilters: FilterState = {
  language: "ALL",
  kind: "ALL",
  availability: "ALL",
  attempt: "ALL",
};

export default function StudentTestsPage() {
  return (
    <Suspense fallback={<TestsLoading />}>
      <StudentTestsContent />
    </Suspense>
  );
}

function StudentTestsContent() {
  const searchParams = useSearchParams();
  const courseId = searchParams.get("courseId");
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [appliedFilters, setAppliedFilters] =
    useState<FilterState>(defaultFilters);
  const [draftFilters, setDraftFilters] =
    useState<FilterState>(defaultFilters);

  useEffect(() => {
    let active = true;

    async function fetchTests() {
      try {
        const query = courseId ? `?courseId=${encodeURIComponent(courseId)}` : "";
        const response = await fetch(`/api/student/tests${query}`, {
          cache: "no-store",
        });
        const data = await response.json().catch(() => ({}));
        if (!active) return;

        if (!response.ok) {
          setError(data?.error || "Không thể tải danh sách bài test.");
          return;
        }

        setTests(data.tests || []);
        setError("");
      } catch {
        if (active) setError("Không thể tải danh sách bài test.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void fetchTests();
    return () => {
      active = false;
    };
  }, [courseId]);

  const getLanguageName = (test: Test) =>
    test.language?.name ||
    getCourseLanguage({
      name: `${test.courseName} ${test.name}`,
      description: test.description,
    });

  const languageOptions = useMemo(() => {
    const values = new Set(tests.map(getLanguageName));
    return Array.from(values).sort((a, b) => a.localeCompare(b, "vi"));
  }, [tests]);

  const filteredTests = useMemo(
    () =>
      tests.filter((test) => {
        if (
          appliedFilters.language !== "ALL" &&
          getLanguageName(test) !== appliedFilters.language
        ) {
          return false;
        }
        if (
          appliedFilters.kind === "PRACTICE" &&
          test.kind !== "PUBLIC_PRACTICE"
        ) {
          return false;
        }
        if (appliedFilters.kind === "COURSE" && test.kind !== "COURSE") {
          return false;
        }
        if (
          appliedFilters.availability === "UNLOCKED" &&
          !test.canAttempt
        ) {
          return false;
        }
        if (appliedFilters.availability === "LOCKED" && test.canAttempt) {
          return false;
        }
        if (appliedFilters.attempt === "ATTEMPTED" && !test.hasAttempt) {
          return false;
        }
        if (appliedFilters.attempt === "NOT_ATTEMPTED" && test.hasAttempt) {
          return false;
        }
        return true;
      }),
    [appliedFilters, tests],
  );

  const stats = {
    available: tests.filter((test) => test.canAttempt).length,
    completed: tests.filter((test) => test.hasAttempt).length,
    locked: tests.filter((test) => !test.canAttempt).length,
  };

  const activeFilterCount = Object.entries(appliedFilters).filter(
    ([key, value]) =>
      value !== defaultFilters[key as keyof FilterState],
  ).length;

  if (loading) return <TestsLoading />;

  return (
    <main className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 p-6 text-white shadow-lg sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-100">
                Trung tâm kiểm tra
              </p>
              <h1 className="mt-3 text-3xl font-black sm:text-4xl">
                Bài test của bạn
              </h1>
              <p className="mt-3 max-w-2xl leading-7 text-blue-100">
                Luyện tập theo ngôn ngữ, hoàn thành bài kiểm tra khóa học và
                theo dõi kết quả trong cùng một nơi.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setDraftFilters(appliedFilters);
                  setShowFilter(true);
                }}
                className="rounded-xl bg-white/15 px-4 py-2.5 text-sm font-semibold backdrop-blur hover:bg-white/25"
              >
                Bộ lọc {activeFilterCount ? `(${activeFilterCount})` : ""}
              </button>
              <Link
                href="/student/tests/history"
                className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-50"
              >
                Lịch sử làm bài
              </Link>
              <Link
                href="/student/results"
                className="rounded-xl border border-white/30 px-4 py-2.5 text-sm font-semibold hover:bg-white/10"
              >
                Tất cả kết quả
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-3">
          <Stat
            label="Có thể làm ngay"
            value={stats.available}
            color="text-emerald-700"
          />
          <Stat
            label="Đã làm"
            value={stats.completed}
            color="text-blue-700"
          />
          <Stat
            label="Chưa mở khóa"
            value={stats.locked}
            color="text-amber-700"
          />
        </section>

        {error ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <section className="mt-6 grid gap-5 lg:grid-cols-2">
          {filteredTests.map((test) => {
            const scorePercent =
              test.maxScore > 0 && test.lastAttempt
                ? Math.round((test.lastAttempt.score / test.maxScore) * 100)
                : 0;
            const kindLabel =
              test.kind === "PUBLIC_PRACTICE"
                ? "Đề luyện tập"
                : "Bài kiểm tra khóa học";
            const modeLabel =
              test.assessmentMode === "WRITING"
                ? "Bài viết AI"
                : test.assessmentMode === "SPEAKING"
                  ? "Bài nói AI"
                  : "Chấm đáp án";

            return (
              <article
                key={test.id}
                className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-2">
                      <Badge className="bg-blue-50 text-blue-700">
                        {getLanguageName(test)}
                      </Badge>
                      <Badge className="bg-violet-50 text-violet-700">
                        {kindLabel}
                      </Badge>
                      <Badge className="bg-orange-50 text-orange-700">
                        {modeLabel}
                      </Badge>
                      <Badge
                        className={
                          test.canAttempt
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                        }
                      >
                        {test.canAttempt ? "Sẵn sàng" : "Chưa khả dụng"}
                      </Badge>
                    </div>
                    <h2 className="mt-4 text-xl font-bold text-slate-950">
                      {test.name}
                    </h2>
                    <p className="mt-1 text-sm font-medium text-blue-700">
                      {test.courseName}
                    </p>
                    <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">
                      {test.description ||
                        "Bài kiểm tra giúp đánh giá kiến thức và kỹ năng đã học."}
                    </p>
                  </div>

                  {test.canAttempt ? (
                    <Link
                      href={`/student/tests/${test.id}`}
                      className="shrink-0 rounded-xl bg-blue-600 px-4 py-2.5 text-center text-sm font-bold text-white hover:bg-blue-700"
                    >
                      {test.hasAttempt ? "Làm lại" : "Bắt đầu"}
                    </Link>
                  ) : (
                    <span className="shrink-0 rounded-xl bg-slate-100 px-4 py-2.5 text-center text-sm font-semibold text-slate-500">
                      {!test.isUnlocked
                        ? "Chưa hoàn thành khóa học"
                        : !test.isReady
                          ? "Đề chưa đủ 100 điểm"
                          : "Không khả dụng"}
                    </span>
                  )}
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Metric label="Tiến độ" value={`${test.progress}%`} />
                  <Metric label="Câu hỏi" value={`${test.questionCount}`} />
                  <Metric
                    label="Thời gian"
                    value={
                      test.timeLimit
                        ? `${test.timeLimit} phút`
                        : "Không giới hạn"
                    }
                  />
                  <Metric label="Điểm đạt" value={`${test.passingScore}`} />
                </div>

                {test.lastAttempt ? (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-slate-700">
                        Kết quả gần nhất
                      </span>
                      <span
                        className={
                          test.lastAttempt.isPassed
                            ? "font-semibold text-emerald-700"
                            : "font-semibold text-amber-700"
                        }
                      >
                        {test.lastAttempt.isPassed ? "Đạt" : "Cần ôn thêm"}
                      </span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-slate-200">
                      <div
                        className="h-2 rounded-full bg-blue-600"
                        style={{ width: `${Math.min(100, scorePercent)}%` }}
                      />
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </section>

        {filteredTests.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
            Không có bài test phù hợp với bộ lọc hiện tại.
          </div>
        ) : null}
      </div>

      {showFilter ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-950">
                  Lọc bài test
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Chọn điều kiện để tìm bài phù hợp nhanh hơn.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowFilter(false)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700"
              >
                Đóng
              </button>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <FilterSelect
                label="Ngôn ngữ"
                value={draftFilters.language}
                onChange={(value) =>
                  setDraftFilters((previous) => ({
                    ...previous,
                    language: value,
                  }))
                }
                options={[
                  { value: "ALL", label: "Tất cả ngôn ngữ" },
                  ...languageOptions.map((language) => ({
                    value: language,
                    label: language,
                  })),
                ]}
              />
              <FilterSelect
                label="Loại bài test"
                value={draftFilters.kind}
                onChange={(value) =>
                  setDraftFilters((previous) => ({
                    ...previous,
                    kind: value as FilterState["kind"],
                  }))
                }
                options={[
                  { value: "ALL", label: "Tất cả" },
                  { value: "PRACTICE", label: "Đề luyện tập" },
                  { value: "COURSE", label: "Bài test khóa học" },
                ]}
              />
              <FilterSelect
                label="Khả dụng"
                value={draftFilters.availability}
                onChange={(value) =>
                  setDraftFilters((previous) => ({
                    ...previous,
                    availability: value as FilterState["availability"],
                  }))
                }
                options={[
                  { value: "ALL", label: "Tất cả" },
                  { value: "UNLOCKED", label: "Có thể làm" },
                  { value: "LOCKED", label: "Chưa thể làm" },
                ]}
              />
              <FilterSelect
                label="Trạng thái làm bài"
                value={draftFilters.attempt}
                onChange={(value) =>
                  setDraftFilters((previous) => ({
                    ...previous,
                    attempt: value as FilterState["attempt"],
                  }))
                }
                options={[
                  { value: "ALL", label: "Tất cả" },
                  { value: "ATTEMPTED", label: "Đã làm" },
                  { value: "NOT_ATTEMPTED", label: "Chưa làm" },
                ]}
              />
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setDraftFilters(defaultFilters);
                  setAppliedFilters(defaultFilters);
                }}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Xóa bộ lọc
              </button>
              <button
                type="button"
                onClick={() => {
                  setAppliedFilters(draftFilters);
                  setShowFilter(false);
                }}
                className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Áp dụng
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function Badge({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${className}`}>
      {children}
    </span>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-black ${color}`}>{value}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-bold text-slate-950">{value}</p>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="text-sm font-semibold text-slate-700">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TestsLoading() {
  return (
    <main className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-7xl space-y-5 px-4">
        <div className="h-56 animate-pulse rounded-3xl bg-slate-200" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-32 animate-pulse rounded-2xl bg-slate-200"
            />
          ))}
        </div>
      </div>
    </main>
  );
}
