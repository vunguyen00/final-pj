import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { normalizeLessonVideoUrl } from "@/lib/lesson-video";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string; moduleId: string }> }
) {
  try {
    const { courseId, moduleId } = await params;
    const user = await getCurrentUser();
    
    if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course || (user.role !== "ADMIN" && course.instructorId !== user.id)) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const courseModule = await prisma.module.findFirst({
      where: { id: moduleId, courseId },
    });

    if (!courseModule) {
      return NextResponse.json(
        { error: "Module not found" },
        { status: 404 }
      );
    }

    const lessons = await prisma.lesson.findMany({
      where: { moduleId },
      orderBy: { id: "asc" },
    });

    return NextResponse.json({ lessons });
  } catch (error) {
    console.error("Error fetching lessons:", error);
    return NextResponse.json(
      { error: "Failed to fetch lessons" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string; moduleId: string }> }
) {
  try {
    const { courseId, moduleId } = await params;
    const user = await getCurrentUser();
    
    if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course || (user.role !== "ADMIN" && course.instructorId !== user.id)) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const courseModule = await prisma.module.findFirst({
      where: { id: moduleId, courseId },
    });

    if (!courseModule) {
      return NextResponse.json(
        { error: "Module not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { videoUrl } = body;
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const content = typeof body.content === "string" ? body.content.trim() : "";
    const normalizedVideoUrl = normalizeLessonVideoUrl(videoUrl);

    if (!title || !content) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }
    if (videoUrl && !normalizedVideoUrl) {
      return NextResponse.json({ error: "Invalid video URL" }, { status: 400 });
    }

    const lesson = await prisma.$transaction(async (tx) => {
      const currentModule = await tx.module.findFirst({
        where: { id: moduleId, courseId },
        select: { id: true },
      });
      if (!currentModule) throw new Error("MODULE_NOT_FOUND");

      const [createdLesson] = await Promise.all([
        tx.lesson.create({
          data: { moduleId, title, content, videoUrl: normalizedVideoUrl },
        }),
        tx.course.update({
          where: { id: courseId },
          data: { lessons: { increment: 1 } },
        }),
      ]);
      return createdLesson;
    });

    return NextResponse.json({ lesson }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "MODULE_NOT_FOUND") {
      return NextResponse.json(
        { error: "Module not found. Please reload the course page." },
        { status: 404 },
      );
    }
    console.error("Error creating lesson:", error);
    return NextResponse.json(
      { error: "Failed to create lesson" },
      { status: 500 }
    );
  }
}
