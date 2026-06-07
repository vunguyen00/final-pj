"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
  lastAttempt: { id: string; score: number; isPassed: boolean; submittedAt: string } | null;
  canAttempt: boolean;
};

type FilterState = {
  language: string;
  kind: "ALL" | "TRAIN" | "COURSE";
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
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(defaultFilters);
  const [draftFilters, setDraftFilters] = useState<FilterState>(defaultFilters);

  useEffect(() => {
    async function fetchTests() {
      setLoading(true);
      try {
        const query = courseId ? `?courseId=${encodeURIComponent(courseId)}` : "";
        const res = await fetch(`/api/student/tests${query}`, { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data?.error || "Unable to load tests.");
          return;
        }
        setTests(data.tests || []);
        setError("");
      } catch {
        setError("Unable to load tests.");
      } finally {
        setLoading(false);
      }
    }

    void fetchTests();
  }, [courseId]);

  const languageOptions = useMemo(() => {
    const values = new Set<string>();
    for (const test of tests) {
      values.add(test.language?.name || getCourseLanguage({ name: `${test.courseName} ${test.name}`, description: test.description }));
    }
    return ["ALL", ...Array.from(values).sort((a, b) => a.localeCompare(b))];
  }, [tests]);

  const filteredTests = useMemo(() => {
    return tests.filter((test) => {
      const testLanguage = getCourseLanguage({ name: `${test.courseName} ${test.name}`, description: test.description });
      const normalizedLanguage = test.language?.name || testLanguage;

      if (appliedFilters.language !== "ALL" && normalizedLanguage !== appliedFilters.language) return false;
      if (appliedFilters.kind === "TRAIN" && test.kind !== "PUBLIC_PRACTICE") return false;
      if (appliedFilters.kind === "COURSE" && test.kind !== "COURSE") return false;
      if (appliedFilters.availability === "UNLOCKED" && !test.canAttempt) return false;
      if (appliedFilters.availability === "LOCKED" && test.canAttempt) return false;
      if (appliedFilters.attempt === "ATTEMPTED" && !test.hasAttempt) return false;
      if (appliedFilters.attempt === "NOT_ATTEMPTED" && test.hasAttempt) return false;
      return true;
    });
  }, [tests, appliedFilters]);

  const stats = {
    available: filteredTests.filter((test) => test.canAttempt).length,
    locked: filteredTests.filter((test) => !test.isUnlocked).length,
    completed: filteredTests.filter((test) => test.hasAttempt).length,
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (appliedFilters.language !== defaultFilters.language) count += 1;
    if (appliedFilters.kind !== defaultFilters.kind) count += 1;
    if (appliedFilters.availability !== defaultFilters.availability) count += 1;
    if (appliedFilters.attempt !== defaultFilters.attempt) count += 1;
    return count;
  }, [appliedFilters]);

  function applyFilters() {
    setAppliedFilters(draftFilters);
    setShowFilter(false);
  }

  function clearFilters() {
    setDraftFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
  }

  if (loading) return <TestsLoading />;

  return (
    <main className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-7xl px-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Assessment Center</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-950">Practice and course tests</h1>
              <p className="mt-2 max-w-2xl text-slate-600">
                Tất cả đề course test và đề train do admin tạo sẽ hiển thị tại đây.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setShowFilter(true)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Filter {activeFilterCount > 0 ? `(${activeFilterCount})` : ""}
              </button>
              <Link href="/student/tests/history" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                Lịch sử làm bài
              </Link>
              <Link href="/student/results" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
                Tất cả kết quả
              </Link>
              <Link href="/student" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
                Về dashboard
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <Stat label="Available now" value={stats.available} />
          <Stat label="Completed" value={stats.completed} />
          <Stat label="Locked by progress" value={stats.locked} />
        </section>

        {error ? <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          {filteredTests.map((test) => {
      const testLanguage = test.language?.name || getCourseLanguage({ name: `${test.courseName} ${test.name}`, description: test.description });
      const scorePct = test.maxScore > 0 && test.lastAttempt ? Math.round((test.lastAttempt.score / test.maxScore) * 100) : 0;
      const kindLabel = test.kind === "PUBLIC_PRACTICE" ? "Train" : "Course test";
      const modeLabel = test.assessmentMode === "WRITING" ? "Writing AI" : test.assessmentMode === "SPEAKING" ? "Speaking AI" : "Standard";
            return (
              <article key={test.id} className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">{testLanguage}</span>
                      <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-bold text-violet-700">{kindLabel}</span>
                      <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-bold text-orange-700">{modeLabel}</span>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${test.isUnlocked ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                        {test.isUnlocked ? "Unlocked" : "Locked"}
                      </span>
                      {!test.isReady ? <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700">Need 100 points</span> : null}
                    </div>
                    <h2 className="mt-3 text-lg font-bold text-slate-950">{test.name}</h2>
                    <p className="mt-1 text-sm text-slate-500">{test.courseName}</p>
                    <p className="mt-3 line-clamp-2 text-sm text-slate-600">{test.description || "Adaptive assessment for level and skill gaps."}</p>
                  </div>
                  {test.canAttempt ? (
                    <Link href={`/student/tests/${test.id}`} className="rounded-lg bg-blue-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-blue-700">
                      {test.hasAttempt ? "Retake" : "Start"}
                    </Link>
                  ) : (
                    <span className="rounded-lg bg-slate-100 px-4 py-2 text-center text-sm font-semibold text-slate-500">
                      {!test.isUnlocked ? "Complete course" : !test.isReady ? "Waiting for 100 points" : "Unavailable"}
                    </span>
                  )}
                </div>
                <div className="mt-5 grid gap-3 text-sm sm:grid-cols-4">
                  <Metric label="Progress" value={`${test.progress}%`} />
                  <Metric label="Questions" value={`${test.questionCount}`} />
                  <Metric label="Point total" value={`${test.totalQuestionScore}/100`} />
                  <Metric label="Time" value={test.timeLimit ? `${test.timeLimit}m` : "Self-paced"} />
                  <Metric label="Pass score" value={`${test.passingScore}`} />
                </div>
                {test.lastAttempt ? (
                  <div className="mt-4 rounded-lg border border-slate-200 p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-slate-700">Latest result</span>
                      <span className={test.lastAttempt.isPassed ? "text-emerald-600" : "text-amber-600"}>{test.lastAttempt.isPassed ? "Passed" : "Needs review"}</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-slate-100">
                      <div className="h-2 rounded-full bg-blue-600" style={{ width: `${scorePct}%` }} />
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </section>

        {filteredTests.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
            Không có đề phù hợp với bộ lọc hiện tại.
          </div>
        ) : null}
      </div>

      {showFilter ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-xl rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-950">Filter tests</h2>
              <button
                type="button"
                onClick={() => setShowFilter(false)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700"
              >
                Close
              </button>
            </div>

            <div className="mt-5 grid gap-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Language</label>
                <select
                  value={draftFilters.language}
                  onChange={(event) => setDraftFilters((prev) => ({ ...prev, language: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  {languageOptions.map((item) => (
                    <option key={item} value={item}>
                      {item === "ALL" ? "All languages" : item}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Test type</label>
                <select
                  value={draftFilters.kind}
                  onChange={(event) => setDraftFilters((prev) => ({ ...prev, kind: event.target.value as FilterState["kind"] }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="ALL">All tests</option>
                  <option value="TRAIN">Train tests</option>
                  <option value="COURSE">Course tests</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Availability</label>
                <select
                  value={draftFilters.availability}
                  onChange={(event) =>
                    setDraftFilters((prev) => ({ ...prev, availability: event.target.value as FilterState["availability"] }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="ALL">All</option>
                  <option value="UNLOCKED">Can attempt</option>
                  <option value="LOCKED">Locked</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Attempt status</label>
                <select
                  value={draftFilters.attempt}
                  onChange={(event) => setDraftFilters((prev) => ({ ...prev, attempt: event.target.value as FilterState["attempt"] }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="ALL">All</option>
                  <option value="ATTEMPTED">Attempted</option>
                  <option value="NOT_ATTEMPTED">Not attempted</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={applyFilters}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Apply filter
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-950">{value}</p>
    </div>
  );
}

function TestsLoading() {
  return (
    <main className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-7xl space-y-4 px-4">
        <div className="h-40 animate-pulse rounded-2xl bg-slate-200" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-36 animate-pulse rounded-xl bg-slate-200" />
          ))}
        </div>
      </div>
    </main>
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
