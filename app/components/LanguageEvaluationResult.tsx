import type { ReactNode } from "react";
import { normalizeFeedbackTextItems } from "@/lib/ai-feedback-normalization";
import { getContentUiLanguage } from "@/lib/language-display";
import { getTestAiDisplayCriteria } from "@/lib/test-ai-display-criteria";
import type { TestAiCriterionFeedback } from "@/lib/test-ai-evaluation";
import type { UiLanguage } from "@/lib/test-language-labels";

export type LanguageEvaluationData = {
  scores: Record<string, number>;
  overall: number;
  normalizedOverall?: number;
  taskRelevance?: number;
  language: string;
  exam?: string;
  maxScore?: number;
  band: { system: string; level: string; score: number; rationale: string };
  summary: string;
  onTopic?: boolean;
  offTopicReason?: string;
  detailedComment?: string;
  criteriaFeedback?: Record<string, TestAiCriterionFeedback>;
};

export type LanguageAnalysisData = {
  strengths: string[];
  weaknesses: string[];
  feedback: string[];
  suggestions: string[];
  majorErrors?: string[];
  improvementsNeeded?: string[];
};

const CARD_COLORS = {
  strengths: "bg-emerald-50 text-emerald-900",
  weaknesses: "bg-red-50 text-red-900",
  improve: "bg-blue-50 text-blue-900",
};

const LABELS: Record<UiLanguage, {
  overall: string;
  writing: string;
  speaking: string;
  strengths: string;
  weaknesses: string;
  improve: string;
  errors: string;
  priorities: string;
  examiner: string;
  modelAnswer: string;
  noErrors: string;
  noItems: string;
  offTopic: string;
}> = {
  en: { overall: "Overall score", writing: "Writing", speaking: "Speaking", strengths: "Strengths", weaknesses: "Weaknesses", improve: "How To Improve", errors: "Specific Errors In The Response", priorities: "Improvement Priorities", examiner: "Examiner-style comment", modelAnswer: "Model answer", noErrors: "No specific evidence-based errors were found.", noItems: "None yet.", offTopic: "Off topic" },
  vi: { overall: "Điểm tổng thể", writing: "Viết", speaking: "Nói", strengths: "Điểm mạnh", weaknesses: "Điểm yếu", improve: "Cách cải thiện", errors: "Lỗi cụ thể trong bài làm", priorities: "Ưu tiên cải thiện", examiner: "Nhận xét của giám khảo", modelAnswer: "Bài mẫu", noErrors: "Không tìm thấy lỗi cụ thể dựa trên bằng chứng.", noItems: "Chưa có.", offTopic: "Lạc đề" },
  zh: { overall: "综合评分", writing: "写作", speaking: "口语", strengths: "优点", weaknesses: "不足", improve: "如何改进", errors: "答题中的具体错误", priorities: "优先改进事项", examiner: "考官式评语", modelAnswer: "参考答案", noErrors: "未发现有明确依据的具体错误。", noItems: "暂无。", offTopic: "偏题" },
  ja: { overall: "総合スコア", writing: "ライティング", speaking: "スピーキング", strengths: "良い点", weaknesses: "弱点", improve: "改善方法", errors: "解答内の具体的な誤り", priorities: "改善の優先事項", examiner: "試験官形式の講評", modelAnswer: "模範解答", noErrors: "根拠に基づく具体的な誤りは見つかりませんでした。", noItems: "まだありません。", offTopic: "課題から外れています" },
  ko: { overall: "종합 점수", writing: "쓰기", speaking: "말하기", strengths: "강점", weaknesses: "약점", improve: "개선 방법", errors: "답안의 구체적인 오류", priorities: "우선 개선 사항", examiner: "평가자 종합 의견", modelAnswer: "모범 답안", noErrors: "근거가 분명한 구체적 오류를 찾지 못했습니다.", noItems: "아직 없습니다.", offTopic: "주제 이탈" },
};

