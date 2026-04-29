import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

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

    // Check permission
    if (user.role !== "ADMIN" && existingQuestion.test.course.instructorId !== user.id) {
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

    // Update question
    const question = await prisma.question.update({
      where: { id: questionId },
      data: {
        ...(type && { type }),
        ...(content && { content }),
        ...(order !== undefined && { order }),
        ...(score !== undefined && { score: parseFloat(score) }),
        ...(explanation !== undefined && { explanation }),
        ...(hint !== undefined && { hint }),
      },
      include: {
        answers: {
          orderBy: { order: "asc" },
        },
      },
    });

    // Update answers if provided
    if (answers && Array.isArray(answers)) {
      // Delete existing answers
      await prisma.answer.deleteMany({
        where: { questionId },
      });

      // Create new answers
      if (answers.length > 0) {
        await prisma.answer.createMany({
          data: answers.map((answer: any, index: number) => ({
            questionId,
            content: answer.content,
            isCorrect: answer.isCorrect || false,
            order: answer.order ?? index + 1,
            feedback: answer.feedback || null,
          })),
        });
      }
    }

    // Fetch updated question with answers
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

    // Check permission
    if (user.role !== "ADMIN" && existingQuestion.test.course.instructorId !== user.id) {
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