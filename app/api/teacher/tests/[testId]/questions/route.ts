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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ testId: string }> }
) {
  try {
    const { testId } = await params;
    const user = await getCurrentUser();

    if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const test = await prisma.test.findUnique({
      where: { id: testId },
      include: { course: true },
    });

    if (!test) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    // Allow if: user is ADMIN (any test), OR user is TEACHER and owns the course
    const canManage = user.role === "ADMIN" || test.course?.instructorId === user.id;
    if (!canManage) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const questions = await prisma.question.findMany({
      where: { testId },
      include: {
        answers: {
          orderBy: { order: "asc" },
        },
      },
      orderBy: { order: "asc" },
    });

    return NextResponse.json({ questions });
  } catch (error) {
    console.error("Error fetching questions:", error);
    return NextResponse.json({ error: "Failed to fetch questions" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ testId: string }> }
) {
  try {
    const { testId } = await params;
    const user = await getCurrentUser();

    if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const test = await prisma.test.findUnique({
      where: { id: testId },
      include: { course: true },
    });

    if (!test) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    // Allow if: user is ADMIN (any test), OR user is TEACHER and owns the course
    const canManage = user.role === "ADMIN" || test.course?.instructorId === user.id;
    if (!canManage) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { type, content, audioUrl, hasListening, order, score, explanation, hint, answers } = body;

    if (!type || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(type)) {
      return NextResponse.json({ error: "Loai cau hoi khong hop le" }, { status: 400 });
    }

    const parsedScore = score ? parseFloat(score) : 10;
    if (!Number.isFinite(parsedScore) || parsedScore <= 0) {
      return NextResponse.json({ error: "Diem so phai lon hon 0" }, { status: 400 });
    }

    const scoreAggregate = await prisma.question.aggregate({
      where: { testId },
      _sum: { score: true },
    });
    const nextTotalScore = Number(scoreAggregate._sum.score || 0) + parsedScore;
    if (nextTotalScore > FIXED_TEST_MAX_SCORE) {
      return NextResponse.json(
        { error: `Tong diem cau hoi khong duoc vuot ${FIXED_TEST_MAX_SCORE}` },
        { status: 400 }
      );
    }

    let finalAudioUrl: string | null = null;
    if (hasListening && !audioUrl?.trim()) {
      return NextResponse.json({ error: "Thieu URL audio cho dang nghe" }, { status: 400 });
    }

    if (type === "SPEAKING") {
      finalAudioUrl = null;
    } else if (hasListening && audioUrl?.trim()) {
      try {
        new URL(audioUrl);
        finalAudioUrl = audioUrl;
      } catch {
        return NextResponse.json({ error: "URL audio khong hop le" }, { status: 400 });
      }
    }

    const normalizedAnswers: QuestionAnswerInput[] = Array.isArray(answers) ? (answers as QuestionAnswerInput[]) : [];

    if (normalizedAnswers.length > 0) {
      const hasEmptyAnswer = normalizedAnswers.some((answer) => !answer.content || !answer.content.trim());
      if (hasEmptyAnswer) {
        return NextResponse.json({ error: "Tat ca dap an phai co noi dung" }, { status: 400 });
      }
    }

    const maxOrderQuestion = await prisma.question.findFirst({
      where: { testId },
      orderBy: { order: "desc" },
    });

    const newOrder = order ?? (maxOrderQuestion ? maxOrderQuestion.order + 1 : 1);

    const question = await prisma.question.create({
      data: {
        testId,
        type,
        content,
        audioUrl: finalAudioUrl,
        order: newOrder,
        score: parsedScore,
        explanation: explanation || null,
        hint: hint || null,
        ...(normalizedAnswers.length > 0 && type !== "SPEAKING" && {
          answers: {
            create: normalizedAnswers.map((answer, index) => ({
              content: answer.content,
              isCorrect: answer.isCorrect || false,
              order: answer.order ?? index + 1,
              feedback: answer.feedback || null,
            })),
          },
        }),
      },
      include: {
        answers: {
          orderBy: { order: "asc" },
        },
      },
    });

    return NextResponse.json({ question }, { status: 201 });
  } catch (error) {
    console.error("Error creating question:", error);
    return NextResponse.json(
      {
        error: "Failed to create question",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
