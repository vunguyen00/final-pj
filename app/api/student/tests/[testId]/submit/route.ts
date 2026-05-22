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
import { scoringService } from "@/lib/ai";

/**
 * Evaluates ESSAY type answers using AI
 */
async function evaluateEssayWithAI(essayText: string, taskPrompt?: string): Promise<{
  aiScore: number;
  language: string;
  band: {
    system: string;
    level: string;
    score: number;
    rationale: string;
  };
  taskRequirements: {
    promptUnderstanding: string;
    addressedPoints: string[];
    missingPoints: string[];
  };
  writingStructure?: Record<string, unknown> | null;
  feedback: {
    summary: string;
    strengths: string[];
    weaknesses: string[];
    feedback: string[];
    suggestions: string[];
    corrections: Array<{
      original: string;
      improved: string;
      reason: string;
    }>;
  };
}> {
  try {
    const evaluation = await scoringService.evaluateEssay({ essay: essayText, taskPrompt });

    return {
      aiScore: evaluation?.overall ?? 0,
      language: evaluation?.language ?? "Unknown",
      band: evaluation?.band ?? {
        system: "GENERAL",
        level: "Unknown",
        score: evaluation?.overall ?? 0,
        rationale: "",
      },
      taskRequirements: {
        promptUnderstanding: evaluation.task_requirements?.prompt_understanding ?? "",
        addressedPoints: evaluation.task_requirements?.addressed_points ?? [],
        missingPoints: evaluation.task_requirements?.missing_points ?? [],
      },
      feedback: {
        summary: evaluation?.summary ?? "",
        strengths: evaluation.strengths ?? [],
        weaknesses: evaluation.weaknesses ?? [],
        feedback: evaluation.feedback ?? [],
        suggestions: evaluation.suggestions ?? [],
        corrections: evaluation.corrections ?? [],
      },
      writingStructure: evaluation.writing_structure ?? null,
    };
  } catch (error) {
    console.error("Error evaluating essay with AI:", error);
    return {
      aiScore: 0,
      language: "Unknown",
      band: { system: "GENERAL", level: "Unknown", score: 0, rationale: "AI error" },
      taskRequirements: {
        promptUnderstanding: "",
        addressedPoints: [],
        missingPoints: [],
      },
      feedback: {
        summary: "Could not evaluate essay",
        strengths: [],
        weaknesses: [],
        feedback: [],
        suggestions: [],
        corrections: [],
      },
      writingStructure: null,
    };
  }
}

function bandScoreToTenScale(system: string, bandScore: number): number {
  if (!Number.isFinite(bandScore)) return 0;
  if (system === "HSK") return Math.max(0, Math.min(10, (bandScore / 6) * 10));
  return Math.max(0, Math.min(10, bandScore));
}

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

    }

    let totalScore = 0;
    let maxScore = 0;
    const questionResults: Array<Record<string, unknown>> = [];

    for (const question of test.questions) {
      maxScore += question.score;
      const studentAnswer = answers[question.id];
      let studentAnswerDisplay = "";
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
        studentAnswerDisplay = studentAnswer ? studentAnswer.toString() : "";
        const correctAns = question.answers.find((a) => a.isCorrect);
        if (correctAns && studentAnswer) {
          isCorrect =
            studentAnswer.toString().trim().toLowerCase() ===
            correctAns.content.trim().toLowerCase();
          correctAnswer = correctAns.content;
        }
      } else if (question.type === "ESSAY") {
        studentAnswerDisplay = studentAnswer ? studentAnswer.toString() : "";
        correctAnswer = question.answers[0]?.content || "";

        // Evaluate ESSAY with AI if student provided an answer
        if (studentAnswer && studentAnswerDisplay.trim().length > 0) {
          const aiResult = await evaluateEssayWithAI(studentAnswerDisplay, question.content);
          
          // Convert AI band to 10-scale, then map to question score.
          const scaledBand = bandScoreToTenScale(aiResult.band.system, aiResult.band.score);
          const scorePercentage = scaledBand / 10;
          earnedScore = Math.round(question.score * scorePercentage);
          
          // Mark as "correct" if score is 70% or higher
          isCorrect = scaledBand >= 7;
          totalScore += earnedScore;

          aiEvaluation = {
            language: aiResult.language,
            overallScore: aiResult.aiScore,
            band: aiResult.band,
            taskRequirements: aiResult.taskRequirements,
            writingStructure: aiResult.writingStructure ?? null,
            summary: aiResult.feedback.summary,
            strengths: aiResult.feedback.strengths,
            weaknesses: aiResult.feedback.weaknesses,
            feedback: aiResult.feedback.feedback,
            suggestions: aiResult.feedback.suggestions,
            corrections: aiResult.feedback.corrections,
          };
        } else {
          // No answer provided
          isCorrect = false;
          earnedScore = 0;
        }
      }

      if (isCorrect && question.type !== "ESSAY") {
        earnedScore = question.score;
        totalScore += question.score;
      }

      questionResults.push({
        questionId: question.id,
        questionType: question.type,
        content: question.content,
        studentAnswer: studentAnswerDisplay,
        correctAnswer,
        isCorrect,
        score: question.score,
        earnedScore,
        explanation: question.explanation,
        ...(aiEvaluation && { aiEvaluation }),
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
        maxScore: test.maxScore,
        answers,
        results: {
          totalQuestions: test.questions.length,
          correctAnswers: questionResults.filter((q) => q.isCorrect === true).length,
          questionResults,
        },
        startedAt: new Date(Date.now() - (test.timeLimit ? test.timeLimit * 1000 : 0)),
        submittedAt: new Date(),
        isPassed,
      } as never,
    }) as unknown as { id: string; attemptNo: number };

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
      attemptNo: testAttempt.attemptNo,
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
