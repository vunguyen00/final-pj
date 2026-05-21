"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type AiEvaluation = {
  language: string;
  overallScore: number;
  band?: { system: string; level: string; score: number; rationale: string };
  summary: string;
  strengths: string[];
  weaknesses: string[];
  feedback?: string[];
  suggestions: string[];
  corrections?: Array<{ original: string; improved: string; reason: string }>;
};

type QuestionResult = {
  questionId: string;
  questionType: string;
  content: string;
  studentAnswer: string;
  correctAnswer: string | null;
  isCorrect: boolean | null;
  score: number;
  earnedScore: number;
  explanation: string | null;
  aiEvaluation?: AiEvaluation;
};

type ResultData = {
  attemptId: string;
  score: number;
  maxScore: number;
  passingScore: number;
  isPassed: boolean;
  totalQuestions: number;
  correctAnswers: number;
  questionResults: QuestionResult[];
};

const questionTypes: Record<string, string> = {
  MULTIPLE_CHOICE: "Multiple choice",
  FILL_IN_BLANK: "Fill in blank",
  ESSAY: "Writing response",
  TRUE_FALSE: "True or false",
};

export default function StudentTestResultPage() {
  const params = useParams();
  const testId = params.testId as string;
  const attemptId = params.attemptId as string;
  const [result, setResult] = useState<ResultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchResult() {
      try {
        const storedResult = sessionStorage.getItem(`test-result-${attemptId}`);
        if (storedResult) {
          setResult(JSON.parse(storedResult));
        } else {
          const res = await fetch(`/api/student/tests/${testId}/attempts/${attemptId}`);
          if (!res.ok) {
            setError("Result not found");
            return;
          }
          setResult(await res.json());
        }
      } catch {
        setError("Failed to load result");
      } finally {
        setLoading(false);
      }
    }
    void fetchResult();
  }, [testId, attemptId]);

  const skillBreakdown = useMemo(() => {
    if (!result) return [];
    const groups = new Map<string, { earned: number; max: number }>();
    for (const question of result.questionResults) {
      const key = question.questionType === "ESSAY" ? "Writing" : question.questionType === "FILL_IN_BLANK" ? "Vocabulary" : "Comprehension";
      const current = groups.get(key) ?? { earned: 0, max: 0 };
      current.earned += question.earnedScore;
      current.max += question.score;
      groups.set(key, current);
    }
    return Array.from(groups.entries()).map(([name, value]) => ({
      name,
      score: value.max > 0 ? Math.round((value.earned / value.max) * 100) : 0,
    }));
  }, [result]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
      </main>
    );
  }

  if (error || !result) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="rounded-xl border border-red-200 bg-white p-8 text-center dark:border-red-900 dark:bg-slate-900">
          <p className="text-red-600">{error || "Result not found"}</p>
          <Link href="/student/tests" className="mt-4 inline-block text-blue-600 hover:underline">Back to tests</Link>
        </div>
      </main>
    );
  }

  const percent = result.maxScore > 0 ? Math.round((result.score / result.maxScore) * 100) : 0;
  const estimatedLevel = percent >= 85 ? "Advanced" : percent >= 70 ? "Upper Intermediate" : percent >= 55 ? "Intermediate" : percent >= 40 ? "Elementary" : "Beginner";
  const weaknesses = skillBreakdown.filter((skill) => skill.score < 70).map((skill) => skill.name);

  return (
    <main className="min-h-screen bg-slate-50 py-8 dark:bg-slate-950">
      <div className="mx-auto max-w-6xl space-y-6 px-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Assessment result</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-950 dark:text-white">Estimated level: {estimatedLevel}</h1>
              <p className="mt-2 text-slate-600 dark:text-slate-300">
                Score {result.score.toFixed(1)} / {result.maxScore} - {result.correctAnswers}/{result.totalQuestions} correct
              </p>
            </div>
            <div className="text-left lg:text-right">
              <p className="text-5xl font-bold text-slate-950 dark:text-white">{percent}%</p>
              <p className={result.isPassed ? "font-semibold text-emerald-600" : "font-semibold text-amber-600"}>
                {result.isPassed ? "Ready for next path" : "Recommended review"}
              </p>
            </div>
          </div>
          <div className="mt-5 h-3 rounded-full bg-slate-100 dark:bg-slate-800">
            <div className="h-3 rounded-full bg-blue-600" style={{ width: `${percent}%` }} />
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="font-bold text-slate-950 dark:text-white">Skill breakdown</h2>
            <div className="mt-4 space-y-4">
              {skillBreakdown.map((skill) => (
                <div key={skill.name}>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-slate-700 dark:text-slate-200">{skill.name}</span>
                    <span className="text-slate-500">{skill.score}%</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className="h-2 rounded-full bg-blue-600" style={{ width: `${skill.score}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="font-bold text-slate-950 dark:text-white">Weaknesses</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {(weaknesses.length ? weaknesses : ["No major weakness detected"]).map((item) => (
                <span key={item} className="rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">{item}</span>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="font-bold text-slate-950 dark:text-white">Recommended learning path</h2>
            <ol className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
              <li>1. Review weak skills with targeted practice.</li>
              <li>2. Continue a {estimatedLevel} course in your selected language.</li>
              <li>3. Take a certification estimate after the next module.</li>
            </ol>
            <Link href="/courses" className="mt-5 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Recommended courses</Link>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-xl font-bold text-slate-950 dark:text-white">Question review</h2>
          <div className="mt-4 space-y-4">
            {result.questionResults.map((question, index) => (
              <article key={question.questionId} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">{index + 1}</span>
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">{questionTypes[question.questionType] || question.questionType}</span>
                  <span className="text-sm font-semibold text-slate-500">{question.earnedScore}/{question.score} points</span>
                  {question.isCorrect !== null ? (
                    <span className={question.isCorrect ? "text-sm font-semibold text-emerald-600" : "text-sm font-semibold text-red-600"}>
                      {question.isCorrect ? "Correct" : "Incorrect"}
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 text-slate-900 dark:text-slate-100">{question.content}</p>
                <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-800">
                  <p><span className="font-semibold">Your answer:</span> {question.studentAnswer || "No answer"}</p>
                  {question.correctAnswer ? <p className="mt-1"><span className="font-semibold">Expected:</span> {question.correctAnswer}</p> : null}
                </div>
                {question.aiEvaluation ? (
                  <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                    <p className="font-semibold">AI feedback - {question.aiEvaluation.language} - {question.aiEvaluation.overallScore}/10</p>
                    <p className="mt-2">{question.aiEvaluation.summary}</p>
                    {question.aiEvaluation.weaknesses.length ? <p className="mt-2">Focus: {question.aiEvaluation.weaknesses.join(", ")}</p> : null}
                    {question.aiEvaluation.suggestions.length ? <p className="mt-2">Next: {question.aiEvaluation.suggestions.slice(0, 3).join("; ")}</p> : null}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </section>

        <div className="flex flex-wrap gap-3">
          <Link href="/student/tests" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-100">Back to tests</Link>
          {!result.isPassed ? <Link href={`/student/tests/${testId}`} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Retake diagnostic</Link> : null}
        </div>
      </div>
    </main>
  );
}
