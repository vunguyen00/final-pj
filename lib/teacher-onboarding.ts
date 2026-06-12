import { randomInt } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { isTestReady } from "@/lib/test-rules";

export const TEACHER_ENTRANCE_SETTING_KEY = "teacher_entrance_registration";

const DEFAULT_LANGUAGES = [
  { name: "English", code: "en" },
  { name: "Chinese", code: "zh" },
  { name: "Japanese", code: "ja" },
  { name: "Korean", code: "ko" },
];

type TeacherEntranceSetting = {
  enabled: boolean;
};

export async function ensureDefaultLanguages() {
  for (const language of DEFAULT_LANGUAGES) {
    await prisma.learningLanguage.upsert({
      where: { code: language.code },
      update: {},
      create: language,
    });
  }
}

export async function getTeacherEntranceSetting(): Promise<TeacherEntranceSetting> {
  const row = await prisma.systemSetting.findUnique({
    where: { key: TEACHER_ENTRANCE_SETTING_KEY },
  });
  const value = row?.value as Partial<TeacherEntranceSetting> | null | undefined;

  return { enabled: Boolean(value?.enabled) };
}

export async function setTeacherEntranceSetting(enabled: boolean) {
  return prisma.systemSetting.upsert({
    where: { key: TEACHER_ENTRANCE_SETTING_KEY },
    update: { value: { enabled } },
    create: { key: TEACHER_ENTRANCE_SETTING_KEY, value: { enabled } },
  });
}

export async function getActiveLanguages() {
  await ensureDefaultLanguages();
  return prisma.learningLanguage.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
}

export async function findEntranceTest(languageId: string) {
  const tests = await prisma.test.findMany({
    where: {
      kind: "TEACHER_ENTRANCE",
      languageId,
    },
    include: {
      questions: {
        include: { answers: { orderBy: { order: "asc" } } },
        orderBy: { order: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  const readyTests = tests.filter((test) =>
    isTestReady(test.questions.reduce((sum, question) => sum + Number(question.score || 0), 0)),
  );
  if (readyTests.length === 0) return null;
  return readyTests[randomInt(readyTests.length)];
}

export async function logTeacherApplication(params: {
  applicationId: string;
  status: "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "EXPIRED";
  message: string;
  actorId?: string | null;
}) {
  return prisma.teacherApplicationLog.create({
    data: {
      applicationId: params.applicationId,
      status: params.status,
      message: params.message,
      actorId: params.actorId ?? null,
    },
  });
}
