import { getCompletedLessonIds } from "@/lib/learning-progress";
import { prisma } from "@/lib/prisma";
import { calculateCourseLearningGateState } from "@/lib/course-learning-gate-rules";

export {
  calculateCourseLearningGateState,
  getNextCourseLearningAction,
  isCourseTestUnlocked,
  isModuleUnlocked,
} from "@/lib/course-learning-gate-rules";
export type {
  CourseLearningAction,
  CourseLearningGateState,
  LearningGateModule,
  ModuleGateState,
} from "@/lib/course-learning-gate-rules";

export async function getCourseLearningGateState(
  userId: string,
  courseId: string,
) {
  const [course, completedLessonIds, passedAttempts] = await Promise.all([
    prisma.course.findUnique({
      where: { id: courseId },
      select: {
        modules: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            order: true,
            lessons: { select: { id: true } },
            tests: {
              where: { kind: "COURSE" },
              orderBy: { createdAt: "asc" },
              select: { id: true },
            },
          },
        },
        tests: {
          where: { kind: "COURSE", moduleId: null },
          orderBy: { createdAt: "asc" },
          select: { id: true },
        },
      },
    }),
    getCompletedLessonIds(userId, courseId),
    prisma.testAttempt.findMany({
      where: {
        userId,
        isPassed: true,
        test: { kind: "COURSE", courseId },
      },
      select: { testId: true },
      distinct: ["testId"],
    }),
  ]);

  if (!course) return null;

  return calculateCourseLearningGateState({
    modules: course.modules,
    courseTestIds: course.tests.map((test) => test.id),
    completedLessonIds,
    passedTestIds: passedAttempts.map((attempt) => attempt.testId),
  });
}
