import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { sendBasicEmail } from "@/lib/mailer";
import { prisma } from "@/lib/prisma";
import {
  evaluateTestAiAnswers,
  getTestAiScoreRatio,
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
      return NextResponse.json({ error: "Bài test đã được nộp hoặc hồ sơ không còn ở trạng thái draft." }, { status: 400 });
    }

    const test = application.entranceTest;
    if (!test) {
      return NextResponse.json({ error: "Hồ sơ không có bài test đầu vào." }, { status: 400 });
    }

    const totalQuestionScore = test.questions.reduce((sum, question) => sum + Number(question.score || 0), 0);
    if (!isTestReady(totalQuestionScore)) {
      return NextResponse.json({ error: `Bài test đầu vào chưa hợp lệ. Tổng điểm câu hỏi phải bằng ${FIXED_TEST_MAX_SCORE}.` }, { status: 400 });
    }

    let earned = 0;
    let rawMax = 0;
    const questionResults = [];
    const aiInputs = test.questions.flatMap((question) => {
      if (question.type !== "ESSAY" && question.type !== "SPEAKING") {
        return [];
      }

      const answer = String(answers[question.id] || "").trim();
      if (!answer) return [];

      return [
        {
          questionId: question.id,
          mode: question.type === "SPEAKING" ? ("SPEAKING" as const) : ("WRITING" as const),
          answer,
          prompt: question.content,
          languageCode: application.language.code,
        },
      ];
    });
    const aiResults = await evaluateTestAiAnswers(aiInputs);
    const failedAiResult = aiInputs
      .map((input) => aiResults.get(input.questionId))
      .find((result) => result?.failed);
    if (failedAiResult) {
      const invalidResponse = failedAiResult.failureReason === "invalid_response";
      return NextResponse.json(
        { error: "AI đang tạm thời quá tải. Bài thi chưa được nộp, vui lòng thử lại." },
        { status: invalidResponse ? 502 : 503 },
      );
    }
    const deadline = application.startedAt && test.timeLimit
      ? application.startedAt.getTime() + (test.timeLimit * 60 + 15) * 1000
      : null;
    if (deadline && Date.now() > deadline) {
      await prisma.teacherApplication.update({
        where: { id: application.id },
        data: { status: "EXPIRED" },
      });
      return NextResponse.json({ error: "Bài test đã quá thời gian cho phép." }, { status: 408 });
    }

    const previousAttempts = await prisma.testAttempt.count({
      where: { testId: test.id, userId: user.id },
    });
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
          earnedScore = Math.round(question.score * getTestAiScoreRatio(aiResult) * 10) / 10;
          isCorrect = isTestAiAnswerCorrect(aiResult);
          earned += earnedScore;
          aiEvaluation = aiResult.aiEvaluation;
        }
      }

      if (question.type === "SPEAKING" && studentAnswer.trim()) {
        const aiResult = aiResults.get(question.id);
        if (aiResult) {
          earnedScore = Math.round(question.score * getTestAiScoreRatio(aiResult) * 10) / 10;
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
    const attemptNo = previousAttempts + 1;

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
        "Hồ sơ đăng ký giảng viên đang chờ review",
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
    const message = error instanceof Error ? error.message : "Lỗi hệ thống.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
