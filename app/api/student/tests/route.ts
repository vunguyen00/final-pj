import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user || user.role !== "STUDENT") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId");

    // Get enrollments with course tests
    const whereClause = courseId 
      ? { userId: user.id, courseId }
      : { userId: user.id };

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
                      where: { userId: user.id }
                    }
                  }
                },
                attempts: {
                  where: { userId: user.id },
                  orderBy: { startedAt: "desc" },
                  take: 1
                }
              }
            }
          }
        }
      }
    });

    // Transform data
    const tests = enrollments.flatMap(enrollment => 
      enrollment.course.tests.map(test => ({
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
        lastAttempt: test.attempts[0] ? {
          id: test.attempts[0].id,
          score: test.attempts[0].score,
          isPassed: test.attempts[0].isPassed,
          submittedAt: test.attempts[0].submittedAt,
        } : null,
        canAttempt: test._count.attempts < test.maxAttempts,
      }))
    );

    return NextResponse.json({ tests });
  } catch (error) {
    console.error("Error fetching student tests:", error);
    return NextResponse.json(
      { error: "Failed to fetch tests" },
      { status: 500 }
    );
  }
}