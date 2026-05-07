import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const ALLOWED_TYPES = new Set(["MULTIPLE_CHOICE", "FILL_IN_BLANK", "ESSAY", "TRUE_FALSE"]);

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

    if (user.role !== "ADMIN" && test.course.instructorId !== user.id) {
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

    if (user.role !== "ADMIN" && test.course.instructorId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { type, content, audioUrl, hasListening, order, score, explanation, hint, answers } = body;

    if (!type || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(type)) {
      return NextResponse.json({ error: "Loại câu hỏi không hợp lệ" }, { status: 400 });
    }

    const parsedScore = score ? parseFloat(score) : 10;
    if (!Number.isFinite(parsedScore) || parsedScore <= 0) {
      return NextResponse.json({ error: "Điểm số phải lớn hơn 0" }, { status: 400 });
    }

    let finalAudioUrl: string | null = null;
    if (hasListening && !audioUrl?.trim()) {
      return NextResponse.json({ error: "Thiếu URL audio cho dạng nghe" }, { status: 400 });
    }

    if (hasListening && audioUrl?.trim()) {
      try {
        new URL(audioUrl);
        finalAudioUrl = audioUrl;
      } catch {
        return NextResponse.json({ error: "URL audio không hợp lệ" }, { status: 400 });
      }
    }

    if (answers && Array.isArray(answers)) {
      const hasEmptyAnswer = answers.some((a: any) => !a.content || !a.content.trim());
      if (hasEmptyAnswer) {
        return NextResponse.json({ error: "Tất cả đáp án phải có nội dung" }, { status: 400 });
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
        ...(answers && answers.length > 0 && {
          answers: {
            create: answers.map((answer: any, index: number) => ({
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

