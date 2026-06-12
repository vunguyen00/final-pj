import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { FIXED_TEST_MAX_SCORE, normalizeTestAssessmentMode, requiresLanguageForTest, type TestKind } from "@/lib/test-rules";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId");

    const whereClause =
      user.role === "ADMIN"
        ? courseId
          ? { courseId }
          : {}
        : {
            course: {
              instructorId: user.id,
              ...(courseId ? { id: courseId } : {}),
            },
            kind: "COURSE" as const,
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
    return NextResponse.json({ error: "Failed to fetch tests" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, courseId, languageId, passingScore, maxAttempts, timeLimit, shuffleQuestions } = body;
    const kind: TestKind = body.kind === "PUBLIC_PRACTICE" || body.kind === "TEACHER_ENTRANCE" ? body.kind : "COURSE";
    const assessmentMode = normalizeTestAssessmentMode(body.assessmentMode);

    if (!name || (kind === "COURSE" && !courseId)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (kind !== "COURSE" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Only admin can create public or teacher entrance tests" }, { status: 403 });
    }

    if (requiresLanguageForTest(kind) && !languageId) {
      return NextResponse.json({ error: "Language is required for this test" }, { status: 400 });
    }

    if (kind === "TEACHER_ENTRANCE" && assessmentMode === "STANDARD") {
      return NextResponse.json({ error: "Teacher entrance tests must use Writing AI or Speaking AI" }, { status: 400 });
    }

    const course = courseId
      ? await prisma.course.findUnique({
          where: { id: courseId },
          include: {
            _count: {
              select: { modules: true },
            },
          },
        })
      : null;

    if (kind === "COURSE") {
      if (!course) {
        return NextResponse.json({ error: "Course not found" }, { status: 404 });
      }

      if (user.role !== "ADMIN" && course.instructorId !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const existingTestCount = await prisma.test.count({
        where: { courseId },
      });

      if (existingTestCount > 0) {
        return NextResponse.json(
          { error: "Course already has a test. Each course can only have one test." },
          { status: 400 }
        );
      }

      if (course._count.modules === 0) {
        return NextResponse.json(
          { error: "Course must have at least one module before creating a test" },
          { status: 400 }
        );
      }
    }

    if (languageId) {
      const language = await prisma.learningLanguage.findFirst({
        where: { id: languageId, isActive: true },
        select: { id: true },
      });
      if (!language) {
        return NextResponse.json({ error: "Invalid language" }, { status: 400 });
      }
    }

    const parsedPassingScore = Number(passingScore ?? 50);
    const parsedMaxAttempts = Number(maxAttempts ?? 3);
    const parsedTimeLimit = timeLimit === null || timeLimit === undefined || timeLimit === "" ? null : Number(timeLimit);

    if (!Number.isFinite(parsedPassingScore) || parsedPassingScore < 0 || parsedPassingScore > FIXED_TEST_MAX_SCORE) {
      return NextResponse.json({ error: "Passing score must be between 0 and 100" }, { status: 400 });
    }

    if (!Number.isInteger(parsedMaxAttempts) || parsedMaxAttempts <= 0) {
      return NextResponse.json({ error: "Max attempts must be a positive integer" }, { status: 400 });
    }

    if (parsedTimeLimit !== null && (!Number.isInteger(parsedTimeLimit) || parsedTimeLimit <= 0)) {
      return NextResponse.json({ error: "Time limit must be a positive integer" }, { status: 400 });
    }

    const test = await prisma.test.create({
      data: {
        name,
        description: description || null,
        courseId: kind === "COURSE" ? courseId : null,
        languageId: languageId || null,
        assessmentMode,
        maxScore: FIXED_TEST_MAX_SCORE,
        passingScore: parsedPassingScore,
        maxAttempts: parsedMaxAttempts,
        timeLimit: parsedTimeLimit,
        shuffleQuestions: Boolean(shuffleQuestions),
        kind,
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
