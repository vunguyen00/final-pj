import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLessonStart, markLessonCompleted } from "@/lib/learning-progress";

const MIN_READING_SECONDS = 10 * 60;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ lessonId: string }> },
) {
  try {
    const user = await requireRole("STUDENT");
    const { lessonId } = await params;
    const body = await request.json().catch(() => ({}));

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: {
        id: true,
        videoUrl: true,
        module: {
          select: {
            course: {
              select: { id: true },
            },
          },
        },
      },
    });

    if (!lesson) {
      return NextResponse.json({ error: "Khong tim thay bai hoc." }, { status: 404 });
    }

    const courseId = lesson.module.course.id;
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: user.id, courseId } },
    });

    if (!enrollment) {
      return NextResponse.json({ error: "Ban chua dang ky khoa hoc." }, { status: 403 });
    }

    if (!lesson.videoUrl) {
      const start = await getLessonStart(user.id, courseId, lessonId);
      if (!start) {
        return NextResponse.json({ error: "Ban can bat dau hoc truoc." }, { status: 400 });
      }

      const elapsed = Math.floor((Date.now() - start.createdAt.getTime()) / 1000);
      if (elapsed < MIN_READING_SECONDS) {
        return NextResponse.json(
          { error: "Can hoc toi thieu 10 phut cho bai nay.", elapsedSeconds: elapsed },
          { status: 400 },
        );
      }
    } else {
      const watchedFull = body?.watchedFull === true;
      const noSeek = body?.noSeek === true;
      if (!watchedFull || !noSeek) {
        return NextResponse.json(
          { error: "Bai co video yeu cau xem het va khong tua." },
          { status: 400 },
        );
      }
    }

    await markLessonCompleted(user.id, courseId, lessonId);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Loi he thong." }, { status: 500 });
  }
}
