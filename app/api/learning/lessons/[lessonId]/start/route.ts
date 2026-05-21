import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureLessonStart } from "@/lib/learning-progress";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ lessonId: string }> },
) {
  try {
    const user = await requireUser();
    const { lessonId } = await params;

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: {
        id: true,
        module: {
          select: {
            course: {
              select: { id: true, instructorId: true },
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

    const isAdmin = user.role === "ADMIN";
    const isInstructor = lesson.module.course.instructorId === user.id;
    const canAccess = isAdmin || isInstructor || Boolean(enrollment);

    if (!canAccess) {
      return NextResponse.json({ error: "Ban chua dang ky khoa hoc." }, { status: 403 });
    }

    const start = await ensureLessonStart(user.id, courseId, lessonId);

    return NextResponse.json({ ok: true, startedAt: start.createdAt });
  } catch {
    return NextResponse.json({ error: "Loi he thong." }, { status: 500 });
  }
}
