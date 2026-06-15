import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getCourseProgressPercent } from "@/lib/learning-progress";
import { FIXED_TEST_MAX_SCORE, isTestReady } from "@/lib/test-rules";
import { SPEAKING_AI_COST, WRITING_AI_COST } from "@/lib/ai-points";
import { shouldChargeAiPoints } from "@/lib/ai-access";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ testId: string }> },
) {
  try {
    const { testId } = await params;
    const user = await getCurrentUser();

    if (!user || (user.role !== "STUDENT" && user.role !== "TEACHER" && user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const test = await prisma.test.findUnique({
      where: { id: testId },
      include: {
        course: {
          include: {
            language: {
              select: { id: true, name: true, code: true },
            },
          },
        },
        language: {
          select: { id: true, name: true, code: true },
        },
        questions: {
          include: {
            answers: {
              orderBy: { order: "asc" },
            },
          },
          orderBy: { order: "asc" },
        },
      },
    });

    if (!test) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    const totalQuestionScore = test.questions.reduce((sum, question) => sum + Number(question.score || 0), 0);
    if (!isTestReady(totalQuestionScore)) {
      return NextResponse.json(
        { error: `Bai test chua hop le. Tong diem cau hoi phai bang ${FIXED_TEST_MAX_SCORE}.`, totalQuestionScore },
        { status: 400 },
      );
    }

    if (test.kind === "TEACHER_ENTRANCE") {
      return NextResponse.json({ error: "Teacher entrance tests are only available from the teacher registration flow." }, { status: 403 });
    }

    const isOwnerPreview =
      (user.role === "TEACHER" || user.role === "ADMIN") && test.course?.instructorId === user.id;

    if (!isOwnerPreview && test.kind === "COURSE") {
      if (!test.courseId) {
        return NextResponse.json({ error: "Invalid course test." }, { status: 400 });
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
    }

    const attempts = await prisma.testAttempt.findMany({
      where: { testId, userId: user.id },
      orderBy: { submittedAt: "desc" },
      select: {
        id: true,
        attemptNo: true,
        score: true,
        maxScore: true,
        isPassed: true,
        submittedAt: true,
      },
      take: 20,
    });

    const questions = test.questions.map((q) => ({
      id: q.id,
      type: q.type,
      content: q.content,
      audioUrl: q.audioUrl,
      hint: q.hint,
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
    const aiFeedbackCost = test.questions.some(
      (question) => question.type === "SPEAKING",
    )
      ? SPEAKING_AI_COST
      : test.questions.some((question) => question.type === "ESSAY")
        ? WRITING_AI_COST
        : 0;

    return NextResponse.json({
      test: {
        id: test.id,
        name: test.name,
        description: test.description,
        courseName: test.course?.name ?? "Public practice",
        kind: test.kind,
        assessmentMode: test.assessmentMode,
        language: test.language ?? test.course?.language ?? null,
        maxScore: FIXED_TEST_MAX_SCORE,
        passingScore: test.passingScore,
        timeLimit: test.timeLimit,
        shuffleQuestions: test.shuffleQuestions,
        previewMode: isOwnerPreview,
        aiFeedbackCost,
        chargeAiFeedback: shouldChargeAiPoints(user.role),
      },
      questions,
      attempts,
    });
  } catch (error) {
    console.error("Error fetching test:", error);
    return NextResponse.json({ error: "Failed to fetch test" }, { status: 500 });
  }
}
