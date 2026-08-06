"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LanguageEvaluationResult } from "@/app/components/LanguageEvaluationResult";
import StarRatingInput from "@/app/components/StarRatingInput";
import { getTestAiDisplayCriteria } from "@/lib/test-ai-display-criteria";
import type { TestAiCriterionFeedback } from "@/lib/test-ai-evaluation";
import { getLearningUiLabels } from "@/lib/test-language-labels";

type AiEvaluation = {
  scoreOnly?: boolean;
  mode?: "WRITING" | "SPEAKING";
  language: string;
  overallScore: number;
  totalScore?: number;
  taskRelevance?: number;
  onTopic?: boolean;
  offTopicReason?: string;
  detailedComment?: string;
  sampleAnswer?: string;
  criteria?: Record<string, number>;
  criteriaScores?: Record<string, number>;
  criteriaFeedback?: Record<string, TestAiCriterionFeedback>;
  majorErrors?: string[];
  improvementsNeeded?: string[];
  certificateFit?: string;
  band?: { system: string; level: string; score: number; rationale: string };
  summary: string;
  strengths: string[];
  weaknesses: string[];
  feedback?: string[];
  suggestions: string[];
  corrections?: Array<{ original: string; improved: string; reason: string }>;
  pronunciationErrors?: string[];
  grammarErrors?: string[];
  vocabularyErrors?: string[];
  fluencyIssues?: string[];
  practiceMethods?: string[];
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

export type ResultData = {
  attemptId: string;
  score: number;
  maxScore: number;
  passingScore: number;
  isPassed: boolean;
  courseComplete: boolean;
  nextAction:
    | { type: "LESSON"; lessonId: string }
    | { type: "TEST"; testId: string }
    | { type: "COMPLETE" }
    | null;
  courseId?: string | null;
  courseName?: string;
  language?: { name: string; code: string } | null;
  totalQuestions: number;
  correctAnswers: number;
  questionResults: QuestionResult[];
  scoreOnlyAiFeedback?: boolean;
};

function isQuestionCorrect(question: QuestionResult) {
  if (question.questionType !== "SPEAKING" || !question.aiEvaluation) {
    return question.isCorrect;
  }

  if (question.aiEvaluation.onTopic !== undefined) {
    return question.aiEvaluation.onTopic;
  }

  return (question.aiEvaluation.taskRelevance ?? 0) >= 60;
}

export default function StudentTestResultClient({
  result,
  testId,
  canReview,
}: {
  result: ResultData;
  testId: string;
  canReview: boolean;
}) {
  const ui = getLearningUiLabels(result?.language?.code);

  const skillBreakdown = useMemo(() => {
    if (!result) return [];
    const groups = new Map<string, { earned: number; max: number }>();
    for (const question of result.questionResults) {
      const key =
        question.questionType === "ESSAY"
          ? ui.skills.writing
          : question.questionType === "SPEAKING"
            ? ui.skills.speaking
            : question.questionType === "FILL_IN_BLANK"
              ? ui.skills.vocabulary
              : ui.skills.reading;
      const current = groups.get(key) ?? { earned: 0, max: 0 };
      current.earned += question.earnedScore;
      current.max += question.score;
      groups.set(key, current);
    }
    return Array.from(groups.entries()).map(([name, value]) => ({
      name,
      score: value.max > 0 ? Math.round((value.earned / value.max) * 100) : 0,
    }));
  }, [result, ui]);

  const percent = result.maxScore > 0 ? Math.round((result.score / result.maxScore) * 100) : 0;
  const estimatedLevel = percent >= 85 ? ui.levels.advanced : percent >= 70 ? ui.levels.upperIntermediate : percent >= 55 ? ui.levels.intermediate : percent >= 40 ? ui.levels.elementary : ui.levels.beginner;
  const weaknesses = skillBreakdown.filter((skill) => skill.score < 70).map((skill) => skill.name);
  const correctAnswers = result.questionResults.filter(
    (question) => isQuestionCorrect(question) === true,
  ).length;
  const hasAiQuestions = result.questionResults.some(
    (question) =>
      question.questionType === "ESSAY" ||
      question.questionType === "SPEAKING",
  );
  const showDetailedGuidance =
    !result.scoreOnlyAiFeedback || !hasAiQuestions;

  return (
    <main className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-6xl space-y-6 px-4">
        <section className="rounded-3xl bg-gradient-to-br from-blue-700 to-indigo-800 p-6 text-white shadow-lg sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-100">{ui.result.title}</p>
              <h1 className="mt-2 text-3xl font-bold">{ui.result.estimatedLevel}: {estimatedLevel}</h1>
              <p className="mt-2 text-blue-100">
                {ui.result.score} {result.score.toFixed(1)} / {result.maxScore} - {ui.result.correct} {correctAnswers}/{result.totalQuestions}
              </p>
            </div>
            <div className="text-left lg:text-right">
              <p className="text-5xl font-bold">{percent}%</p>
              <p className={result.isPassed ? "font-semibold text-emerald-200" : "font-semibold text-amber-200"}>
                {result.isPassed ? ui.result.passedRequirement : ui.result.needsReview}
              </p>
            </div>
          </div>
          <div className="mt-5 h-3 rounded-full bg-slate-100">
            <div className="h-3 rounded-full bg-white" style={{ width: `${percent}%` }} />
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="font-bold text-slate-950">{ui.result.skillAnalysis}</h2>
            <div className="mt-4 space-y-4">
              {skillBreakdown.map((skill) => (
                <div key={skill.name}>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-slate-700">{skill.name}</span>
                    <span className="text-slate-500">{skill.score}%</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-blue-600" style={{ width: `${skill.score}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          {showDetailedGuidance ? (
            <>
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h2 className="font-bold text-slate-950">{ui.result.improveTitle}</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {(weaknesses.length ? weaknesses : [ui.result.noMajorWeakness]).map((item) => (
                    <span key={item} className="rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">{item}</span>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h2 className="font-bold text-slate-950">{ui.result.recommendedPath}</h2>
                <ol className="mt-4 space-y-3 text-sm text-slate-600">
                  <li>{ui.result.pathReview}</li>
                  <li>{ui.result.pathContinue(estimatedLevel)}</li>
                  <li>{ui.result.pathRetake}</li>
                </ol>
                <Link href="/courses" className="mt-5 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">{ui.result.viewCourses}</Link>
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-violet-200 bg-violet-50 p-5 lg:col-span-2">
              <h2 className="font-bold text-violet-950">
                {ui.result.scoreOnlyTitle}
              </h2>
              <p className="mt-2 text-sm leading-6 text-violet-800">
                {ui.result.scoreOnlyDescription}
              </p>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-xl font-bold text-slate-950">{ui.result.reviewQuestions}</h2>
          <div className="mt-4 space-y-4">
            {result.questionResults.map((question, index) => {
              const markedCorrect = isQuestionCorrect(question);

              return (
                <article key={question.questionId} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">{index + 1}</span>
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">{ui.questionTypes[question.questionType as keyof typeof ui.questionTypes] || question.questionType}</span>
                    <span className="text-sm font-semibold text-slate-500">{question.earnedScore}/{question.score} {ui.test.points}</span>
                    {markedCorrect !== null ? (
                      <span className={markedCorrect ? "text-sm font-semibold text-emerald-600" : "text-sm font-semibold text-red-600"}>
                        {markedCorrect ? ui.result.correct : ui.result.notCorrect}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-3 text-slate-900">{question.content}</p>
                  <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm">
                    <p><span className="font-semibold">{ui.result.yourAnswer}</span> {question.studentAnswer || ui.result.noAnswer}</p>
                    {question.correctAnswer ? <p className="mt-1"><span className="font-semibold">{ui.result.answer}</span> {question.correctAnswer}</p> : null}
                  </div>
                  {question.aiEvaluation ? (
                    <AiQuestionEvaluation question={question} />
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>

        <div className="flex flex-wrap gap-3">
          <Link href="/student/tests" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">{ui.result.backToTests}</Link>
          {result.isPassed && result.courseId && result.nextAction?.type === "TEST" ? (
            <Link href={`/student/tests/${result.nextAction.testId}`} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
              {ui.test.start}
            </Link>
          ) : result.isPassed && result.courseId && result.nextAction?.type === "LESSON" ? (
            <Link href={`/student/hoc-bai?courseId=${result.courseId}&lessonId=${result.nextAction.lessonId}`} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
              {ui.course.continueLearning}
            </Link>
          ) : result.isPassed && result.courseId ? (
            <Link href={`/courses/${result.courseId}`} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
              {ui.result.viewCourse}
            </Link>
          ) : null}
          {!result.isPassed ? <Link href={`/student/tests/${testId}`} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">{ui.result.retake}</Link> : null}
        </div>
      </div>
      {result.isPassed && result.courseId && result.courseComplete ? (
        <CourseReviewPopup
          courseId={result.courseId}
          courseName={result.courseName || "course"}
          languageCode={result.language?.code}
          canReview={canReview}
        />
      ) : null}
    </main>
  );
}

function AiQuestionEvaluation({ question }: { question: QuestionResult }) {
  const aiEvaluation = question.aiEvaluation;
  if (!aiEvaluation) return null;

  const skill = question.questionType === "SPEAKING" ? "speaking" : "writing";
  const scores = getTestAiDisplayCriteria({
    mode: skill === "speaking" ? "SPEAKING" : "WRITING",
    criteria: aiEvaluation.criteria,
    criteriaScores: aiEvaluation.criteriaScores,
    overallScore: aiEvaluation.overallScore,
  });

  return (
    <div className="mt-5 border-t border-slate-100 pt-5">
      <LanguageEvaluationResult
        skill={skill}
        evaluation={{
          scores,
          overall: aiEvaluation.overallScore,
          normalizedOverall: aiEvaluation.overallScore,
          taskRelevance: aiEvaluation.taskRelevance,
          language: aiEvaluation.language,
          exam: aiEvaluation.band?.system,
          maxScore: 10,
          band:
            aiEvaluation.band || {
              system: "AI",
              level: "",
              score: aiEvaluation.overallScore,
              rationale: "",
            },
          summary: aiEvaluation.summary,
          onTopic: aiEvaluation.onTopic,
          offTopicReason: aiEvaluation.offTopicReason,
          detailedComment: aiEvaluation.detailedComment,
          criteriaFeedback: aiEvaluation.criteriaFeedback,
        }}
        analysis={{
          strengths: aiEvaluation.strengths,
          weaknesses: aiEvaluation.weaknesses,
          feedback: aiEvaluation.feedback || [],
          suggestions: aiEvaluation.suggestions,
          majorErrors: aiEvaluation.majorErrors,
          improvementsNeeded: aiEvaluation.improvementsNeeded,
        }}
        mistakes={{
          majorErrors: aiEvaluation.majorErrors || [],
          corrections: aiEvaluation.corrections || [],
          pronunciation: aiEvaluation.pronunciationErrors || [],
          grammar: aiEvaluation.grammarErrors || [],
          vocabulary: aiEvaluation.vocabularyErrors || [],
          fluency: aiEvaluation.fluencyIssues || [],
        }}
        improvements={{
          improvementsNeeded: aiEvaluation.improvementsNeeded || [],
          suggestions: aiEvaluation.suggestions,
          practiceMethods: aiEvaluation.practiceMethods || [],
          sampleAnswer: aiEvaluation.sampleAnswer || "",
        }}
        sampleAnswer={aiEvaluation.sampleAnswer}
        scoreOnly={Boolean(aiEvaluation.scoreOnly)}
      />
    </div>
  );
}

function CourseReviewPopup({
  courseId,
  courseName,
  languageCode,
  canReview,
}: {
  courseId: string;
  courseName: string;
  languageCode?: string | null;
  canReview: boolean;
}) {
  const ui = getLearningUiLabels(languageCode);
  const storageKey = `course-review-popup-dismissed-${courseId}`;
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!canReview || sessionStorage.getItem(storageKey) === "1") return;
    const timer = window.setTimeout(() => setOpen(true), 0);
    return () => window.clearTimeout(timer);
  }, [canReview, storageKey]);

  function closePopup() {
    sessionStorage.setItem(storageKey, "1");
    setOpen(false);
  }

  async function submitReview() {
    setSubmitting(true);
    setMessage("");

    try {
      const response = await fetch(`/api/courses/${courseId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setMessage(data.error || ui.test.submitFailed);
        return;
      }

      closePopup();
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">{ui.result.reviewCompleteEyebrow}</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-950">{ui.result.reviewTitle(courseName)}</h2>
            <p className="mt-2 text-sm text-slate-600">
              {ui.result.reviewDescription}
            </p>
          </div>
          <button
            type="button"
            onClick={closePopup}
            className="rounded-lg border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            {ui.result.skip}
          </button>
        </div>

        <StarRatingInput
          value={rating}
          onChange={setRating}
          disabled={submitting}
          className="mt-5"
        />
        <p className="mt-2 text-sm font-semibold text-amber-600">{rating} / 5 {ui.result.stars}</p>

        <textarea
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          rows={4}
          placeholder={ui.result.optionalComment}
          className="mt-4 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
        {message ? <p className="mt-2 text-sm text-red-600">{message}</p> : null}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={closePopup}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            {ui.result.later}
          </button>
          <button
            type="button"
            onClick={() => void submitReview()}
            disabled={submitting}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-slate-300"
          >
            {submitting ? ui.result.saving : ui.result.submitReview}
          </button>
        </div>
      </div>
    </div>
  );
}