const CRITERION_LABELS: Record<UiLanguage, Record<string, string>> = {
  en: { task_response: "Task Response", content_development: "Content Development", coherence: "Coherence and Cohesion", vocabulary: "Lexical Resource", grammar: "Grammatical Range and Accuracy", orthography_style: "Orthography and Style", task_completion: "Task Completion", fluency: "Fluency and Coherence", pronunciation: "Pronunciation" },
  vi: { task_response: "Đáp ứng đề bài", content_development: "Phát triển nội dung", coherence: "Mạch lạc và liên kết", vocabulary: "Từ vựng", grammar: "Ngữ pháp và độ chính xác", orthography_style: "Chính tả và văn phong", task_completion: "Hoàn thành nhiệm vụ", fluency: "Độ trôi chảy và mạch lạc", pronunciation: "Phát âm" },
  zh: { task_response: "任务回应", content_development: "内容展开", coherence: "连贯与衔接", vocabulary: "词汇运用", grammar: "语法范围与准确性", orthography_style: "书写与文体", task_completion: "任务完成度", fluency: "流利度与连贯性", pronunciation: "发音" },
  ja: { task_response: "課題への応答", content_development: "内容の展開", coherence: "一貫性と結束性", vocabulary: "語彙力", grammar: "文法の幅と正確さ", orthography_style: "表記と文体", task_completion: "課題達成度", fluency: "流暢さと一貫性", pronunciation: "発音" },
  ko: { task_response: "과제 응답", content_development: "내용 전개", coherence: "일관성과 응집성", vocabulary: "어휘력", grammar: "문법 범위와 정확성", orthography_style: "표기와 문체", task_completion: "과제 완성도", fluency: "유창성과 일관성", pronunciation: "발음" },
};

export function LanguageEvaluationResult({
  skill,
  evaluation,
  analysis,
  mistakes,
  improvements,
  sampleAnswer,
  taskType,
  scoreOnly = false,
}: {
  skill: "writing" | "speaking";
  evaluation: LanguageEvaluationData;
  analysis: LanguageAnalysisData;
  mistakes?: Record<string, unknown> | null;
  improvements?: Record<string, unknown> | null;
  sampleAnswer?: string | null;
  taskType?: string | null;
  scoreOnly?: boolean;
}) {
  const language = getContentUiLanguage(evaluation.language || evaluation.exam || evaluation.band.system);
  const labels = LABELS[language];
  const criterionEntries = Object.entries(getTestAiDisplayCriteria({
    mode: skill === "speaking" ? "SPEAKING" : "WRITING",
    criteria: evaluation.scores,
    overallScore: evaluation.overall,
  }));
  const errors = collectErrors(mistakes, evaluation.criteriaFeedback);
  const priorities = uniqueItems([
    ...(analysis.improvementsNeeded || []),
    ...normalizeFeedbackTextItems(improvements?.improvementsNeeded),
    ...analysis.suggestions,
    ...normalizeFeedbackTextItems(improvements?.suggestions),
    ...normalizeFeedbackTextItems(improvements?.practiceMethods),
  ]);
  const modelAnswer = sampleAnswer || String(improvements?.sampleAnswer || "");
  const taskLabel = taskType?.match(/(?:task_|_)([123])$/i)?.[1];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl bg-linear-to-br from-blue-700 to-indigo-800 p-6 text-white shadow-lg">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-100">
          {evaluation.exam || evaluation.band.system} {skill === "writing" ? labels.writing : labels.speaking}
          {taskLabel ? ` - ${taskLabel}` : ""}
        </p>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-3xl font-bold">{labels.overall}</h2>
            {!scoreOnly ? <p className="mt-2 max-w-3xl text-sm leading-6 text-blue-100">{evaluation.summary}</p> : null}
            {!scoreOnly && evaluation.onTopic === false ? (
              <p className="mt-3 rounded-lg bg-red-950/40 p-3 text-sm font-semibold text-red-100">
                {labels.offTopic}: {evaluation.offTopicReason}
              </p>
            ) : null}
          </div>
          <div className="text-right">
            <p className="text-6xl font-black">{formatScore(evaluation.overall)}</p>
            <p className="mt-1 text-sm font-semibold text-blue-100">/ {evaluation.maxScore ?? 10}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {criterionEntries.map(([key, score], index) => {
          const criterion = evaluation.criteriaFeedback?.[key];
          return (
            <CriterionCard
              key={key}
              title={CRITERION_LABELS[language][key] || key.replaceAll("_", " ")}
              score={score}
              criterion={criterion}
              fallback={{
                shortComment: analysis.feedback[index] || evaluation.summary,
                detailedFeedback: analysis.feedback[index] || evaluation.detailedComment || evaluation.summary,
                strengths: distribute(analysis.strengths, index, criterionEntries.length),
                weaknesses: distribute(analysis.weaknesses, index, criterionEntries.length),
                improvementSuggestions: distribute(analysis.suggestions, index, criterionEntries.length),
              }}
              labels={labels}
              scoreOnly={scoreOnly}
            />
          );
        })}
      </section>

      {!scoreOnly ? (
        <>
          <section className="grid gap-6 lg:grid-cols-2">
            <ResultSection title={labels.errors}>
              {errors.length ? (
                <ul className="space-y-3 text-sm text-slate-700">
                  {errors.map((item, index) => <li key={`${item}-${index}`} className="rounded-lg border border-red-100 bg-red-50 p-3">{item}</li>)}
                </ul>
              ) : <p className="text-sm text-slate-500">{labels.noErrors}</p>}
            </ResultSection>
            <ResultSection title={labels.priorities}>
              <PriorityList items={priorities} emptyLabel={labels.noItems} />
            </ResultSection>
          </section>

          <ResultSection title={labels.examiner}>
            <p className="whitespace-pre-line text-sm leading-7 text-slate-700">{evaluation.detailedComment || evaluation.summary}</p>
          </ResultSection>

          {modelAnswer ? <ResultSection title={labels.modelAnswer}><p className="whitespace-pre-line text-sm leading-7 text-slate-700">{modelAnswer}</p></ResultSection> : null}
        </>
      ) : null}
    </div>
  );
}

