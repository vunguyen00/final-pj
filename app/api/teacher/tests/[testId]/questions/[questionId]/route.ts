import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { FIXED_TEST_MAX_SCORE } from "@/lib/test-rules";

const ALLOWED_TYPES = new Set(["MULTIPLE_CHOICE", "FILL_IN_BLANK", "ESSAY", "TRUE_FALSE", "SPEAKING"]);

type QuestionAnswerInput = {
  content: string;
  isCorrect?: boolean;
  order?: number;
  feedback?: string | null;
};

function isValidAudioUrl(value: string) {
  if (value.startsWith("/uploads/question-audio/")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ testId: string; questionId: string }> }
) {
  try {
    const { testId, questionId } = await params;
    const user = await getCurrentUser();

    if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: {
        answers: {
          orderBy: { order: "asc" },
        },
      },
    });

    if (!question || question.testId !== testId) {
      return NextResponse.json(
        { error: "Question not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ question });
  } catch (error) {
    console.error("Error fetching question:", error);
    return NextResponse.json(
      { error: "Failed to fetch question" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ testId: string; questionId: string }> }
) {
  try {
    const { testId, questionId } = await params;
    const user = await getCurrentUser();

    if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const existingQuestion = await prisma.question.findUnique({
      where: { id: questionId },
      include: {
        test: {
          include: {
            course: true,
          },
        },
      },
    });

    if (!existingQuestion || existingQuestion.testId !== testId) {
      return NextResponse.json(
        { error: "Question not found" },
        { status: 404 }
      );
    }

    if (user.role !== "ADMIN" && existingQuestion.test.course?.instructorId !== user.id) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { type, content, audioUrl, hasListening, order, score, explanation, hint, answers } = body;

    const nextType = type ?? existingQuestion.type;
    const nextHasListening = hasListening ?? Boolean(existingQuestion.audioUrl);

    if (!ALLOWED_TYPES.has(nextType)) {
      return NextResponse.json({ error: "Loai cau hoi khong hop le" }, { status: 400 });
    }

    let parsedScore = existingQuestion.score;
    if (score !== undefined) {
      parsedScore = parseFloat(score);
      if (!Number.isFinite(parsedScore) || parsedScore <= 0) {
        return NextResponse.json(
          { error: "Diem so phai lon hon 0" },
          { status: 400 }
        );
      }
    }

    const scoreAggregate = await prisma.question.aggregate({
      where: { testId },
      _sum: { score: true },
    });
    const currentTotal = Number(scoreAggregate._sum.score || 0);
    const nextTotalScore = currentTotal - Number(existingQuestion.score || 0) + parsedScore;
    if (nextTotalScore > FIXED_TEST_MAX_SCORE) {
      return NextResponse.json(
        { error: `Tong diem cau hoi khong duoc vuot ${FIXED_TEST_MAX_SCORE}` },
        { status: 400 }
      );
    }

    const audioUrlWasProvided = audioUrl !== undefined;
    const trimmedAudioUrl = typeof audioUrl === "string" ? audioUrl.trim() : "";
    const effectiveAudioUrl =
      trimmedAudioUrl || (!audioUrlWasProvided ? existingQuestion.audioUrl || "" : "");
    let finalAudioUrl: string | null | undefined = audioUrlWasProvided ? trimmedAudioUrl : undefined;
    if (nextType === "SPEAKING") {
      finalAudioUrl = null;
    } else if (nextHasListening) {
      if (!effectiveAudioUrl) {
        return NextResponse.json(
          { error: "Thieu URL audio cho dang nghe" },
          { status: 400 }
        );
      }
      if (!isValidAudioUrl(effectiveAudioUrl)) {
        return NextResponse.json(
          { error: "URL audio khong hop le" },
          { status: 400 }
        );
      }
      finalAudioUrl = audioUrlWasProvided ? effectiveAudioUrl : undefined;
    } else if (!nextHasListening) {
      finalAudioUrl = null;
    }

    const normalizedAnswers: QuestionAnswerInput[] = Array.isArray(answers) ? (answers as QuestionAnswerInput[]) : [];

    if (normalizedAnswers.length > 0) {
      const hasEmptyAnswer = normalizedAnswers.some((answer) => !answer.content || !answer.content.trim());
      if (hasEmptyAnswer) {
        return NextResponse.json(
          { error: "Tat ca dap an phai co noi dung" },
          { status: 400 }
        );
      }
    }

    await prisma.question.update({
      where: { id: questionId },
      data: {
        ...(type && { type }),
        ...(content && { content }),
        ...(finalAudioUrl !== undefined && { audioUrl: finalAudioUrl }),
        ...(order !== undefined && { order }),
        ...(score !== undefined && { score: parsedScore }),
        ...(explanation !== undefined && { explanation }),
        ...(hint !== undefined && { hint }),
      },
    });

    if (Array.isArray(answers)) {
      await prisma.answer.deleteMany({
        where: { questionId },
      });

      if (normalizedAnswers.length > 0 && nextType !== "SPEAKING") {
        await prisma.answer.createMany({
          data: normalizedAnswers.map((answer, index) => ({
            questionId,
            content: answer.content,
            isCorrect: answer.isCorrect || false,
            order: answer.order ?? index + 1,
            feedback: answer.feedback || null,
          })),
        });
      }
    }

    const updatedQuestion = await prisma.question.findUnique({
      where: { id: questionId },
      include: {
        answers: {
          orderBy: { order: "asc" },
        },
      },
    });

    return NextResponse.json({ question: updatedQuestion });
  } catch (error) {
    console.error("Error updating question:", error);
    return NextResponse.json(
      { error: "Failed to update question" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ testId: string; questionId: string }> }
) {
  try {
    const { testId, questionId } = await params;
    const user = await getCurrentUser();

    if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const existingQuestion = await prisma.question.findUnique({
      where: { id: questionId },
      include: {
        test: {
          include: {
            course: true,
          },
        },
      },
    });

    if (!existingQuestion || existingQuestion.testId !== testId) {
      return NextResponse.json(
        { error: "Question not found" },
        { status: 404 }
      );
    }

    if (user.role !== "ADMIN" && existingQuestion.test.course?.instructorId !== user.id) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    await prisma.question.delete({
      where: { id: questionId },
    });

    return NextResponse.json({ message: "Question deleted successfully" });
  } catch (error) {
    console.error("Error deleting question:", error);
    return NextResponse.json(
      { error: "Failed to delete question" },
      { status: 500 }
    );
  }
}
