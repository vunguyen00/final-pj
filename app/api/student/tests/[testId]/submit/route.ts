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
import { getAiPointsSummary, grantCourseCompletionPoints, recordLearningActivity } from "@/lib/ai-points";
import {
  evaluateTestAiAnswers,
  isTestAiAnswerCorrect,
} from "@/lib/test-ai-evaluation";
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
      return NextResponse.json({ error: `Bai test chua hop le. Tong diem cau hoi phai bang ${FIXED_TEST_MAX_SCORE}.` }, { status: 400 });
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

    let totalScore = 0;
    let maxScore = 0;
    const questionResults: Array<Record<string, unknown>> = [];
    const answerSnapshots: Array<Record<string, unknown>> = [];
    const languageCode = test.language?.code || test.course?.language?.code || null;
    const aiInputs = test.questions
        .filter((question) => question.type === "ESSAY" || question.type === "SPEAKING")
        .map((question) => ({
          questionId: question.id,
          mode: question.type === "SPEAKING" ? "SPEAKING" as const : "WRITING" as const,
          answer: String(answers[question.id] || "").trim(),
          prompt: question.content,
          languageCode,
        }))
        .filter((item) => item.answer);
    const aiResults = await evaluateTestAiAnswers(aiInputs);
    const failedAiResult = aiInputs
      .map((input) => aiResults.get(input.questionId))
      .find((result) => result?.failed);
    if (failedAiResult) {
      const invalidResponse = failedAiResult.failureReason === "invalid_response";
      return NextResponse.json(
        {
          error: invalidResponse
            ? "AI tra ve ket qua cham bai khong hop le. Bai test chua duoc nop, vui long thu lai."
            : "AI dang tam thoi khong kha dung. Bai test chua duoc nop, vui long thu lai.",
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
        correctAnswer = question.answers[0]?.content || "";
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
        explanation: question.explanation,
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
      return NextResponse.json({
        attemptId: previewAttemptId,
        score: finalScore,
        maxScore: FIXED_TEST_MAX_SCORE,
        passingScore: test.passingScore,
        isPassed,
        courseId: test.course?.id ?? null,
        courseName: test.course?.name ?? "Public practice",
        courseCompleted: false,
        certificateSent: false,
        previewMode: true,
        totalQuestions: test.questions.length,
        correctAnswers: questionResults.filter((q) => q.isCorrect === true).length,
        questionResults,
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
        },
        startedAt: new Date(
          Date.now() - (test.timeLimit ? test.timeLimit * 60 * 1000 : 0),
        ),
        submittedAt: new Date(),
        isPassed,
      } as never,
    }) as unknown as { id: string; attemptNo: number };

    await recordLearningActivity({
      userId: user.id,
      courseId: test.courseId ?? null,
      activityType: "PRACTICE_TEST",
      sourceId: testAttempt.id,
    });

    let courseCompleted = false;
    let certificateSent = false;
    let aiPointsAwarded = 0;

    if (isPassed && test.kind === "COURSE" && test.courseId && test.course) {
      await markCourseCompleted(user.id, test.courseId);
      courseCompleted = true;
      const pointResult = await grantCourseCompletionPoints(user.id, test.courseId);
      aiPointsAwarded = pointResult.points;

      const alreadySent = await hasCertificateSent(user.id, test.courseId);
      if (!alreadySent) {
        await sendCourseCertificateEmail(user.email, user.username, test.course.name);
        await markCertificateSent(user.id, test.courseId);
        certificateSent = true;
      }
    }

    const aiPoints = await getAiPointsSummary(user.id);

    return NextResponse.json({
      attemptId: testAttempt.id,
      attemptNo: testAttempt.attemptNo,
      score: finalScore,
      maxScore: FIXED_TEST_MAX_SCORE,
      passingScore: test.passingScore,
      isPassed,
      courseId: test.course?.id ?? null,
      courseName: test.course?.name ?? "Public practice",
      courseCompleted,
      certificateSent,
      aiPointsAwarded,
      aiPoints,
      totalQuestions: test.questions.length,
      correctAnswers: questionResults.filter((q) => q.isCorrect === true).length,
      questionResults,
    });
  } catch (error) {
    console.error("Error submitting test:", error);
    return NextResponse.json({ error: "Failed to submit test" }, { status: 500 });
  }
}
