import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || (user.role !== "STUDENT" && user.role !== "TEACHER" && user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId");
    const testId = searchParams.get("testId");

    const whereClause: {
      userId: string;
      test?: {
        courseId?: string;
        id?: string;
      };
    } = {
      userId: user.id,
    };

    if (courseId || testId) {
      whereClause.test = {};
      if (courseId) whereClause.test.courseId = courseId;
      if (testId) whereClause.test.id = testId;
    }

    const attempts = await prisma.testAttempt.findMany({
      where: whereClause,
      include: {
        test: {
          select: {
            id: true,
            name: true,
            maxScore: true,
            course: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        submittedAt: "desc",
      },
    });

    const enrolledCourses = await prisma.enrollment.findMany({
      where: { userId: user.id },
      select: {
        course: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const coursesFromAttempts = attempts
      .filter((attempt) => attempt.test.course)
      .map((attempt) => ({
        id: attempt.test.course!.id,
        name: attempt.test.course!.name,
      }));
    const courses = Array.from(
      new Map(
        [...enrolledCourses.map((item) => item.course), ...coursesFromAttempts].map((course) => [
          course.id,
          course,
        ]),
      ).values(),
    );

    const tests = Array.from(
      new Map(
        attempts.map((attempt) => [
          attempt.test.id,
          {
            id: attempt.test.id,
            name: attempt.test.name,
            courseId: attempt.test.course?.id ?? null,
          },
        ]),
      ).values(),
    );

    const history = attempts.map((attempt) => {
      const stored = (attempt.results ?? {}) as Record<string, unknown>;
      const questionResults = Array.isArray(stored.questionResults) ? stored.questionResults : [];

      return {
        attemptId: attempt.id,
        attemptNo: attempt.attemptNo,
        score: attempt.score,
        maxScore: attempt.maxScore,
        isPassed: attempt.isPassed,
        submittedAt: attempt.submittedAt,
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

    return NextResponse.json({ courses, tests, history });
  } catch (error) {
    console.error("Error fetching test history:", error);
    return NextResponse.json({ error: "Failed to fetch test history" }, { status: 500 });
  }
}
