import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ testId: string; attemptId: string }> },
) {
  try {
    const { testId, attemptId } = await params;
    const user = await getCurrentUser();

    if (!user || (user.role !== "STUDENT" && user.role !== "TEACHER" && user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const attempt = (await prisma.testAttempt.findUnique({
      where: { id: attemptId },
      include: {
        test: {
          include: {
            course: {
              select: { id: true, name: true, instructorId: true },
            },
          },
        },
      },
    })) as (Record<string, unknown> & {
      id: string;
      testId: string;
      userId: string;
      score: number;
      isPassed: boolean;
      submittedAt: Date;
      test: { passingScore: number; course: { id: string; name: string; instructorId: string | null } | null };
    }) | null;

    if (!attempt || attempt.testId !== testId) {
      return NextResponse.json({ error: "Result not found" }, { status: 404 });
    }

    const isOwnerPreview =
      (user.role === "TEACHER" || user.role === "ADMIN") &&
      attempt.test.course?.instructorId === user.id;

    if (attempt.userId !== user.id && !isOwnerPreview) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const stored = (attempt.results ?? {}) as Record<string, unknown>;

    return NextResponse.json({
      attemptId: attempt.id,
      attemptNo: Number(attempt.attemptNo ?? 1),
      score: attempt.score,
      maxScore: Number(attempt.maxScore ?? attempt.score),
      passingScore: attempt.test.passingScore,
      isPassed: attempt.isPassed,
      courseId: attempt.test.course?.id ?? null,
      courseName: attempt.test.course?.name ?? "Public practice",
      totalQuestions: Number(stored.totalQuestions ?? 0),
      correctAnswers: Number(stored.correctAnswers ?? 0),
      submittedAnswers: Array.isArray(stored.submittedAnswers) ? stored.submittedAnswers : [],
      questionResults: Array.isArray(stored.questionResults) ? stored.questionResults : [],
      scoreOnlyAiFeedback: stored.scoreOnlyAiFeedback === true,
      aiFeedbackPurchased: stored.aiFeedbackPurchased === true,
      aiFeedbackCost: Number(stored.aiFeedbackCost ?? 0),
      submittedAt: attempt.submittedAt,
    });
  } catch (error) {
    console.error("Error fetching test attempt:", error);
    return NextResponse.json({ error: "Failed to fetch test attempt" }, { status: 500 });
  }
}
