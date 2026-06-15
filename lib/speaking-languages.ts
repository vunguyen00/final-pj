export const SPEAKING_LANGUAGES = [
  { value: "ENGLISH", label: "Tiếng Anh" },
  { value: "CHINESE", label: "Tiếng Trung" },
  { value: "JAPANESE", label: "Tiếng Nhật" },
  { value: "KOREAN", label: "Tiếng Hàn" },
] as const;

export type SpeakingLanguage =
  (typeof SPEAKING_LANGUAGES)[number]["value"];
export type SpeakingTask = 1 | 2 | 3;

const TASK_OPTIONS: Record<
  SpeakingLanguage,
  Array<{ value: SpeakingTask; label: string }>
> = {
  ENGLISH: [
    { value: 1, label: "Task 1 - Trả lời câu hỏi ngắn" },
    { value: 2, label: "Task 2 - Nói dài theo chủ đề" },
    { value: 3, label: "Task 3 - Thảo luận và nêu quan điểm" },
  ],
  CHINESE: [
    { value: 1, label: "Task 1 - 回答简短问题" },
    { value: 2, label: "Task 2 - 叙述经历" },
    { value: 3, label: "Task 3 - 表达观点" },
  ],
  JAPANESE: [
    { value: 1, label: "Task 1 - 短い質問に答える" },
    { value: 2, label: "Task 2 - 経験を詳しく話す" },
    { value: 3, label: "Task 3 - 意見を述べる" },
  ],
  KOREAN: [
    { value: 1, label: "Task 1 - 짧은 질문에 답하기" },
    { value: 2, label: "Task 2 - 경험을 자세히 말하기" },
    { value: 3, label: "Task 3 - 의견 말하기" },
  ],
};

export function normalizeSpeakingLanguage(
  value: unknown,
  fallback: SpeakingLanguage = "ENGLISH",
): SpeakingLanguage {
  const normalized = String(value || "").trim().toUpperCase();
  return SPEAKING_LANGUAGES.some((item) => item.value === normalized)
    ? (normalized as SpeakingLanguage)
    : fallback;
}

export function getSpeakingLanguageFromExamSetting(
  examType: unknown,
): SpeakingLanguage {
  return String(examType || "").toUpperCase() === "HSK"
    ? "CHINESE"
    : "ENGLISH";
}

export function getSpeakingLanguageLabel(language: SpeakingLanguage) {
  return (
    SPEAKING_LANGUAGES.find((item) => item.value === language)?.label ||
    language
  );
}

export function getSpeakingTaskOptions(language: SpeakingLanguage) {
  return TASK_OPTIONS[language];
}

export function normalizeSpeakingTask(
  language: SpeakingLanguage,
  value: unknown,
): SpeakingTask {
  const task = Number(value) as SpeakingTask;
  return TASK_OPTIONS[language].some((item) => item.value === task)
    ? task
    : TASK_OPTIONS[language][0].value;
}

export function getSpeakingWhisperLanguage(language: SpeakingLanguage) {
  const whisperLanguages: Record<SpeakingLanguage, string> = {
    ENGLISH: "english",
    CHINESE: "chinese",
    JAPANESE: "japanese",
    KOREAN: "korean",
  };
  return whisperLanguages[language];
}

export function getSpeakingEvaluationSystem(language: SpeakingLanguage) {
  const systems: Record<SpeakingLanguage, string> = {
    ENGLISH: "IELTS",
    CHINESE: "HSK",
    JAPANESE: "JAPANESE_SPEAKING",
    KOREAN: "KOREAN_SPEAKING",
  };
  return systems[language];
}

export function getDefaultSpeakingPrompt(language: SpeakingLanguage) {
  const prompts: Record<SpeakingLanguage, string> = {
    ENGLISH:
      "Describe a memorable trip. Say where you went, who you went with, what happened, and why it was memorable.",
    CHINESE: "请用中文描述一次难忘的旅行，并说明这次旅行为什么让你印象深刻。",
    JAPANESE:
      "思い出に残っている旅行について、場所、一緒に行った人、出来事、印象に残った理由を話してください。",
    KOREAN:
      "기억에 남는 여행에 대해 장소, 함께 간 사람, 있었던 일, 기억에 남는 이유를 말해 보세요.",
  };
  return prompts[language];
}
