import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureLessonStart } from "@/lib/learning-progress";
import { getCourseLearningGateState, isModuleUnlocked } from "@/lib/course-learning-gates";

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
        videoUrl: true,
        module: {
          select: {
            id: true,
            course: {
              select: { id: true, instructorId: true },
            },
          },
        },
      },
    });

    if (!lesson) {
      return NextResponse.json({ error: "Không tìm thấy bài học." }, { status: 404 });
    }

    const courseId = lesson.module.course.id;
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: user.id, courseId } },
    });

    const isAdmin = user.role === "ADMIN";
    const isInstructor = lesson.module.course.instructorId === user.id;
    const canAccess = isAdmin || isInstructor || enrollment?.accessStatus === "ACTIVE";

    if (!canAccess) {
      return NextResponse.json(
        {
          error: enrollment?.accessStatus === "REFUND_PENDING"
            ? "Quyền học đang tạm khóa do yêu cầu hoàn tiền đang chờ xử lý."
            : "Bạn chưa đăng ký khóa học.",
        },
        { status: 403 },
      );
    }

    if (!isAdmin && !isInstructor) {
      const gateState = await getCourseLearningGateState(user.id, courseId);
      if (!gateState || !isModuleUnlocked(gateState, lesson.module.id)) {
        return NextResponse.json(
          { error: "Bạn cần hoàn thành bài kiểm tra của module trước để mở bài học này." },
          { status: 403 },
        );
      }
    }

    const start = await ensureLessonStart(user.id, courseId, lessonId);
    if (lesson.videoUrl) {
      await prisma.videoWatchProgress.upsert({
        where: { userId_lessonId: { userId: user.id, lessonId } },
        create: { userId: user.id, lessonId },
        update: {},
      });
    }

    return NextResponse.json({ ok: true, startedAt: start.createdAt });
  } catch {
    return NextResponse.json({ error: "Lỗi hệ thống." }, { status: 500 });
  }
}
