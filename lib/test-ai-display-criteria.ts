export type TestAiDisplayMode = "WRITING" | "SPEAKING";

type DisplayCriteriaInput = {
  mode: TestAiDisplayMode;
  criteria?: Record<string, number> | null;
  criteriaScores?: Record<string, number> | null;
  overallScore: number;
};

const WRITING_CRITERIA = new Set([
  "task_response",
  "content_development",
  "coherence",
  "vocabulary",
  "grammar",
  "orthography_style",
]);

const SPEAKING_CRITERIA = new Set([
  "task_completion",
  "fluency",
  "vocabulary",
  "grammar",
  "pronunciation",
]);

function isAllowedCriterion(mode: TestAiDisplayMode, key: string) {
  return (mode === "WRITING" ? WRITING_CRITERIA : SPEAKING_CRITERIA).has(key);
}

function normalizedEntries(
  values: Record<string, number> | null | undefined,
  mode: TestAiDisplayMode,
  percentageScale: boolean,
) {
  return Object.entries(values || {}).flatMap(([key, rawValue]) => {
    if (!isAllowedCriterion(mode, key)) return [];

    const numericValue = Number(rawValue);
    if (!Number.isFinite(numericValue)) return [];

    const score = percentageScale && numericValue > 10
      ? numericValue / 10
      : numericValue;

    return [[key, Math.max(0, Math.min(10, score))] as const];
  });
}

export function getTestAiDisplayCriteria({
  mode,
  criteria,
  criteriaScores,
  overallScore,
}: DisplayCriteriaInput): Record<string, number> {
  const rubricEntries = normalizedEntries(criteriaScores, mode, true);
  if (rubricEntries.length > 0) {
    return Object.fromEntries(rubricEntries);
  }

  const legacyEntries = normalizedEntries(criteria, mode, false);
  if (legacyEntries.length > 0) {
    return Object.fromEntries(legacyEntries);
  }

  const fallbackScore = Number(overallScore);
  return {
    overall: Number.isFinite(fallbackScore)
      ? Math.max(0, Math.min(10, fallbackScore))
      : 0,
  };
}
