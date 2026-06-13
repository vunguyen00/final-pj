export type IeltsWritingTaskType = "task_1" | "task_2";

export type IeltsCriterionFeedback = {
  score: number;
  short_comment: string;
  detailed_feedback: string;
  strengths: string[];
  weaknesses: string[];
  improvement_suggestions: string[];
};

export type IeltsWritingCriterionFeedback = IeltsCriterionFeedback & {
  examples_from_answer: string[];
  corrected_examples: string[];
};

export type IeltsPronunciationFeedback = IeltsCriterionFeedback & {
  intelligibility: string;
  word_stress: string;
  sentence_stress: string;
  rhythm: string;
  connected_speech: string;
  pronunciation_errors: string[];
};

export type IeltsWritingEvaluation = {
  skill: "writing";
  task_type: IeltsWritingTaskType;
  overall_band: number;
  criteria: {
    task_achievement_or_response: IeltsWritingCriterionFeedback;
    coherence_and_cohesion: IeltsWritingCriterionFeedback;
    lexical_resource: IeltsWritingCriterionFeedback;
    grammatical_range_and_accuracy: IeltsWritingCriterionFeedback;
  };
  final_feedback: string;
  estimated_examiner_comment: string;
  priority_to_improve: string[];
  model_answer: string;
};

export type IeltsSpeakingEvaluation = {
  skill: "speaking";
  overall_band: number;
  criteria: {
    fluency_and_coherence: IeltsCriterionFeedback;
    lexical_resource: IeltsCriterionFeedback;
    grammatical_range_and_accuracy: IeltsCriterionFeedback;
    pronunciation: IeltsPronunciationFeedback;
  };
  final_feedback: string;
  estimated_examiner_comment: string;
  priority_to_improve: string[];
};

export type IeltsEvaluation = IeltsWritingEvaluation | IeltsSpeakingEvaluation;

export const IELTS_WRITING_CRITERION_LABELS: Record<
  keyof IeltsWritingEvaluation["criteria"],
  string
> = {
  task_achievement_or_response: "Task Achievement / Task Response",
  coherence_and_cohesion: "Coherence and Cohesion",
  lexical_resource: "Lexical Resource",
  grammatical_range_and_accuracy: "Grammatical Range and Accuracy",
};

export const IELTS_SPEAKING_CRITERION_LABELS: Record<
  keyof IeltsSpeakingEvaluation["criteria"],
  string
> = {
  fluency_and_coherence: "Fluency and Coherence",
  lexical_resource: "Lexical Resource",
  grammatical_range_and_accuracy: "Grammatical Range and Accuracy",
  pronunciation: "Pronunciation",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isBandScore(value: unknown) {
  const score = Number(value);
  return Number.isFinite(score) && score >= 0 && score <= 9;
}

function isCriterionFeedback(value: unknown): value is IeltsCriterionFeedback {
  if (!isRecord(value)) return false;

  return (
    isBandScore(value.score) &&
    typeof value.short_comment === "string" &&
    typeof value.detailed_feedback === "string" &&
    isStringArray(value.strengths) &&
    isStringArray(value.weaknesses) &&
    isStringArray(value.improvement_suggestions)
  );
}

function isWritingCriterionFeedback(
  value: unknown,
): value is IeltsWritingCriterionFeedback {
  if (!isCriterionFeedback(value)) return false;
  const source = value as unknown as Record<string, unknown>;
  return (
    isStringArray(source.examples_from_answer) &&
    isStringArray(source.corrected_examples)
  );
}

function isPronunciationFeedback(
  value: unknown,
): value is IeltsPronunciationFeedback {
  if (!isCriterionFeedback(value)) return false;
  const source = value as unknown as Record<string, unknown>;
  return (
    typeof source.intelligibility === "string" &&
    typeof source.word_stress === "string" &&
    typeof source.sentence_stress === "string" &&
    typeof source.rhythm === "string" &&
    typeof source.connected_speech === "string" &&
    isStringArray(source.pronunciation_errors)
  );
}

export function isIeltsWritingEvaluation(
  value: unknown,
): value is IeltsWritingEvaluation {
  if (!isRecord(value) || value.skill !== "writing") return false;
  if (value.task_type !== "task_1" && value.task_type !== "task_2") return false;
  if (!isBandScore(value.overall_band) || !isRecord(value.criteria)) return false;

  return (
    isWritingCriterionFeedback(value.criteria.task_achievement_or_response) &&
    isWritingCriterionFeedback(value.criteria.coherence_and_cohesion) &&
    isWritingCriterionFeedback(value.criteria.lexical_resource) &&
    isWritingCriterionFeedback(value.criteria.grammatical_range_and_accuracy) &&
    typeof value.final_feedback === "string" &&
    typeof value.estimated_examiner_comment === "string" &&
    isStringArray(value.priority_to_improve) &&
    typeof value.model_answer === "string"
  );
}

export function isIeltsSpeakingEvaluation(
  value: unknown,
): value is IeltsSpeakingEvaluation {
  if (!isRecord(value) || value.skill !== "speaking") return false;
  if (!isBandScore(value.overall_band) || !isRecord(value.criteria)) return false;

  return (
    isCriterionFeedback(value.criteria.fluency_and_coherence) &&
    isCriterionFeedback(value.criteria.lexical_resource) &&
    isCriterionFeedback(value.criteria.grammatical_range_and_accuracy) &&
    isPronunciationFeedback(value.criteria.pronunciation) &&
    typeof value.final_feedback === "string" &&
    typeof value.estimated_examiner_comment === "string" &&
    isStringArray(value.priority_to_improve)
  );
}

export function isIeltsEvaluation(value: unknown): value is IeltsEvaluation {
  return isIeltsWritingEvaluation(value) || isIeltsSpeakingEvaluation(value);
}

export function extractStoredIeltsEvaluation(value: unknown): IeltsEvaluation | null {
  if (isIeltsEvaluation(value)) return value;
  if (!isRecord(value)) return null;
  return isIeltsEvaluation(value.ielts) ? value.ielts : null;
}

export function roundIeltsBand(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(9, Math.round(value * 2) / 2));
}

export function calculateIeltsOverallBand(scores: number[]) {
  if (scores.length !== 4) return 0;
  return roundIeltsBand(scores.reduce((sum, score) => sum + score, 0) / 4);
}

export function detectIeltsWritingTaskType(
  prompt: string,
  requestedTaskType?: IeltsWritingTaskType | null,
): IeltsWritingTaskType {
  if (requestedTaskType === "task_1" || requestedTaskType === "task_2") {
    return requestedTaskType;
  }

  const normalized = prompt.toLowerCase();
  const taskOneSignals = [
    "task 1",
    "graph",
    "chart",
    "table",
    "diagram",
    "map",
    "process",
    "letter",
    "summarise the information",
    "summarize the information",
  ];

  return taskOneSignals.some((signal) => normalized.includes(signal))
    ? "task_1"
    : "task_2";
}

export function getIeltsCriteriaScores(evaluation: IeltsEvaluation) {
  return Object.fromEntries(
    Object.entries(evaluation.criteria).map(([key, criterion]) => [
      key,
      criterion.score,
    ]),
  );
}
