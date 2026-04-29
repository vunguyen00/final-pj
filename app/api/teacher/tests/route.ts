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

    const test = await prisma.test.create({
      data: {
        name,
        description: description || null,
        courseId,
        maxScore: maxScore ? parseFloat(maxScore) : 100,
        passingScore: passingScore ? parseFloat(passingScore) : 50,
        maxAttempts: maxAttempts || 3,
        timeLimit: timeLimit || null,
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
      { error: "Failed to create test" },
      { status: 500 }
    );
  }
}