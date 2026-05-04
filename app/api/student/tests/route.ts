import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getCourseProgressPercent } from "@/lib/learning-progress";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId");

    const whereClause = courseId ? { userId: user.id, courseId } : { userId: user.id };

    const enrollments = await prisma.enrollment.findMany({
      where: whereClause,
      include: {
        course: {
          include: {
            tests: {
              include: {
                _count: {
                  select: {
                    questions: true,
                    attempts: {
                      where: { userId: user.id },
                    },
                  },
                },
                attempts: {
                  where: { userId: user.id },
                  orderBy: { startedAt: "desc" },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    const progressByCourse = new Map<string, number>();
    for (const enrollment of enrollments) {
      const progress = await getCourseProgressPercent(user.id, enrollment.courseId);
      progressByCourse.set(enrollment.courseId, progress);
    }

    const tests = enrollments.flatMap((enrollment) =>
      enrollment.course.tests.map((test) => {
        const progress = progressByCourse.get(test.courseId) ?? 0;
        const unlocked = progress >= 100;

        return {
          id: test.id,
          name: test.name,
          description: test.description,
          courseId: test.courseId,
          courseName: enrollment.course.name,
          maxScore: test.maxScore,
          passingScore: test.passingScore,
          maxAttempts: test.maxAttempts,
          timeLimit: test.timeLimit,
          questionCount: test._count.questions,
          userAttempts: test._count.attempts,
          lastAttempt: test.attempts[0]
            ? {
                id: test.attempts[0].id,
                score: test.attempts[0].score,
                isPassed: test.attempts[0].isPassed,
                submittedAt: test.attempts[0].submittedAt,
              }
            : null,
          progress,
          canAttempt: unlocked && test._count.attempts < test.maxAttempts,
          isUnlocked: unlocked,
        };
      }),
    );

    return NextResponse.json({ tests });
  } catch (error) {
    console.error("Error fetching student tests:", error);
    return NextResponse.json({ error: "Failed to fetch tests" }, { status: 500 });
  }
}
