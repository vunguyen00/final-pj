import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function estimateLevel(score: number, maxScore: number) {
  const percent = maxScore > 0 ? (score / maxScore) * 100 : 0;
  if (percent >= 85) return "Advanced";
  if (percent >= 70) return "Upper Intermediate";
  if (percent >= 55) return "Intermediate";
  if (percent >= 40) return "Elementary";
  return "Beginner";
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ resultId: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "STUDENT" && user.role !== "TEACHER" && user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Bạn chưa đăng nhập." }, { status: 401 });
    }

    const { resultId } = await params;

    const aiAssessment = await prisma.aiAssessment.findUnique({
      where: { id: resultId },
      include: { course: { select: { id: true, name: true } } },
    });

    if (aiAssessment) {
      if (aiAssessment.userId !== user.id) {
        return NextResponse.json({ error: "Bạn không có quyền xem kết quả này." }, { status: 403 });
      }

      return NextResponse.json({
        id: aiAssessment.id,
        type: aiAssessment.type,
        title: aiAssessment.title || (aiAssessment.type === "SPEAKING" ? "Speaking AI" : "Writing AI"),
        course: aiAssessment.course,
        taskType: aiAssessment.taskType,
        score: aiAssessment.score,
        maxScore: aiAssessment.maxScore,
        band: {
          system: aiAssessment.bandSystem,
          level: aiAssessment.bandLevel,
          score: aiAssessment.bandScore,
        },
        criteria: aiAssessment.criteria,
        feedback: aiAssessment.feedback,
        mistakes: aiAssessment.mistakes,
        improvements: aiAssessment.improvements,
        sampleAnswer: aiAssessment.sampleAnswer,
        prompt: aiAssessment.prompt,
        submissionText: aiAssessment.submissionText,
        audioUrl: aiAssessment.audioUrl,
        durationSeconds: aiAssessment.durationSeconds,
        createdAt: aiAssessment.createdAt,
        updatedAt: aiAssessment.updatedAt,
        submittedAt: aiAssessment.submittedAt,
      });
    }

    const attempt = await prisma.testAttempt.findUnique({
      where: { id: resultId },
      include: {
        test: {
          include: {
            course: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!attempt) {
      return NextResponse.json({ error: "Không tìm thấy kết quả." }, { status: 404 });
    }

    if (attempt.userId !== user.id) {
      return NextResponse.json({ error: "Bạn không có quyền xem kết quả này." }, { status: 403 });
    }

    const stored = (attempt.results ?? {}) as Record<string, unknown>;
    const durationSeconds = Math.max(0, Math.round((attempt.submittedAt.getTime() - attempt.startedAt.getTime()) / 1000));

    return NextResponse.json({
      id: attempt.id,
      type: "TEST",
      title: attempt.test.name,
      course: attempt.test.course,
      score: attempt.score,
      maxScore: attempt.maxScore,
      passingScore: attempt.test.passingScore,
      isPassed: attempt.isPassed,
      band: {
        system: "GENERAL",
        level: estimateLevel(attempt.score, attempt.maxScore),
        score: attempt.score,
      },
      criteria: {
        totalQuestions: Number(stored.totalQuestions ?? 0),
        correctAnswers: Number(stored.correctAnswers ?? 0),
      },
      feedback: {
        summary: attempt.isPassed ? "Bạn đã đạt bài test." : "Bạn cần ôn lại các kỹ năng còn yếu.",
        questionResults: Array.isArray(stored.questionResults) ? stored.questionResults : [],
      },
      mistakes: {
        wrongAnswers: Array.isArray(stored.questionResults)
          ? stored.questionResults.filter((item) => (item as Record<string, unknown>).isCorrect === false)
          : [],
      },
      improvements: {
        suggestions: [
          "Xem lại các câu sai và đọc phần giải thích.",
          "Làm lại bài sau khi ôn tập các kỹ năng còn yếu.",
          "Theo dõi lịch sử kết quả để đánh giá tiến bộ theo thời gian.",
        ],
      },
      durationSeconds,
      submittedAt: attempt.submittedAt,
      testId: attempt.testId,
    });
  } catch (error) {
    console.error("Error fetching result detail:", error);
    return NextResponse.json({ error: "Không tải được chi tiết kết quả." }, { status: 500 });
  }
}
