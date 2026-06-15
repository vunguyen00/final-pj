import type { IeltsWritingTaskType } from "@/lib/ielts-rubric";

const IELTS_TASK_1_SIGNALS = [
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

const IELTS_TASK_2_SIGNALS = [
  "task 2",
  "to what extent do you agree",
  "do you agree or disagree",
  "discuss both views",
  "discuss the advantages and disadvantages",
  "what are the advantages and disadvantages",
  "give reasons for your answer",
  "write at least 250 words",
];

const CONCLUSION_PATTERN =
  /\b(in conclusion|to conclude|to sum up|in summary|all in all|on balance|for these reasons)\b/i;
const OVERVIEW_PATTERN =
  /\b(overall|in general|it is clear that|it can be seen that)\b/i;

export function countResponseWords(value: string) {
  const normalized = value.trim();
  if (!normalized) return 0;

  const cjkCharacters =
    normalized.match(/[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/g)
      ?.length ?? 0;
  const nonCjkWords = normalized
    .replace(/[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;

  return nonCjkWords + Math.ceil(cjkCharacters / 2);
}

export function roundToHalf(value: number, maximum = 10) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(maximum, Math.round(value * 2) / 2));
}

export function detectLikelyIeltsWritingTask(
  prompt: string,
): IeltsWritingTaskType | null {
  const normalized = prompt.toLowerCase();
  if (IELTS_TASK_1_SIGNALS.some((signal) => normalized.includes(signal))) {
    return "task_1";
  }
  if (IELTS_TASK_2_SIGNALS.some((signal) => normalized.includes(signal))) {
    return "task_2";
  }
  return null;
}

export function hasExplicitWritingStructure(
  answer: string,
  taskType: IeltsWritingTaskType,
) {
  return taskType === "task_1"
    ? OVERVIEW_PATTERN.test(answer)
    : CONCLUSION_PATTERN.test(answer);
}

export function getIeltsWritingEvidenceCap(
  answer: string,
  taskType: IeltsWritingTaskType,
) {
  const wordCount = countResponseWords(answer);

  if (taskType === "task_1") {
    if (wordCount < 30) return 3;
    if (wordCount < 60) return 4;
    if (wordCount < 90) return 5;
    if (wordCount < 120) return 5.5;
    if (wordCount < 150) return 6.5;
    return 9;
  }

  if (wordCount < 50) return 3;
  if (wordCount < 100) return 4;
  if (wordCount < 150) return 5;
  if (wordCount < 200) return 5.5;
  if (wordCount < 250) return 6.5;
  return 9;
}

export function getGeneralWritingEvidenceCap(answer: string) {
  const wordCount = countResponseWords(answer);
  if (wordCount < 20) return 2;
  if (wordCount < 50) return 3.5;
  if (wordCount < 100) return 5;
  if (wordCount < 150) return 6;
  return 10;
}

export function getSpeakingEvidenceCap(
  transcript: string,
  durationSeconds?: number | null,
) {
  const wordCount = countResponseWords(transcript);
  const wordCap =
    wordCount < 15
      ? 3
      : wordCount < 30
        ? 4
        : wordCount < 60
          ? 5
          : wordCount < 100
            ? 5.5
            : wordCount < 150
              ? 6.5
              : 9;

  if (durationSeconds == null || durationSeconds <= 0) return wordCap;

  const durationCap =
    durationSeconds < 10
      ? 3
      : durationSeconds < 20
        ? 4
        : durationSeconds < 35
          ? 5
          : durationSeconds < 60
            ? 5.5
            : durationSeconds < 90
              ? 6.5
              : 9;

  return Math.min(wordCap, durationCap);
}

export function capScoreRecord(
  scores: Record<string, number>,
  cap: number,
) {
  return Object.fromEntries(
    Object.entries(scores).map(([key, value]) => [
      key,
      Math.min(roundToHalf(value), cap),
    ]),
  );
}

export function averageScoreKeys(
  scores: Record<string, number>,
  keys: string[],
) {
  const values = keys
    .map((key) => scores[key])
    .filter((value): value is number => Number.isFinite(value));
  if (values.length !== keys.length) return null;
  return roundToHalf(
    values.reduce((sum, value) => sum + value, 0) / values.length,
  );
}
