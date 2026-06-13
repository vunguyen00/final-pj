import type { SpeakingExamType } from "@/lib/ai/types";

export const FIXED_TEST_MAX_SCORE = 100;
export const UNLIMITED_TEST_ATTEMPTS = 2147483647;

export type TestAssessmentMode = "STANDARD" | "WRITING" | "SPEAKING";
export type SupportedQuestionType = "MULTIPLE_CHOICE" | "FILL_IN_BLANK" | "ESSAY" | "TRUE_FALSE" | "SPEAKING";
export type TestKind = "COURSE" | "PUBLIC_PRACTICE" | "TEACHER_ENTRANCE";

export function normalizeTestAssessmentMode(value: unknown): TestAssessmentMode {
  if (value === "WRITING" || value === "SPEAKING") return value;
  return "STANDARD";
}

export function getAssessmentModeLabel(mode: TestAssessmentMode): string {
  if (mode === "WRITING") return "Writing AI";
  if (mode === "SPEAKING") return "Speaking AI";
  return "Standard";
}

export function requiresLanguageForTest(kind: TestKind): boolean {
  return kind !== "COURSE";
}

export function canUseEssayQuestion(params: {
  assessmentMode: TestAssessmentMode;
  courseCategory?: string | null;
}) {
  return params.assessmentMode === "WRITING" || (params.courseCategory || "").trim().toLowerCase() === "writing";
}

export function canUseSpeakingQuestion(assessmentMode: TestAssessmentMode) {
  return assessmentMode === "SPEAKING";
}

export function getRemainingQuestionScore(totalQuestionScore: number) {
  return FIXED_TEST_MAX_SCORE - totalQuestionScore;
}

export function isTestReady(totalQuestionScore: number) {
  return Math.round(totalQuestionScore * 100) / 100 === FIXED_TEST_MAX_SCORE;
}

export function getSpeechRecognitionLocale(languageCode?: string | null) {
  const normalized = (languageCode || "").trim().toLowerCase();
  if (normalized.startsWith("zh")) return "zh-CN";
  if (normalized.startsWith("ja")) return "ja-JP";
  if (normalized.startsWith("ko")) return "ko-KR";
  if (normalized.startsWith("vi")) return "vi-VN";
  return "en-US";
}

export function getSpeakingExamTypeForLanguageCode(languageCode?: string | null): SpeakingExamType {
  const normalized = (languageCode || "").trim().toLowerCase();
  return normalized.startsWith("zh") ? "HSK" : "IELTS";
}
