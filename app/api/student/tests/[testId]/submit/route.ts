import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ testId: string }> }
) {
  try {
    const { testId } = await params;
    const user = await getCurrentUser();
    
    if (!user || user.role !== "STUDENT") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { answers } = body; // { questionId: answerId } or { questionId: content }

    // Get test with questions
    const test = await prisma.test.findUnique({
      where: { id: testId },
      include: {
        questions: {
          include: {
            answers: true,
          },
        },
      },
    });

    if (!test) {
      return NextResponse.json(
        { error: "Test not found" },
        { status: 404 }
      );
    }

    // Check enrollment
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: user.id,
          courseId: test.courseId,
        },
      },
    });

    if (!enrollment) {
      return NextResponse.json(
        { error: "Not enrolled in this course" },
        { status: 403 }
      );
    }

    // Check attempts remaining
    const attemptCount = await prisma.testAttempt.count({
      where: { testId, userId: user.id },
    });

    if (attemptCount >= test.maxAttempts) {
      return NextResponse.json(
        { error: "No attempts remaining" },
        { status: 403 }
      );
    }

    // Calculate score
    let totalScore = 0;
    let maxScore = 0;
    const questionResults: any[] = [];

    for (const question of test.questions) {
      maxScore += question.score;
      const studentAnswer = answers[question.id];
      let isCorrect = false;
      let earnedScore = 0;
      let correctAnswer = null;

      if (question.type === "MULTIPLE_CHOICE" || question.type === "TRUE_FALSE") {
        // Multiple choice: studentAnswer is answerId
        const selectedAnswer = question.answers.find(a => a.id === studentAnswer);
        const correctAns = question.answers.find(a => a.isCorrect);
        
        if (selectedAnswer && correctAns) {
          isCorrect = selectedAnswer.id === correctAns.id;
          correctAnswer = correctAns.content;
        }
      } else if (question.type === "FILL_IN_BLANK") {
        // Fill in blank: studentAnswer is string, compare ignoring case
        const correctAns = question.answers.find(a => a.isCorrect);
        if (correctAns && studentAnswer) {
          isCorrect = studentAnswer.toString().trim().toLowerCase() === correctAns.content.trim().toLowerCase();
          correctAnswer = correctAns.content;
        }
      } else if (question.type === "ESSAY") {
        // Essay: no auto-grading, mark as pending
        isCorrect = null;
        correctAnswer = question.answers[0]?.content || "";
      }

      if (isCorrect === true) {
        earnedScore = question.score;
        totalScore += question.score;
      }

      questionResults.push({
        questionId: question.id,
        questionType: question.type,
        content: question.content,
        studentAnswer: studentAnswer,
        correctAnswer: correctAnswer,
        isCorrect: isCorrect,
        score: question.score,
        earnedScore: earnedScore,
        explanation: question.explanation,
      });
    }

    // Calculate final score
    const finalScore = maxScore > 0 ? (totalScore / maxScore) * test.maxScore : 0;
    const isPassed = finalScore >= test.passingScore;

    // Create test attempt
    const testAttempt = await prisma.testAttempt.create({
      data: {
        testId,
        userId: user.id,
        score: finalScore,
        startedAt: new Date(Date.now() - (test.timeLimit ? test.timeLimit * 1000 : 0)),
        submittedAt: new Date(),
        isPassed: isPassed,
      },
    });

    // Store result in database for retrieval
    // The question results are returned to client for display
    // In a real app, you'd also store them in a separate table if needed

    return NextResponse.json({
      attemptId: testAttempt.id,
      score: finalScore,
      maxScore: test.maxScore,
      passingScore: test.passingScore,
      isPassed: isPassed,
      totalQuestions: test.questions.length,
      correctAnswers: questionResults.filter(q => q.isCorrect === true).length,
      questionResults,
    });
  } catch (error) {
    console.error("Error submitting test:", error);
    return NextResponse.json(
      { error: "Failed to submit test" },
      { status: 500 }
    );
  }
}