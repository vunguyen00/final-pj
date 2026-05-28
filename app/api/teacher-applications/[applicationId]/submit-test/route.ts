import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { sendBasicEmail } from "@/lib/mailer";
import { prisma } from "@/lib/prisma";
import { logTeacherApplication } from "@/lib/teacher-onboarding";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ applicationId: string }> },
) {
  try {
    const user = await requireUser();
    const { applicationId } = await params;
    const body = await request.json();
    const answers = (body.answers ?? {}) as Record<string, string>;

    const application = await prisma.teacherApplication.findUnique({
      where: { id: applicationId },
      include: {
        entranceTest: {
          include: {
            questions: {
              include: { answers: true },
              orderBy: { order: "asc" },
            },
          },
        },
      },
    });

    if (!application || application.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (application.status !== "DRAFT") {
      return NextResponse.json({ error: "Bai test da duoc nop hoac ho so khong con o trang thai draft." }, { status: 400 });
    }

    const test = application.entranceTest;
    if (!test) {
      return NextResponse.json({ error: "Ho so khong co bai test dau vao." }, { status: 400 });
    }

    let earned = 0;
    let rawMax = 0;
    const questionResults = test.questions.map((question) => {
      rawMax += question.score;
      const rawAnswer = answers[question.id] ?? "";
      let isCorrect = false;
      let earnedScore = 0;
      let correctAnswer: string | null = null;
      let studentAnswer = String(rawAnswer);

      if (question.type === "MULTIPLE_CHOICE" || question.type === "TRUE_FALSE") {
        const selected = question.answers.find((answer) => answer.id === rawAnswer);
        const correct = question.answers.find((answer) => answer.isCorrect);
        studentAnswer = selected?.content ?? "";
        correctAnswer = correct?.content ?? null;
        isCorrect = Boolean(selected && correct && selected.id === correct.id);
      }

      if (question.type === "FILL_IN_BLANK") {
        const correct = question.answers.find((answer) => answer.isCorrect);
        correctAnswer = correct?.content ?? null;
        isCorrect = Boolean(correct && studentAnswer.trim().toLowerCase() === correct.content.trim().toLowerCase());
      }

      if (isCorrect) {
        earnedScore = question.score;
        earned += question.score;
      }

      return {
        questionId: question.id,
        questionType: question.type,
        content: question.content,
        rawAnswer,
        studentAnswer,
        correctAnswer,
        isCorrect,
        score: question.score,
        earnedScore,
      };
    });

    const finalScore = rawMax > 0 ? (earned / rawMax) * test.maxScore : 0;
    const isPassed = finalScore >= test.passingScore;
    const attemptNo = (await prisma.testAttempt.count({
      where: { testId: test.id, userId: user.id },
    })) + 1;

    const attempt = await prisma.testAttempt.create({
      data: {
        testId: test.id,
        userId: user.id,
        attemptNo,
        score: finalScore,
        maxScore: test.maxScore,
        answers,
        results: {
          totalQuestions: test.questions.length,
          correctAnswers: questionResults.filter((item) => item.isCorrect).length,
          questionResults,
          teacherApplicationId: application.id,
        },
        startedAt: application.startedAt ?? new Date(),
        submittedAt: new Date(),
        isPassed,
      } as never,
    });

    await prisma.teacherApplication.update({
      where: { id: application.id },
      data: {
        status: "UNDER_REVIEW",
        entranceAttemptId: attempt.id,
        submittedAt: new Date(),
        answerState: answers,
      },
    });

    await logTeacherApplication({
      applicationId: application.id,
      status: "UNDER_REVIEW",
      message: "Da nop bai test dau vao, cho admin review.",
      actorId: user.id,
    });

    try {
      await sendBasicEmail(
        user.email,
        "Ho so dang ky giang vien dang cho review",
        "Ban da nop bai test dau vao. Admin se review ho so cua ban.",
      );
    } catch {
      // Do not fail submission when SMTP is not configured.
    }

    return NextResponse.json({
      attemptId: attempt.id,
      score: finalScore,
      maxScore: test.maxScore,
      passingScore: test.passingScore,
      isPassed,
      underReview: true,
      questionResults,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Loi he thong.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
