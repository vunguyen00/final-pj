import { prisma } from "@/lib/prisma";
import {
  getActiveLanguages,
  getTeacherEntranceSetting,
} from "@/lib/teacher-onboarding";
import { parseTeacherQuestionRevealState } from "@/lib/teacher-question-timing";

export async function getTeacherRegistrationData(userId?: string) {
  const [setting, languages, applications] = await Promise.all([
    getTeacherEntranceSetting(),
    getActiveLanguages(),
    userId
      ? prisma.teacherApplication.findMany({
          where: { userId },
          select: {
            id: true,
            status: true,
            attemptNo: true,
            answerState: true,
            startedAt: true,
            createdAt: true,
            submittedAt: true,
            violationCount: true,
            failureReason: true,
            questionRevealState: true,
            entranceTimeLimit: true,
            language: { select: { id: true, name: true, code: true } },
            entranceTest: {
              select: {
                id: true,
                name: true,
                description: true,
                assessmentMode: true,
                timeLimit: true,
                shuffleQuestions: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    setting,
    languages,
    applications: applications.map((application) => ({
      ...application,
      answerState:
        application.answerState &&
        typeof application.answerState === "object" &&
        !Array.isArray(application.answerState)
          ? Object.fromEntries(
              Object.entries(application.answerState).filter(
                (entry): entry is [string, string] =>
                  typeof entry[1] === "string",
              ),
            )
          : null,
      startedAt: application.startedAt?.toISOString() ?? null,
      createdAt: application.createdAt.toISOString(),
      submittedAt: application.submittedAt?.toISOString() ?? null,
      questionRevealState: parseTeacherQuestionRevealState(application.questionRevealState),
      entranceTest: application.entranceTest
        ? {
            ...application.entranceTest,
            timeLimit:
              application.entranceTimeLimit ??
              application.entranceTest.timeLimit,
            // Never preload prompts for a sequential entrance exam.
            questions: [],
          }
        : null,
    })),
  };
}
