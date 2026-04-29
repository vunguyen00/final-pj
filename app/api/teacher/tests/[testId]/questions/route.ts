import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ testId: string }> }
) {
  try {
    const { testId } = await params;
    const user = await getCurrentUser();
    
    if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const test = await prisma.test.findUnique({
      where: { id: testId },
      include: {
        course: true,
      },
    });

    if (!test) {
      return NextResponse.json(
        { error: "Test not found" },
        { status: 404 }
      );
    }

    // Check permission
    if (user.role !== "ADMIN" && test.course.instructorId !== user.id) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
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
    return NextResponse.json(
      { error: "Failed to fetch questions" },
      { status: 500 }
    );
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
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const test = await prisma.test.findUnique({
      where: { id: testId },
      include: {
        course: true,
      },
    });

    if (!test) {
      return NextResponse.json(
        { error: "Test not found" },
        { status: 404 }
      );
    }

    if (user.role !== "ADMIN" && test.course.instructorId !== user.id) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { 
      type, 
      content, 
      order, 
      score, 
      explanation, 
      hint,
      answers 
    } = body;

    if (!type || !content) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get max order
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
        order: newOrder,
        score: score ? parseFloat(score) : 10,
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
      { error: "Failed to create question" },
      { status: 500 }
    );
  }
}