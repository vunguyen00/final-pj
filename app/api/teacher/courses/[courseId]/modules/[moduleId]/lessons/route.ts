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

    const courseModule = await prisma.module.findUnique({
      where: { id: moduleId },
    });

    if (!courseModule || courseModule.courseId !== courseId) {
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

    const courseModule = await prisma.module.findUnique({
      where: { id: moduleId },
    });

    if (!courseModule || courseModule.courseId !== courseId) {
      return NextResponse.json(
        { error: "Module not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { title, content, videoUrl } = body;
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

    const lesson = await prisma.lesson.create({
      data: {
        moduleId,
        title,
        content,
        videoUrl: normalizedVideoUrl,
      },
    });

    // Update course lessons count
    await prisma.course.update({
      where: { id: courseId },
      data: {
        lessons: {
          increment: 1,
        },
      },
    });

    return NextResponse.json({ lesson }, { status: 201 });
  } catch (error) {
    console.error("Error creating lesson:", error);
    return NextResponse.json(
      { error: "Failed to create lesson" },
      { status: 500 }
    );
  }
}
