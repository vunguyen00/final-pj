import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { normalizeLessonVideoUrl } from "@/lib/lesson-video";
import { cleanupLessonVideoIfUnused } from "@/lib/lesson-video-storage";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string; moduleId: string; lessonId: string }> }
) {
  try {
    const { courseId, moduleId, lessonId } = await params;
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

    const lesson = await prisma.lesson.findFirst({
      where: { id: lessonId, moduleId, module: { courseId } },
    });

    if (!lesson) {
      return NextResponse.json(
        { error: "Lesson not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ lesson });
  } catch (error) {
    console.error("Error fetching lesson:", error);
    return NextResponse.json(
      { error: "Failed to fetch lesson" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string; moduleId: string; lessonId: string }> }
) {
  try {
    const { courseId, moduleId, lessonId } = await params;
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

    const existingLesson = await prisma.lesson.findFirst({
      where: { id: lessonId, moduleId, module: { courseId } },
    });

    if (!existingLesson) {
      return NextResponse.json(
        { error: "Lesson not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { title, content, videoUrl } = body;
    const nextVideoUrl = videoUrl !== undefined ? normalizeLessonVideoUrl(videoUrl) : undefined;
    if (videoUrl && !nextVideoUrl) {
      return NextResponse.json({ error: "Invalid video URL" }, { status: 400 });
    }

    const lesson = await prisma.lesson.update({
      where: { id: lessonId },
      data: {
        ...(title && { title }),
        ...(content && { content }),
        ...(nextVideoUrl !== undefined && { videoUrl: nextVideoUrl }),
      },
    });

    if (nextVideoUrl !== undefined && existingLesson.videoUrl && nextVideoUrl !== existingLesson.videoUrl) {
      await cleanupLessonVideoIfUnused(existingLesson.videoUrl);
    }

    return NextResponse.json({ lesson });
  } catch (error) {
    console.error("Error updating lesson:", error);
    return NextResponse.json(
      { error: "Failed to update lesson" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string; moduleId: string; lessonId: string }> }
) {
  try {
    const { courseId, moduleId, lessonId } = await params;
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

    const existingLesson = await prisma.lesson.findFirst({
      where: { id: lessonId, moduleId, module: { courseId } },
    });

    if (!existingLesson) {
      return NextResponse.json(
        { error: "Lesson not found" },
        { status: 404 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.lesson.delete({ where: { id: lessonId } });
      const remainingLessons = await tx.lesson.count({
        where: { module: { courseId } },
      });
      await tx.course.update({
        where: { id: courseId },
        data: { lessons: remainingLessons },
      });
    });

    await cleanupLessonVideoIfUnused(existingLesson.videoUrl);

    return NextResponse.json({ message: "Lesson deleted successfully" });
  } catch (error) {
    console.error("Error deleting lesson:", error);
    return NextResponse.json(
      { error: "Failed to delete lesson" },
      { status: 500 }
    );
  }
}