function CriterionCard({ title, score, criterion, fallback, labels, scoreOnly }: {
  title: string;
  score: number;
  criterion?: TestAiCriterionFeedback;
  fallback: Pick<TestAiCriterionFeedback, "shortComment" | "detailedFeedback" | "strengths" | "weaknesses" | "improvementSuggestions">;
  labels: (typeof LABELS)[UiLanguage];
  scoreOnly: boolean;
}) {
  const details = criterion || fallback;
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div><h3 className="font-bold text-slate-950">{title}</h3>{!scoreOnly ? <p className="mt-2 text-sm font-medium text-slate-600">{details.shortComment}</p> : null}</div>
        <span className="rounded-xl bg-blue-50 px-3 py-2 text-2xl font-black text-blue-700">{formatScore(score)}</span>
      </div>
      {!scoreOnly ? (
        <>
          <p className="mt-4 text-sm leading-6 text-slate-700">{details.detailedFeedback}</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <MiniList title={labels.strengths} items={details.strengths} tone="strengths" emptyLabel={labels.noItems} />
            <MiniList title={labels.weaknesses} items={details.weaknesses} tone="weaknesses" emptyLabel={labels.noItems} />
            <MiniList title={labels.improve} items={details.improvementSuggestions} tone="improve" emptyLabel={labels.noItems} />
          </div>
        </>
      ) : null}
    </article>
  );
}

function MiniList({ title, items, tone, emptyLabel }: { title: string; items: string[]; tone: keyof typeof CARD_COLORS; emptyLabel: string }) {
  return <div className={`rounded-xl p-3 ${CARD_COLORS[tone]}`}><p className="text-xs font-bold uppercase tracking-wide">{title}</p>{items.length ? <ul className="mt-2 space-y-2 text-xs leading-5">{items.map((item, index) => <li key={`${item}-${index}`}>- {item}</li>)}</ul> : <p className="mt-2 text-xs opacity-70">{emptyLabel}</p>}</div>;
}

function ResultSection({ title, children }: { title: string; children: ReactNode }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-lg font-bold text-slate-950">{title}</h2><div className="mt-4">{children}</div></section>;
}

function PriorityList({ items, emptyLabel }: { items: string[]; emptyLabel: string }) {
  if (!items.length) return <p className="text-sm text-slate-500">{emptyLabel}</p>;
  return <ol className="space-y-3 text-sm text-slate-700">{items.map((item, index) => <li key={`${item}-${index}`} className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">{index + 1}</span><span className="leading-6">{item}</span></li>)}</ol>;
}

function collectErrors(mistakes?: Record<string, unknown> | null, criteria?: Record<string, TestAiCriterionFeedback>) {
  const explicit = Object.values(mistakes || {}).flatMap(normalizeFeedbackTextItems);
  const examples = Object.values(criteria || {}).flatMap((criterion) => {
    const count = Math.max(criterion.examplesFromAnswer.length, criterion.correctedExamples.length);
    return Array.from({ length: count }, (_, index) => {
      const original = criterion.examplesFromAnswer[index];
      const corrected = criterion.correctedExamples[index];
      return original && corrected ? `${original} → ${corrected}` : original || corrected || "";
    });
  });
  return uniqueItems([...explicit, ...examples]);
}

function distribute(items: string[], index: number, count: number) {
  if (!count) return [];
  return items.filter((_, itemIndex) => itemIndex % count === index);
}

function uniqueItems(items: string[]) {
  return [
    ...new Set(
      items.flatMap((item) => {
        const trimmed = item.trim();
        return trimmed ? [trimmed] : [];
      }),
    ),
  ];
}

function formatScore(value: number) {
  return Number.isFinite(Number(value)) ? Number(value).toFixed(1) : "0.0";
}
