"use client";

import {
  IELTS_SPEAKING_CRITERION_LABELS,
  IELTS_WRITING_CRITERION_LABELS,
  IeltsCriterionFeedback,
  IeltsEvaluation,
  IeltsPronunciationFeedback,
  IeltsWritingCriterionFeedback,
} from "@/lib/ielts-rubric";
import type { ReactNode } from "react";

export function IeltsEvaluationResult({
  evaluation,
  scoreOnly = false,
}: {
  evaluation: IeltsEvaluation;
  scoreOnly?: boolean;
}) {
  const labels =
    evaluation.skill === "writing"
      ? {
          ...IELTS_WRITING_CRITERION_LABELS,
          task_achievement_or_response:
            evaluation.task_type === "task_1"
              ? "Task Achievement"
              : "Task Response",
        }
      : IELTS_SPEAKING_CRITERION_LABELS;
  const specificErrors =
    evaluation.skill === "writing"
      ? collectWritingErrors(Object.values(evaluation.criteria))
      : [
          ...evaluation.criteria.fluency_and_coherence.weaknesses.map(
            (item) => `Fluency and Coherence: ${item}`,
          ),
          ...evaluation.criteria.lexical_resource.weaknesses.map(
            (item) => `Lexical Resource: ${item}`,
          ),
          ...evaluation.criteria.grammatical_range_and_accuracy.weaknesses.map(
            (item) => `Grammar: ${item}`,
          ),
          ...evaluation.criteria.pronunciation.pronunciation_errors.map(
            (item) => `Pronunciation: ${item}`,
          ),
        ];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-blue-700 to-indigo-800 p-6 text-white shadow-lg">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-100">
          IELTS {evaluation.skill === "writing" ? "Writing" : "Speaking"}
          {evaluation.skill === "writing"
            ? ` - ${evaluation.task_type === "task_1" ? "Task 1" : "Task 2"}`
            : ""}
        </p>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-3xl font-bold">Overall band</h2>
            {scoreOnly ? (
              <p className="mt-2 max-w-3xl text-sm leading-6 text-blue-100">
                Khóa học đã hoàn thành. AI chỉ trả về điểm số cho lần chấm này.
              </p>
            ) : (
              <p className="mt-2 max-w-3xl text-sm leading-6 text-blue-100">
                {evaluation.final_feedback}
              </p>
            )}
          </div>
          <p className="text-6xl font-black">{evaluation.overall_band.toFixed(1)}</p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {Object.entries(evaluation.criteria).map(([key, criterion]) => (
          <CriterionCard
            key={key}
            title={(labels as Record<string, string>)[key] || key}
            criterion={criterion}
            scoreOnly={scoreOnly}
          />
        ))}
      </section>

      {!scoreOnly ? (
        <>
          <section className="grid gap-6 lg:grid-cols-2">
        <ResultSection title="Lỗi cụ thể trong bài">
          {specificErrors.length ? (
            <ul className="space-y-3 text-sm text-slate-700">
              {specificErrors.map((item, index) => (
                <li
                  key={`${item}-${index}`}
                  className="rounded-lg border border-red-100 bg-red-50 p-3"
                >
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">
              Chưa có lỗi cụ thể đủ bằng chứng để trích dẫn.
            </p>
          )}
        </ResultSection>

        <ResultSection title="Ưu tiên cải thiện">
          <FeedbackList items={evaluation.priority_to_improve} />
        </ResultSection>
          </section>

          <ResultSection title="Examiner-style comment">
            <p className="whitespace-pre-line text-sm leading-7 text-slate-700">
              {evaluation.estimated_examiner_comment}
            </p>
          </ResultSection>

          {evaluation.skill === "writing" && evaluation.model_answer ? (
            <ResultSection title="Model answer">
              <p className="whitespace-pre-line text-sm leading-7 text-slate-700">
                {evaluation.model_answer}
              </p>
            </ResultSection>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function CriterionCard({
  title,
  criterion,
  scoreOnly,
}: {
  title: string;
  criterion:
    | IeltsCriterionFeedback
    | IeltsWritingCriterionFeedback
    | IeltsPronunciationFeedback;
  scoreOnly: boolean;
}) {
  const pronunciation = isPronunciationCriterion(criterion)
    ? criterion
    : null;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-bold text-slate-950">{title}</h3>
          {!scoreOnly ? (
            <p className="mt-2 text-sm font-medium text-slate-600">
              {criterion.short_comment}
            </p>
          ) : null}
        </div>
        <span className="rounded-xl bg-blue-50 px-3 py-2 text-2xl font-black text-blue-700">
          {criterion.score.toFixed(1)}
        </span>
      </div>

      {!scoreOnly ? (
        <>
          <p className="mt-4 text-sm leading-6 text-slate-700">
            {criterion.detailed_feedback}
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <MiniList
              title="Điểm mạnh"
              items={criterion.strengths}
              tone="emerald"
            />
            <MiniList
              title="Điểm yếu"
              items={criterion.weaknesses}
              tone="red"
            />
            <MiniList
              title="Cách cải thiện"
              items={criterion.improvement_suggestions}
              tone="blue"
            />
          </div>

          {pronunciation ? (
            <div className="mt-5 grid gap-3 border-t border-slate-100 pt-5 sm:grid-cols-2">
              <Detail label="Intelligibility" value={pronunciation.intelligibility} />
              <Detail label="Word stress" value={pronunciation.word_stress} />
              <Detail label="Sentence stress" value={pronunciation.sentence_stress} />
              <Detail label="Rhythm" value={pronunciation.rhythm} />
              <Detail label="Connected speech" value={pronunciation.connected_speech} />
            </div>
          ) : null}
        </>
      ) : null}
    </article>
  );
}

function ResultSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-bold text-slate-950">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function FeedbackList({ items }: { items: string[] }) {
  if (!items.length) {
    return <p className="text-sm text-slate-500">Chưa có đề xuất cụ thể.</p>;
  }

  return (
    <ol className="space-y-3 text-sm text-slate-700">
      {items.map((item, index) => (
        <li key={`${item}-${index}`} className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
            {index + 1}
          </span>
          <span className="leading-6">{item}</span>
        </li>
      ))}
    </ol>
  );
}

function MiniList({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "emerald" | "red" | "blue";
}) {
  const colors = {
    emerald: "bg-emerald-50 text-emerald-900",
    red: "bg-red-50 text-red-900",
    blue: "bg-blue-50 text-blue-900",
  };

  return (
    <div className={`rounded-xl p-3 ${colors[tone]}`}>
      <p className="text-xs font-bold uppercase tracking-wide">{title}</p>
      {items.length ? (
        <ul className="mt-2 space-y-2 text-xs leading-5">
          {items.map((item, index) => (
            <li key={`${item}-${index}`}>- {item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-xs opacity-70">Chưa có.</p>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm leading-6 text-slate-700">{value}</p>
    </div>
  );
}

function isPronunciationCriterion(
  criterion:
    | IeltsCriterionFeedback
    | IeltsWritingCriterionFeedback
    | IeltsPronunciationFeedback,
): criterion is IeltsPronunciationFeedback {
  return "intelligibility" in criterion;
}

function collectWritingErrors(
  criteria: IeltsWritingCriterionFeedback[],
) {
  const errors: string[] = [];

  for (const criterion of criteria) {
    const count = Math.max(
      criterion.examples_from_answer.length,
      criterion.corrected_examples.length,
    );
    for (let index = 0; index < count; index += 1) {
      const original = criterion.examples_from_answer[index];
      const corrected = criterion.corrected_examples[index];
      if (original && corrected) {
        errors.push(`"${original}" → "${corrected}"`);
      } else if (original) {
        errors.push(`"${original}"`);
      } else if (corrected) {
        errors.push(`Gợi ý sửa: "${corrected}"`);
      }
    }
  }

  return [...new Set(errors)];
}
