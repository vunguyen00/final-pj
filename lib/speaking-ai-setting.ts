import { prisma } from "@/lib/prisma";

export const SPEAKING_AI_SETTING_KEY = "speaking_ai_config";

export type SpeakingAiExamType = "IELTS" | "HSK";

export type SpeakingAiSetting = {
  examType: SpeakingAiExamType;
  durationSeconds: number;
};

const DEFAULT_SETTING: SpeakingAiSetting = {
  examType: "IELTS",
  durationSeconds: 180,
};

function normalizeExamType(value: unknown): SpeakingAiExamType {
  return value === "HSK" ? "HSK" : "IELTS";
}

function normalizeDurationSeconds(value: unknown): number {
  const raw = Number(value);
  if (!Number.isFinite(raw)) return DEFAULT_SETTING.durationSeconds;
  const rounded = Math.round(raw);
  return Math.max(30, Math.min(900, rounded));
}

export async function getSpeakingAiSetting(): Promise<SpeakingAiSetting> {
  const row = await prisma.systemSetting.findUnique({
    where: { key: SPEAKING_AI_SETTING_KEY },
  });
  const value = row?.value as Partial<SpeakingAiSetting> | null | undefined;

  return {
    examType: normalizeExamType(value?.examType),
    durationSeconds: normalizeDurationSeconds(value?.durationSeconds),
  };
}

export async function setSpeakingAiSetting(input: {
  examType: SpeakingAiExamType;
  durationSeconds: number;
}) {
  const normalized: SpeakingAiSetting = {
    examType: normalizeExamType(input.examType),
    durationSeconds: normalizeDurationSeconds(input.durationSeconds),
  };

  await prisma.systemSetting.upsert({
    where: { key: SPEAKING_AI_SETTING_KEY },
    update: { value: normalized },
    create: { key: SPEAKING_AI_SETTING_KEY, value: normalized },
  });

  return normalized;
}
