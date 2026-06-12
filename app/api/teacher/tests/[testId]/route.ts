import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { FIXED_TEST_MAX_SCORE } from "@/lib/test-rules";

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
        course: {
          include: {
            language: {
              select: { id: true, name: true, code: true },
            },
          },
        },
        language: {
          select: { id: true, name: true, code: true },
        },
        questions: {
          include: {
            answers: {
              orderBy: { order: "asc" },
            },
          },
          orderBy: { order: "asc" },
        },
        _count: {
          select: {
            attempts: true,
            questions: true,
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

    if (user.role !== "ADMIN" && test.course?.instructorId !== user.id) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    return NextResponse.json({ test });
  } catch (error) {
    console.error("Error fetching test:", error);
    return NextResponse.json(
      { error: "Failed to fetch test" },
      { status: 500 }
    );
  }
}

export async function PUT(
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

    const existingTest = await prisma.test.findUnique({
      where: { id: testId },
      include: {
        course: true,
      },
    });

    if (!existingTest) {
      return NextResponse.json(
        { error: "Test not found" },
        { status: 404 }
      );
    }

    if (user.role !== "ADMIN" && existingTest.course?.instructorId !== user.id) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, passingScore, maxAttempts, timeLimit, shuffleQuestions } = body;

    if (name !== undefined && !String(name).trim()) {
      return NextResponse.json({ error: "Test name is required" }, { status: 400 });
    }

    if (passingScore !== undefined) {
      const parsedPassingScore = Number(passingScore);
      if (!Number.isFinite(parsedPassingScore) || parsedPassingScore < 0 || parsedPassingScore > FIXED_TEST_MAX_SCORE) {
        return NextResponse.json({ error: "Passing score must be between 0 and 100" }, { status: 400 });
      }
    }

    if (maxAttempts !== undefined) {
      const parsedMaxAttempts = Number(maxAttempts);
      if (!Number.isInteger(parsedMaxAttempts) || parsedMaxAttempts <= 0) {
        return NextResponse.json({ error: "Max attempts must be a positive integer" }, { status: 400 });
      }
    }

    if (timeLimit !== undefined && timeLimit !== null && timeLimit !== "") {
      const parsedTimeLimit = Number(timeLimit);
      if (!Number.isInteger(parsedTimeLimit) || parsedTimeLimit <= 0) {
        return NextResponse.json({ error: "Time limit must be a positive integer" }, { status: 400 });
      }
    }

    const test = await prisma.test.update({
      where: { id: testId },
      data: {
        ...(name !== undefined && { name: String(name).trim() }),
        ...(description !== undefined && { description }),
        maxScore: FIXED_TEST_MAX_SCORE,
        ...(passingScore !== undefined && { passingScore: parseFloat(passingScore) }),
        ...(maxAttempts !== undefined && { maxAttempts: Number(maxAttempts) }),
        ...(timeLimit !== undefined && { timeLimit: timeLimit ? Number(timeLimit) : null }),
        ...(shuffleQuestions !== undefined && { shuffleQuestions }),
      },
    });

    return NextResponse.json({ test });
  } catch (error) {
    console.error("Error updating test:", error);
    return NextResponse.json(
      { error: "Failed to update test" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    const existingTest = await prisma.test.findUnique({
      where: { id: testId },
      include: {
        course: true,
      },
    });

    if (!existingTest) {
      return NextResponse.json(
        { error: "Test not found" },
        { status: 404 }
      );
    }

    if (user.role !== "ADMIN" && existingTest.course?.instructorId !== user.id) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    await prisma.test.delete({
      where: { id: testId },
    });

    return NextResponse.json({ message: "Test deleted successfully" });
  } catch (error) {
    console.error("Error deleting test:", error);
    return NextResponse.json(
      { error: "Failed to delete test" },
      { status: 500 }
    );
  }
}
