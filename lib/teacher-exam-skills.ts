export type ExamSkillKey = "writing" | "speaking" | "listening" | "reading";

export type TeacherExamScores = {
  writingScore: number | null;
  speakingScore: number | null;
  listeningScore: number | null;
  readingScore: number | null;
};

export const TEACHER_EXAM_PASSING_AVERAGE = 80;
export const TEACHER_EXAM_MIN_SCORE = 0;
export const TEACHER_EXAM_MAX_SCORE = 100;

export function normalizeTeacherExamScoreInput(value: string) {
  if (value === "") return "";

  const score = Number(value);
  if (!Number.isFinite(score)) return "";
  if (score > TEACHER_EXAM_MAX_SCORE) return TEACHER_EXAM_MAX_SCORE.toString();
  if (score < TEACHER_EXAM_MIN_SCORE) return TEACHER_EXAM_MIN_SCORE.toString();
  return value;
}

export function calculateTeacherExamAverage(scores: TeacherExamScores) {
  const values = [scores.writingScore, scores.speakingScore, scores.listeningScore, scores.readingScore];
  if (values.some((score) => score === null || !Number.isFinite(score))) return null;
  const average = values.reduce<number>((total, score) => total + (score ?? 0), 0) / values.length;
  return Math.round(average * 10) / 10;
}

const SKILL_LABELS: Record<string, Record<ExamSkillKey, string>> = {
  en: { writing: "Writing", speaking: "Speaking", listening: "Listening", reading: "Reading" },
  zh: { writing: "写作", speaking: "口语", listening: "听力", reading: "阅读" },
  ja: { writing: "作文", speaking: "会話", listening: "聴解", reading: "読解" },
  ko: { writing: "쓰기", speaking: "말하기", listening: "듣기", reading: "읽기" },
};

export function getExamSkillLabels(languageCode: string) {
  return SKILL_LABELS[languageCode.toLowerCase()] ?? SKILL_LABELS.en;
}
