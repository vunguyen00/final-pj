import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId");

    const whereClause = user.role === "ADMIN" 
      ? (courseId ? { courseId } : {})
      : { 
          course: {
            instructorId: user.id,
            ...(courseId ? { id: courseId } : {}),
          },
        };

    const tests = await prisma.test.findMany({
      where: whereClause,
      include: {
        course: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            attempts: true,
            questions: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ tests });
  } catch (error) {
    console.error("Error fetching tests:", error);
    return NextResponse.json(
      { error: "Failed to fetch tests" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { 
      name, 
      description, 
      courseId, 
      maxScore, 
      passingScore, 
      maxAttempts, 
      timeLimit,
      shuffleQuestions 
    } = body;

    if (!name || !courseId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify course ownership
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        _count: {
          select: { tests: true, modules: true }
        }
      }
    });

    if (!course) {
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 }
      );
    }

    if (user.role !== "ADMIN" && course.instructorId !== user.id) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    // Check if course already has a test
    if (course._count.tests > 0) {
      return NextResponse.json(
        { error: "Khóa học này đã có bài test. Mỗi khóa học chỉ được có 1 bài test cuối." },
        { status: 400 }
      );
    }

    // Check if course has modules
    if (course._count.modules === 0) {
      return NextResponse.json(
        { error: "Khóa học phải có ít nhất 1 module trước khi tạo bài test" },
        { status: 400 }
      );
    }

    const parsedMaxScore = Number(maxScore ?? 100);
    const parsedPassingScore = Number(passingScore ?? 50);
    const parsedMaxAttempts = Number(maxAttempts ?? 3);
    const parsedTimeLimit = timeLimit === null || timeLimit === undefined || timeLimit === ""
      ? null
      : Number(timeLimit);

    if (!Number.isFinite(parsedMaxScore) || parsedMaxScore <= 0) {
      return NextResponse.json(
        { error: "Điểm tối đa không hợp lệ" },
        { status: 400 }
      );
    }

    if (!Number.isFinite(parsedPassingScore) || parsedPassingScore < 0 || parsedPassingScore > parsedMaxScore) {
      return NextResponse.json(
        { error: "Điểm đạt phải từ 0 đến điểm tối đa" },
        { status: 400 }
      );
    }

    if (!Number.isInteger(parsedMaxAttempts) || parsedMaxAttempts <= 0) {
      return NextResponse.json(
        { error: "Số lần làm tối đa phải là số nguyên dương" },
        { status: 400 }
      );
    }

    if (parsedTimeLimit !== null && (!Number.isInteger(parsedTimeLimit) || parsedTimeLimit <= 0)) {
      return NextResponse.json(
        { error: "Thời gian làm bài phải là số nguyên dương" },
        { status: 400 }
      );
    }

    const test = await prisma.test.create({
      data: {
        name,
        description: description || null,
        courseId,
        maxScore: parsedMaxScore,
        passingScore: parsedPassingScore,
        maxAttempts: parsedMaxAttempts,
        timeLimit: parsedTimeLimit,
        shuffleQuestions: shuffleQuestions || false,
      },
      include: {
        course: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({ test }, { status: 201 });
  } catch (error) {
    console.error("Error creating test:", error);
    return NextResponse.json(
      {
        error: "Failed to create test",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
