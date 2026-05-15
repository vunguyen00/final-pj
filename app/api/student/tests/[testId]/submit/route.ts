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
import { getAiPointsSummary, grantCourseCompletionPoints } from "@/lib/ai-points";

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
    const { answers } = body;

    const test = await prisma.test.findUnique({
      where: { id: testId },
      include: {
        questions: {
          include: {
            answers: true,
          },
        },
        course: {
          select: { id: true, name: true, instructorId: true },
        },
      },
    });

    if (!test) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    const isOwnerPreview =
      (user.role === "TEACHER" || user.role === "ADMIN") && test.course.instructorId === user.id;

    if (!isOwnerPreview) {
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

      const attemptCount = await prisma.testAttempt.count({
        where: { testId, userId: user.id },
      });

      if (attemptCount >= test.maxAttempts) {
        return NextResponse.json({ error: "No attempts remaining" }, { status: 403 });
      }
    }

    let totalScore = 0;
    let maxScore = 0;
    const questionResults: Array<Record<string, unknown>> = [];

    for (const question of test.questions) {
      maxScore += question.score;
      const studentAnswer = answers[question.id];
      let isCorrect = false;
      let earnedScore = 0;
      let correctAnswer: string | null = null;

      if (question.type === "MULTIPLE_CHOICE" || question.type === "TRUE_FALSE") {
        const selectedAnswer = question.answers.find((a) => a.id === studentAnswer);
        const correctAns = question.answers.find((a) => a.isCorrect);

        if (selectedAnswer && correctAns) {
          isCorrect = selectedAnswer.id === correctAns.id;
          correctAnswer = correctAns.content;
        }
      } else if (question.type === "FILL_IN_BLANK") {
        const correctAns = question.answers.find((a) => a.isCorrect);
        if (correctAns && studentAnswer) {
          isCorrect =
            studentAnswer.toString().trim().toLowerCase() ===
            correctAns.content.trim().toLowerCase();
          correctAnswer = correctAns.content;
        }
      } else if (question.type === "ESSAY") {
        isCorrect = false;
        correctAnswer = question.answers[0]?.content || "";
      }

      if (isCorrect) {
        earnedScore = question.score;
        totalScore += question.score;
      }

      questionResults.push({
        questionId: question.id,
        questionType: question.type,
        content: question.content,
        studentAnswer,
        correctAnswer,
        isCorrect,
        score: question.score,
        earnedScore,
        explanation: question.explanation,
      });
    }

    const finalScore = maxScore > 0 ? (totalScore / maxScore) * test.maxScore : 0;
    const isPassed = finalScore >= test.passingScore;

    if (isOwnerPreview) {
      const previewAttemptId = `preview-${Date.now()}`;
      return NextResponse.json({
        attemptId: previewAttemptId,
        score: finalScore,
        maxScore: test.maxScore,
        passingScore: test.passingScore,
        isPassed,
        courseCompleted: false,
        certificateSent: false,
        previewMode: true,
        totalQuestions: test.questions.length,
        correctAnswers: questionResults.filter((q) => q.isCorrect === true).length,
        questionResults,
      });
    }

    const testAttempt = await prisma.testAttempt.create({
      data: {
        testId,
        userId: user.id,
        score: finalScore,
        startedAt: new Date(Date.now() - (test.timeLimit ? test.timeLimit * 1000 : 0)),
        submittedAt: new Date(),
        isPassed,
      },
    });

    let courseCompleted = false;
    let certificateSent = false;
    let aiPointsAwarded = 0;

    if (isPassed) {
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
      score: finalScore,
      maxScore: test.maxScore,
      passingScore: test.passingScore,
      isPassed,
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
