import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getCourseProgressPercent } from "@/lib/learning-progress";
import { FIXED_TEST_MAX_SCORE, isTestReady } from "@/lib/test-rules";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || (user.role !== "STUDENT" && user.role !== "TEACHER" && user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId");

    const enrollments = await prisma.enrollment.findMany({
      where: courseId ? { userId: user.id, courseId } : { userId: user.id },
      include: {
        course: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (courseId && enrollments.length === 0) {
      const ownedCourse = await prisma.course.findFirst({
        where: { id: courseId, instructorId: user.id },
        select: { id: true, name: true },
      });
      if (!ownedCourse) return NextResponse.json({ tests: [] });
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
    const visibleCourseIds = Array.from(new Set([...enrolledCourseIds, ...ownedCourseIds]));
    const courseNameMap = new Map(enrollments.map((item) => [item.courseId, item.course.name]));
    for (const owned of ownedCourses) {
      courseNameMap.set(owned.id, owned.name);
    }

    const tests = await prisma.test.findMany({
      where: courseId
        ? {
            kind: "COURSE",
            courseId: { in: visibleCourseIds },
          }
        : {
            OR: [
              visibleCourseIds.length > 0
                ? {
                    kind: "COURSE",
                    courseId: { in: visibleCourseIds },
                  }
                : undefined,
              { kind: "PUBLIC_PRACTICE" },
            ].filter(Boolean) as never,
          },
      include: {
        language: { select: { id: true, name: true, code: true } },
        course: { select: { language: { select: { id: true, name: true, code: true } } } },
        questions: { select: { score: true } },
        _count: {
          select: {
            questions: true,
          },
        },
        attempts: {
          where: { userId: user.id },
          orderBy: { submittedAt: "desc" },
          take: 1,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const progressByCourse = new Map<string, number>();
    for (const courseIdItem of visibleCourseIds) {
      if (ownedCourseIds.includes(courseIdItem)) {
        progressByCourse.set(courseIdItem, 100);
        continue;
      }
      const progress = await getCourseProgressPercent(user.id, courseIdItem);
      progressByCourse.set(courseIdItem, progress);
    }

    const normalizedTests = tests.map((test) => {
      const progress = test.courseId ? progressByCourse.get(test.courseId) ?? 0 : 100;
      const unlockedByProgress = test.kind === "PUBLIC_PRACTICE" || progress >= 100;
      const totalQuestionScore = test.questions.reduce((sum, question) => sum + Number(question.score || 0), 0);
      const ready = isTestReady(totalQuestionScore);
      const canAttempt = unlockedByProgress && ready;

      return {
        id: test.id,
        name: test.name,
        description: test.description,
        courseId: test.courseId,
        courseName: test.courseId ? courseNameMap.get(test.courseId) ?? "Unknown course" : "Public practice",
        kind: test.kind,
        assessmentMode: test.assessmentMode,
        language: test.language ?? test.course?.language ?? null,
        maxScore: FIXED_TEST_MAX_SCORE,
        passingScore: test.passingScore,
        timeLimit: test.timeLimit,
        questionCount: test._count.questions,
        totalQuestionScore,
        hasAttempt: Boolean(test.attempts[0]),
        lastAttempt: test.attempts[0]
          ? {
              id: test.attempts[0].id,
              score: test.attempts[0].score,
              isPassed: test.attempts[0].isPassed,
              submittedAt: test.attempts[0].submittedAt,
            }
          : null,
        progress,
        canAttempt,
        isUnlocked: unlockedByProgress,
        isReady: ready,
      };
    });

    return NextResponse.json({ tests: normalizedTests });
  } catch (error) {
    console.error("Error fetching student tests:", error);
    return NextResponse.json({ error: "Failed to fetch tests" }, { status: 500 });
  }
}
