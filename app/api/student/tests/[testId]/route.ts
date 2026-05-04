import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getCourseProgressPercent } from "@/lib/learning-progress";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ testId: string }> },
) {
  try {
    const { testId } = await params;
    const user = await getCurrentUser();

    if (!user || user.role !== "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const test = await prisma.test.findUnique({
      where: { id: testId },
      include: {
        course: true,
        questions: {
          include: {
            answers: {
              orderBy: { order: "asc" },
            },
          },
          orderBy: { order: "asc" },
        },
        _count: {
          select: {
            attempts: {
              where: { userId: user.id },
            },
          },
        },
      },
    });

    if (!test) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: user.id,
          courseId: test.courseId,
        },
      },
    });

    if (!enrollment) {
      return NextResponse.json({ error: "Not enrolled in this course" }, { status: 403 });
    }

    const progress = await getCourseProgressPercent(user.id, test.courseId);
    if (progress < 100) {
      return NextResponse.json(
        { error: "Ban can hoan thanh 100% bai hoc truoc khi lam test.", progress },
        { status: 403 },
      );
    }

    if (test._count.attempts >= test.maxAttempts) {
      return NextResponse.json({ error: "No attempts remaining", remainingAttempts: 0 }, { status: 403 });
    }

    const questions = test.questions.map((q) => ({
      id: q.id,
      type: q.type,
      content: q.content,
      audioUrl: q.audioUrl,
      order: q.order,
      score: q.score,
      answers:
        q.type === "MULTIPLE_CHOICE" || q.type === "TRUE_FALSE"
          ? q.answers.map((a) => ({
              id: a.id,
              content: a.content,
              order: a.order,
            }))
          : null,
    }));

    return NextResponse.json({
      test: {
        id: test.id,
        name: test.name,
        description: test.description,
        courseName: test.course.name,
        maxScore: test.maxScore,
        passingScore: test.passingScore,
        maxAttempts: test.maxAttempts,
        timeLimit: test.timeLimit,
        shuffleQuestions: test.shuffleQuestions,
        remainingAttempts: test.maxAttempts - test._count.attempts,
      },
      questions,
    });
  } catch (error) {
    console.error("Error fetching test:", error);
    return NextResponse.json({ error: "Failed to fetch test" }, { status: 500 });
  }
}
