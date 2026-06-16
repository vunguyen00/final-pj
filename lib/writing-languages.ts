import {
  SPEAKING_LANGUAGES,
  type SpeakingLanguage,
} from "@/lib/speaking-languages";

export const WRITING_LANGUAGES = SPEAKING_LANGUAGES;
export type WritingLanguage = SpeakingLanguage;

export function normalizeWritingLanguage(
  value: unknown,
  fallback: WritingLanguage = "ENGLISH",
): WritingLanguage {
  const normalized = String(value || "").trim().toUpperCase();
  return WRITING_LANGUAGES.some((item) => item.value === normalized)
    ? (normalized as WritingLanguage)
    : fallback;
}

export function getWritingLanguageLabel(language: WritingLanguage) {
  return (
    WRITING_LANGUAGES.find((item) => item.value === language)?.label ||
    language
  );
}

export function getWritingLanguageCode(language: WritingLanguage) {
  const codes: Record<WritingLanguage, string> = {
    ENGLISH: "en",
    CHINESE: "zh",
    JAPANESE: "ja",
    KOREAN: "ko",
  };
  return codes[language];
}

export function getWritingEvaluationSystem(language: WritingLanguage) {
  return language === "ENGLISH"
    ? "IELTS"
    : `${language}_WRITING`;
}

export function getWritingAiLanguageName(language: WritingLanguage) {
  const names: Record<WritingLanguage, string> = {
    ENGLISH: "English",
    CHINESE: "Simplified Chinese",
    JAPANESE: "Japanese",
    KOREAN: "Korean",
  };
  return names[language];
}
