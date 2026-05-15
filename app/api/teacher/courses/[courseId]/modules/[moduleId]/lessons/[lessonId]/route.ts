import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { unlink } from "fs/promises";
import { join } from "path";

function getLocalVideoPath(videoUrl: string | null | undefined) {
  if (!videoUrl || !videoUrl.startsWith("/videos/")) return null;
  const fileName = videoUrl.replace("/videos/", "").trim();
  if (!fileName) return null;
  return join(process.cwd(), "public", "videos", fileName);
}

async function cleanupVideoIfUnused(videoUrl: string | null | undefined, excludeLessonId?: string) {
  if (!videoUrl) return;
  const inUseCount = await prisma.lesson.count({
    where: {
      videoUrl,
      ...(excludeLessonId ? { id: { not: excludeLessonId } } : {}),
    },
  });
  if (inUseCount > 0) return;

  const localPath = getLocalVideoPath(videoUrl);
  if (!localPath) return;

  try {
    await unlink(localPath);
  } catch {
    // Ignore when file was already removed or path is invalid.
  }
}

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

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
    });

    if (!lesson || lesson.moduleId !== moduleId) {
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

    const existingLesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
    });

    if (!existingLesson || existingLesson.moduleId !== moduleId) {
      return NextResponse.json(
        { error: "Lesson not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { title, content, videoUrl } = body;
    const nextVideoUrl = videoUrl !== undefined ? (videoUrl ? String(videoUrl) : null) : undefined;

    if (nextVideoUrl !== undefined && existingLesson.videoUrl && nextVideoUrl !== existingLesson.videoUrl) {
      await cleanupVideoIfUnused(existingLesson.videoUrl, lessonId);
    }

    const lesson = await prisma.lesson.update({
      where: { id: lessonId },
      data: {
        ...(title && { title }),
        ...(content && { content }),
        ...(nextVideoUrl !== undefined && { videoUrl: nextVideoUrl }),
      },
    });

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

    const existingLesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
    });

    if (!existingLesson || existingLesson.moduleId !== moduleId) {
      return NextResponse.json(
        { error: "Lesson not found" },
        { status: 404 }
      );
    }

    await cleanupVideoIfUnused(existingLesson.videoUrl, lessonId);

    await prisma.lesson.delete({
      where: { id: lessonId },
    });

    // Update course lessons count
    await prisma.course.update({
      where: { id: courseId },
      data: {
        lessons: {
          decrement: 1,
        },
      },
    });

    return NextResponse.json({ message: "Lesson deleted successfully" });
  } catch (error) {
    console.error("Error deleting lesson:", error);
    return NextResponse.json(
      { error: "Failed to delete lesson" },
      { status: 500 }
    );
  }
}
