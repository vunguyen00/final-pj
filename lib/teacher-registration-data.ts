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
            language: { select: { id: true, name: true, code: true } },
            entranceTest: {
              select: {
                id: true,
                name: true,
                description: true,
                assessmentMode: true,
                timeLimit: true,
                shuffleQuestions: true,
                questions: {
                  select: {
                    id: true,
                    type: true,
                    content: true,
                    audioUrl: true,
                    hint: true,
                    score: true,
                    preparationTimeSeconds: true,
                    answerTimeSeconds: true,
                    answers: {
                      select: { id: true, content: true, order: true },
                      orderBy: { order: "asc" },
                    },
                  },
                  orderBy: { order: "asc" },
                },
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
            questions: application.entranceTest.questions.map((question) => ({
              ...question,
              answers:
                question.type === "MULTIPLE_CHOICE" ||
                question.type === "TRUE_FALSE"
                  ? question.answers
                  : null,
            })),
          }
        : null,
    })),
  };
}
