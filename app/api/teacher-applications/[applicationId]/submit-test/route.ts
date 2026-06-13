import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { sendBasicEmail } from "@/lib/mailer";
import { prisma } from "@/lib/prisma";
import {
  evaluateTestAiAnswers,
  isTestAiAnswerCorrect,
} from "@/lib/test-ai-evaluation";
import { logTeacherApplication } from "@/lib/teacher-onboarding";
import { FIXED_TEST_MAX_SCORE, isTestReady } from "@/lib/test-rules";

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
        language: true,
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

    const totalQuestionScore = test.questions.reduce((sum, question) => sum + Number(question.score || 0), 0);
    if (!isTestReady(totalQuestionScore)) {
      return NextResponse.json({ error: `Bai test dau vao chua hop le. Tong diem cau hoi phai bang ${FIXED_TEST_MAX_SCORE}.` }, { status: 400 });
    }

    let earned = 0;
    let rawMax = 0;
    const questionResults = [];
    const aiInputs = test.questions
      .filter((question) => question.type === "ESSAY" || question.type === "SPEAKING")
      .map((question) => ({
        questionId: question.id,
        mode: question.type === "SPEAKING" ? "SPEAKING" as const : "WRITING" as const,
        answer: String(answers[question.id] || "").trim(),
        prompt: question.content,
        languageCode: application.language.code,
      }))
      .filter((input) => input.answer);
    const aiResults = await evaluateTestAiAnswers(aiInputs);
    const failedAiResult = aiInputs.some((input) => aiResults.get(input.questionId)?.failed);
    if (failedAiResult) {
      return NextResponse.json(
        { error: "AI dang tam thoi qua tai. Bai thi chua duoc nop, vui long thu lai." },
        { status: 503 },
      );
    }

    for (const question of test.questions) {
      rawMax += question.score;
      const rawAnswer = answers[question.id] ?? "";
      let isCorrect = false;
      let earnedScore = 0;
      let correctAnswer: string | null = null;
      let studentAnswer = String(rawAnswer);
      let aiEvaluation: Record<string, unknown> | null = null;

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

      if (question.type === "ESSAY" && studentAnswer.trim()) {
        const aiResult = aiResults.get(question.id);
        if (aiResult) {
          earnedScore = Math.round(question.score * (aiResult.normalizedScore / 10));
          isCorrect = isTestAiAnswerCorrect(aiResult);
          earned += earnedScore;
          aiEvaluation = aiResult.aiEvaluation;
        }
      }

      if (question.type === "SPEAKING" && studentAnswer.trim()) {
        const aiResult = aiResults.get(question.id);
        if (aiResult) {
          earnedScore = Math.round(question.score * (aiResult.normalizedScore / 10));
          isCorrect = isTestAiAnswerCorrect(aiResult);
          earned += earnedScore;
          aiEvaluation = aiResult.aiEvaluation;
        }
      }

      if (isCorrect && question.type !== "ESSAY" && question.type !== "SPEAKING") {
        earnedScore = question.score;
        earned += question.score;
      }

      questionResults.push({
        questionId: question.id,
        questionType: question.type,
        content: question.content,
        rawAnswer,
        studentAnswer,
        correctAnswer,
        isCorrect,
        score: question.score,
        earnedScore,
        ...(aiEvaluation && { aiEvaluation }),
      });
    }

    const finalScore = rawMax > 0 ? (earned / rawMax) * FIXED_TEST_MAX_SCORE : 0;
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
        maxScore: FIXED_TEST_MAX_SCORE,
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
      maxScore: FIXED_TEST_MAX_SCORE,
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
