"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LANGUAGES, getCourseLanguage } from "@/app/components/learningMarketplace";

type Test = {
  id: string;
  name: string;
  description: string | null;
  courseId: string;
  courseName: string;
  maxScore: number;
  passingScore: number;
  timeLimit: number | null;
  questionCount: number;
  hasAttempt: boolean;
  progress: number;
  isUnlocked: boolean;
  lastAttempt: { id: string; score: number; isPassed: boolean; submittedAt: string } | null;
  canAttempt: boolean;
};

const testTypes = ["Placement", "Skill diagnostic", "Certification estimate"];

export default function StudentTestsPage() {
  const searchParams = useSearchParams();
  const courseId = searchParams.get("courseId");
  const [tests, setTests] = useState<Test[]>([]);
  const [language, setLanguage] = useState("All");
  const [type, setType] = useState("Placement");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  const filteredTests = useMemo(() => {
    return tests.filter((test) => {
      const testLanguage = getCourseLanguage({ name: `${test.courseName} ${test.name}`, description: test.description });
      return language === "All" || testLanguage === language;
    });
  }, [tests, language]);

  const stats = {
    available: filteredTests.filter((test) => test.canAttempt).length,
    locked: filteredTests.filter((test) => !test.isUnlocked).length,
    completed: filteredTests.filter((test) => test.hasAttempt).length,
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 py-8 dark:bg-slate-950">
        <div className="mx-auto max-w-7xl space-y-4 px-4">
          <div className="h-40 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((item) => <div key={item} className="h-36 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />)}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 py-8 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Assessment center</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-950 dark:text-white">Placement, diagnostics, and certification estimates</h1>
              <p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-300">
                Choose a language and test type. Tests unlock from course progress where required by the existing learning rules.
              </p>
            </div>
            <Link href="/student" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-100">
              Back to dashboard
            </Link>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <Stat label="Available now" value={stats.available} />
          <Stat label="Completed" value={stats.completed} />
          <Stat label="Locked by progress" value={stats.locked} />
        </section>

        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap gap-2">
            {["All", ...LANGUAGES].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setLanguage(item)}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${language === item ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"}`}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {testTypes.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setType(item)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold ${type === item ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"}`}
              >
                {item}
              </button>
            ))}
          </div>
        </section>

        {error ? <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          {filteredTests.map((test) => {
            const testLanguage = getCourseLanguage({ name: `${test.courseName} ${test.name}`, description: test.description });
            const scorePct = test.maxScore > 0 && test.lastAttempt ? Math.round((test.lastAttempt.score / test.maxScore) * 100) : 0;
            return (
              <article key={test.id} className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">{testLanguage}</span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">{type}</span>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${test.isUnlocked ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                        {test.isUnlocked ? "Unlocked" : "Locked"}
                      </span>
                    </div>
                    <h2 className="mt-3 text-lg font-bold text-slate-950 dark:text-white">{test.name}</h2>
                    <p className="mt-1 text-sm text-slate-500">{test.courseName}</p>
                    <p className="mt-3 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{test.description || "Adaptive assessment for level, skill gaps, and next-course recommendation."}</p>
                  </div>
                  {test.canAttempt ? (
                    <Link href={`/student/tests/${test.id}`} className="rounded-lg bg-blue-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-blue-700">
                      {test.hasAttempt ? "Retake" : "Start"}
                    </Link>
                  ) : (
                    <span className="rounded-lg bg-slate-100 px-4 py-2 text-center text-sm font-semibold text-slate-500 dark:bg-slate-800">
                      {!test.isUnlocked ? "Complete course" : "Unavailable"}
                    </span>
                  )}
                </div>
                <div className="mt-5 grid gap-3 text-sm sm:grid-cols-4">
                  <Metric label="Progress" value={`${test.progress}%`} />
                  <Metric label="Questions" value={`${test.questionCount}`} />
                  <Metric label="Time" value={test.timeLimit ? `${test.timeLimit}m` : "Self-paced"} />
                  <Metric label="Pass score" value={`${test.passingScore}`} />
                </div>
                {test.lastAttempt ? (
                  <div className="mt-4 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-slate-700 dark:text-slate-200">Latest result</span>
                      <span className={test.lastAttempt.isPassed ? "text-emerald-600" : "text-amber-600"}>{test.lastAttempt.isPassed ? "Passed" : "Needs review"}</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                      <div className="h-2 rounded-full bg-blue-600" style={{ width: `${scorePct}%` }} />
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </section>

        {filteredTests.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500 dark:border-slate-700 dark:bg-slate-900">
            No tests found for this language. Enrolled course tests and diagnostics will appear here.
          </div>
        ) : null}
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-950 dark:text-white">{value}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-950 dark:text-white">{value}</p>
    </div>
  );
}
