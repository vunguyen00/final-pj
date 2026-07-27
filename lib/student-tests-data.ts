import type { AppRole } from "@/lib/auth";
import {
  getCourseLearningGateState,
  isCourseTestUnlocked,
} from "@/lib/course-learning-gates";
import { prisma } from "@/lib/prisma";
import { FIXED_TEST_MAX_SCORE, isTestReady } from "@/lib/test-rules";

type TestsViewer = {
  id: string;
  role: AppRole;
};

export async function getStudentTestsData(
  user: TestsViewer,
  courseId?: string | null,
) {
  const enrollments = await prisma.enrollment.findMany({
    where: courseId
      ? { userId: user.id, courseId, accessStatus: "ACTIVE" }
      : { userId: user.id, accessStatus: "ACTIVE" },
    include: { course: { select: { id: true, name: true } } },
  });

  if (courseId && enrollments.length === 0) {
    const ownedCourse = await prisma.course.findFirst({
      where: { id: courseId, instructorId: user.id },
      select: { id: true },
    });
    if (!ownedCourse) return { tests: [] };
  }

  const enrolledCourseIds = enrollments.map((item) => item.courseId);
  const ownedCourses =
    user.role === "TEACHER" || user.role === "ADMIN"
      ? await prisma.course.findMany({
          where: courseId
            ? { id: courseId, instructorId: user.id }
            : { instructorId: user.id },
          select: { id: true, name: true },
        })
      : [];
  const ownedCourseIds = ownedCourses.map((item) => item.id);
  const ownedCourseIdSet = new Set(ownedCourseIds);
  const visibleCourseIds = Array.from(
    new Set([...enrolledCourseIds, ...ownedCourseIds]),
  );
  const courseNameMap = new Map(
    enrollments.map((item) => [item.courseId, item.course.name]),
  );
  for (const owned of ownedCourses) courseNameMap.set(owned.id, owned.name);

  const tests = await prisma.test.findMany({
    where: courseId
      ? { kind: "COURSE", courseId: { in: visibleCourseIds } }
      : {
          OR: [
            visibleCourseIds.length > 0
              ? { kind: "COURSE", courseId: { in: visibleCourseIds } }
              : undefined,
            { kind: "PUBLIC_PRACTICE" },
          ].filter(Boolean) as never,
        },
    include: {
      language: { select: { id: true, name: true, code: true } },
      course: {
        select: {
          language: { select: { id: true, name: true, code: true } },
        },
      },
      questions: { select: { score: true } },
      _count: { select: { questions: true } },
      attempts: {
        where: { userId: user.id },
        orderBy: { submittedAt: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const gateStateByCourse = new Map(
    await Promise.all(
      visibleCourseIds.map(async (visibleCourseId) => [
        visibleCourseId,
        ownedCourseIdSet.has(visibleCourseId)
          ? null
          : await getCourseLearningGateState(user.id, visibleCourseId),
      ] as const),
    ),
  );

  return {
    tests: tests.map((test) => {
      const gateState = test.courseId ? gateStateByCourse.get(test.courseId) : null;
      const moduleLessons = gateState?.modules.flatMap((module) => module.lessons) ?? [];
      const completedLessons = moduleLessons.filter((lesson) => gateState?.completedLessonIds.has(lesson.id)).length;
      const progress = test.courseId
        ? ownedCourseIdSet.has(test.courseId)
          ? 100
          : moduleLessons.length > 0
            ? Math.round((completedLessons / moduleLessons.length) * 100)
            : 0
        : 100;
      const isUnlocked =
        test.kind === "PUBLIC_PRACTICE" ||
        Boolean(test.courseId && ownedCourseIdSet.has(test.courseId)) ||
        Boolean(gateState && isCourseTestUnlocked(gateState, test));
      const totalQuestionScore = test.questions.reduce(
        (sum, question) => sum + Number(question.score || 0),
        0,
      );
      const isReady = isTestReady(totalQuestionScore);
      const lastAttempt = test.attempts[0];

      return {
        id: test.id,
        name: test.name,
        description: test.description,
        courseId: test.courseId,
        moduleId: test.moduleId,
        courseName: test.courseId
          ? (courseNameMap.get(test.courseId) ?? "Unknown course")
          : "Public practice",
        kind: test.kind,
        assessmentMode: test.assessmentMode,
        language: test.language ?? test.course?.language ?? null,
        maxScore: FIXED_TEST_MAX_SCORE,
        passingScore: test.passingScore,
        timeLimit: test.timeLimit,
        questionCount: test._count.questions,
        totalQuestionScore,
        hasAttempt: Boolean(lastAttempt),
        lastAttempt: lastAttempt
          ? {
              id: lastAttempt.id,
              score: lastAttempt.score,
              isPassed: lastAttempt.isPassed,
              submittedAt: lastAttempt.submittedAt.toISOString(),
            }
          : null,
        progress,
        canAttempt: isUnlocked && isReady,
        isUnlocked,
        isReady,
      };
    }),
  };
}

export async function getStudentTestHistoryData(
  user: TestsViewer,
  filters: { courseId?: string | null; testId?: string | null } = {},
) {
  const [attempts, enrolledCourses] = await Promise.all([
    prisma.testAttempt.findMany({
      where: { userId: user.id },
      include: {
        test: {
          select: {
            id: true,
            name: true,
            maxScore: true,
            moduleId: true,
            lessonId: true,
            course: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { submittedAt: "desc" },
    }),
    prisma.enrollment.findMany({
      where: { userId: user.id },
      select: { course: { select: { id: true, name: true } } },
    }),
  ]);

  const courses = Array.from(
    new Map(
      [
        ...enrolledCourses.map((item) => item.course),
        ...attempts.flatMap((attempt) =>
          attempt.test.course ? [attempt.test.course] : [],
        ),
      ].map((course) => [course.id, course]),
    ).values(),
  );
  const testsById = new Map<
    string,
    { id: string; name: string; courseId: string | null }
  >();
  for (const attempt of attempts) {
    if (attempt.test.moduleId || attempt.test.lessonId) continue;
    testsById.set(attempt.test.id, {
      id: attempt.test.id,
      name: attempt.test.name,
      courseId: attempt.test.course?.id ?? null,
    });
  }
  const tests = Array.from(testsById.values());
  const filteredAttempts = attempts.filter((attempt) => {
    if (filters.courseId && attempt.test.course?.id !== filters.courseId) {
      return false;
    }
    if (filters.testId && attempt.test.id !== filters.testId) {
      return false;
    }
    return true;
  });
  const history = filteredAttempts.map((attempt) => {
    const stored = (attempt.results ?? {}) as Record<string, unknown>;
    const questionResults = Array.isArray(stored.questionResults)
      ? stored.questionResults
      : [];

    return {
      attemptId: attempt.id,
      attemptNo: attempt.attemptNo,
      score: attempt.score,
      maxScore: attempt.maxScore,
      isPassed: attempt.isPassed,
      submittedAt: attempt.submittedAt.toISOString(),
      totalQuestions: Number(stored.totalQuestions ?? questionResults.length),
      correctAnswers: Number(stored.correctAnswers ?? 0),
      test: {
        id: attempt.test.id,
        name: attempt.test.name,
        maxScore: attempt.test.maxScore,
      },
      course: {
        id: attempt.test.course?.id ?? null,
        name: attempt.test.course?.name ?? "Public practice",
      },
    };
  });

  return { courses, tests, history };
}
