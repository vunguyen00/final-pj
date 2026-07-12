import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  getCourseProgressPercent,
  hasCertificateSent,
  markCertificateSent,
  markCourseCompleted,
} from "@/lib/learning-progress";
import { sendCourseCertificateEmail } from "@/lib/mailer";
import {
  AI_POINT_PRICE_VND,
  getAiPointsSummary,
  recordLearningActivity,
  SPEAKING_AI_COST,
  spendAiPoints,
  WRITING_AI_COST,
} from "@/lib/ai-points";
import { shouldChargeAiPoints } from "@/lib/ai-access";
import {
  evaluateTestAiAnswers,
  isTestAiAnswerCorrect,
} from "@/lib/test-ai-evaluation";
import { verifyTestAttemptToken } from "@/lib/test-attempt-token";
import { FIXED_TEST_MAX_SCORE, isTestReady } from "@/lib/test-rules";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ testId: string }> },
) {
  try {
    const { testId } = await params;
    const user = await getCurrentUser();

    if (!user || (user.role !== "STUDENT" && user.role !== "TEACHER" && user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const answers = (body.answers ?? {}) as Record<string, string>;
    const includeAiFeedback = body.includeAiFeedback === true;
    const attemptToken = typeof body.attemptToken === "string" ? body.attemptToken : "";

    const test = await prisma.test.findUnique({
      where: { id: testId },
      include: {
        language: { select: { code: true, name: true } },
        questions: {
          include: {
            answers: true,
          },
        },
        course: {
          select: { id: true, name: true, instructorId: true, language: { select: { code: true, name: true } } },
        },
      },
    });

    if (!test) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    const totalQuestionScore = test.questions.reduce((sum, question) => sum + Number(question.score || 0), 0);
    if (!isTestReady(totalQuestionScore)) {
      return NextResponse.json({ error: `Bài test chưa hợp lệ. Tổng điểm câu hỏi phải bằng ${FIXED_TEST_MAX_SCORE}.` }, { status: 400 });
    }

    if (test.kind === "TEACHER_ENTRANCE") {
      return NextResponse.json({ error: "Teacher entrance tests are only available from the teacher registration flow." }, { status: 403 });
    }

    const tokenResult = verifyTestAttemptToken({
      token: attemptToken,
      userId: user.id,
      testId,
    });
    if (!tokenResult.ok) {
      return NextResponse.json(
        {
          error:
            tokenResult.reason === "EXPIRED"
              ? "Đã hết thời gian làm bài. Bài nộp không được chấp nhận."
              : "Phiên làm bài không hợp lệ. Vui lòng tải lại bài test.",
        },
        { status: tokenResult.reason === "EXPIRED" ? 408 : 400 },
      );
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

    let totalScore = 0;
    let maxScore = 0;
    const questionResults: Array<Record<string, unknown>> = [];
    const answerSnapshots: Array<Record<string, unknown>> = [];
    const languageCode = test.language?.code || test.course?.language?.code || null;
    const scoreOnlyAiFeedback = !includeAiFeedback;
    const aiInputs = test.questions
        .filter((question) => question.type === "ESSAY" || question.type === "SPEAKING")
        .map((question) => ({
          questionId: question.id,
          mode: question.type === "SPEAKING" ? "SPEAKING" as const : "WRITING" as const,
          answer: String(answers[question.id] || "").trim(),
          prompt: question.content,
          languageCode,
          scoreOnly: scoreOnlyAiFeedback,
        }))
        .filter((item) => item.answer);
    const feedbackMode = aiInputs.some((item) => item.mode === "SPEAKING")
      ? "SPEAKING"
      : aiInputs.some((item) => item.mode === "WRITING")
        ? "WRITING"
        : null;
    const feedbackCost =
      feedbackMode === "SPEAKING"
        ? SPEAKING_AI_COST
        : feedbackMode === "WRITING"
          ? WRITING_AI_COST
          : 0;
    const shouldChargeFeedback =
      includeAiFeedback &&
      feedbackCost > 0 &&
      shouldChargeAiPoints(user.role);

    if (shouldChargeFeedback) {
      const pointsBefore = await getAiPointsSummary(user.id);
      if (pointsBefore.available < feedbackCost) {
        return NextResponse.json(
          {
            error: `Vui lòng thanh toán lượt nhận xét AI trước khi sử dụng.`,
            requiresPointPurchase: true,
            neededPoints: feedbackCost,
            neededBeans: feedbackCost,
            currentPoints: pointsBefore.available,
            currentBeans: pointsBefore.available,
            pointPriceVnd: AI_POINT_PRICE_VND,
            beanPriceVnd: AI_POINT_PRICE_VND,
          },
          { status: 400 },
        );
      }

    }

    const aiResults = await evaluateTestAiAnswers(aiInputs);
    const failedAiResult = aiInputs
      .map((input) => aiResults.get(input.questionId))
      .find((result) => result?.failed);
    if (failedAiResult) {
      const invalidResponse = failedAiResult.failureReason === "invalid_response";
      return NextResponse.json(
        {
          error: invalidResponse
            ? "AI trả về kết quả chấm bài không hợp lệ. Bài test chưa được nộp, vui lòng thử lại."
            : "AI đang tạm thời không khả dụng. Bài test chưa được nộp, vui lòng thử lại.",
        },
        { status: invalidResponse ? 502 : 503 },
      );
    }

    for (const question of test.questions) {
      maxScore += question.score;
      const studentAnswer = answers[question.id];
      let studentAnswerDisplay = studentAnswer ? String(studentAnswer) : "";
      let isCorrect = false;
      let earnedScore = 0;
      let correctAnswer: string | null = null;
      let aiEvaluation: Record<string, unknown> | null = null;

      if (question.type === "MULTIPLE_CHOICE" || question.type === "TRUE_FALSE") {
        const selectedAnswer = question.answers.find((a) => a.id === studentAnswer);
        const correctAns = question.answers.find((a) => a.isCorrect);
        studentAnswerDisplay = selectedAnswer?.content ?? "";

        if (selectedAnswer && correctAns) {
          isCorrect = selectedAnswer.id === correctAns.id;
          correctAnswer = correctAns.content;
        }
      } else if (question.type === "FILL_IN_BLANK") {
        const correctAns = question.answers.find((a) => a.isCorrect);
        if (correctAns && studentAnswerDisplay.trim()) {
          isCorrect = studentAnswerDisplay.trim().toLowerCase() === correctAns.content.trim().toLowerCase();
          correctAnswer = correctAns.content;
        }
      } else if (question.type === "ESSAY") {
        correctAnswer = scoreOnlyAiFeedback ? "" : question.answers[0]?.content || "";
        if (studentAnswerDisplay.trim()) {
          const aiResult = aiResults.get(question.id);
          if (aiResult) {
            const scorePercentage = aiResult.normalizedScore / 10;
            earnedScore = Math.round(question.score * scorePercentage);
            isCorrect = isTestAiAnswerCorrect(aiResult);
            totalScore += earnedScore;
            aiEvaluation = aiResult.aiEvaluation;
          }
        }
      } else if (question.type === "SPEAKING") {
        if (studentAnswerDisplay.trim()) {
          const aiResult = aiResults.get(question.id);
          if (aiResult) {
            const scorePercentage = aiResult.normalizedScore / 10;
            earnedScore = Math.round(question.score * scorePercentage);
            isCorrect = isTestAiAnswerCorrect(aiResult);
            totalScore += earnedScore;
            aiEvaluation = aiResult.aiEvaluation;
          }
        }
      }

      if (isCorrect && question.type !== "ESSAY" && question.type !== "SPEAKING") {
        earnedScore = question.score;
        totalScore += question.score;
      }

      questionResults.push({
        questionId: question.id,
        questionType: question.type,
        content: question.content,
        studentAnswer: studentAnswerDisplay,
        rawAnswer: studentAnswer ?? null,
        correctAnswer,
        isCorrect,
        score: question.score,
        earnedScore,
        explanation:
          scoreOnlyAiFeedback &&
          (question.type === "ESSAY" || question.type === "SPEAKING")
            ? null
            : question.explanation,
        ...(aiEvaluation && { aiEvaluation }),
      });

      answerSnapshots.push({
        questionId: question.id,
        questionType: question.type,
        questionContent: question.content,
        rawAnswer: studentAnswer ?? null,
        studentAnswer: studentAnswerDisplay,
      });
    }

    const finalScore = maxScore > 0 ? (totalScore / maxScore) * FIXED_TEST_MAX_SCORE : 0;
    const isPassed = finalScore >= test.passingScore;

    if (isOwnerPreview) {
      const previewAttemptId = `preview-${Date.now()}`;
      const previewPointResult = shouldChargeFeedback
        ? await spendAiPoints(
            user.id,
            test.courseId ?? null,
            feedbackCost,
            feedbackMode === "SPEAKING" ? "SPEAKING_AI" : "WRITING_AI",
            `TEST_PREVIEW:${testId}:${Date.now()}`,
          )
        : { spent: 0, available: (await getAiPointsSummary(user.id)).available };

      return NextResponse.json({
        attemptId: previewAttemptId,
        score: finalScore,
        maxScore: FIXED_TEST_MAX_SCORE,
        passingScore: test.passingScore,
        isPassed,
        courseId: test.course?.id ?? null,
        courseName: test.course?.name ?? "Public practice",
        language: test.language ?? test.course?.language ?? null,
        courseCompleted: false,
        certificateSent: false,
        previewMode: true,
        totalQuestions: test.questions.length,
        correctAnswers: questionResults.filter((q) => q.isCorrect === true).length,
        questionResults,
        scoreOnlyAiFeedback,
        aiFeedbackPurchased: includeAiFeedback && aiInputs.length > 0,
        aiFeedbackCost: previewPointResult.spent,
        points: previewPointResult,
      });
    }

    const attemptCount = await prisma.testAttempt.count({
      where: { testId, userId: user.id },
    });
    const attemptNo = attemptCount + 1;

    const testAttempt = await prisma.testAttempt.create({
      data: {
        testId,
        userId: user.id,
        attemptNo,
        score: finalScore,
        maxScore: FIXED_TEST_MAX_SCORE,
        answers,
        results: {
          totalQuestions: test.questions.length,
          correctAnswers: questionResults.filter((q) => q.isCorrect === true).length,
          submittedAnswers: answerSnapshots,
          questionResults,
          scoreOnlyAiFeedback,
          aiFeedbackPurchased: includeAiFeedback && aiInputs.length > 0,
          aiFeedbackCost: shouldChargeFeedback ? feedbackCost : 0,
        },
        startedAt: new Date(tokenResult.payload.startedAt),
        submittedAt: new Date(),
        isPassed,
      } as never,
    }) as unknown as { id: string; attemptNo: number };

    const feedbackPointResult = shouldChargeFeedback
      ? await spendAiPoints(
          user.id,
          test.courseId ?? null,
          feedbackCost,
          feedbackMode === "SPEAKING" ? "SPEAKING_AI" : "WRITING_AI",
          `TEST_ATTEMPT:${testAttempt.id}`,
        )
      : { spent: 0, available: (await getAiPointsSummary(user.id)).available };

    await recordLearningActivity({
      userId: user.id,
      courseId: test.courseId ?? null,
      activityType: "PRACTICE_TEST",
      sourceId: testAttempt.id,
    });

    let courseCompleted = false;
    let certificateSent = false;

    if (isPassed && test.kind === "COURSE" && test.courseId && test.course) {
      await markCourseCompleted(user.id, test.courseId);
      courseCompleted = true;

      const alreadySent = await hasCertificateSent(user.id, test.courseId);
      if (!alreadySent) {
        await sendCourseCertificateEmail(user.email, user.username, test.course.name);
        await markCertificateSent(user.id, test.courseId);
        certificateSent = true;
      }
    }

    return NextResponse.json({
      attemptId: testAttempt.id,
      attemptNo: testAttempt.attemptNo,
      score: finalScore,
      maxScore: FIXED_TEST_MAX_SCORE,
      passingScore: test.passingScore,
      isPassed,
      courseId: test.course?.id ?? null,
      courseName: test.course?.name ?? "Public practice",
      language: test.language ?? test.course?.language ?? null,
      courseCompleted,
      certificateSent,
      totalQuestions: test.questions.length,
      correctAnswers: questionResults.filter((q) => q.isCorrect === true).length,
      questionResults,
      scoreOnlyAiFeedback,
      aiFeedbackPurchased: includeAiFeedback && aiInputs.length > 0,
      aiFeedbackCost: feedbackPointResult.spent,
      points: feedbackPointResult,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "INSUFFICIENT_POINTS") {
      return NextResponse.json(
        {
          error: "Thanh toán lượt nhận xét AI không hợp lệ hoặc đã được sử dụng.",
          requiresPointPurchase: true,
          pointPriceVnd: AI_POINT_PRICE_VND,
        },
        { status: 400 },
      );
    }
    console.error("Error submitting test:", error);
    return NextResponse.json({ error: "Failed to submit test" }, { status: 500 });
  }
}
