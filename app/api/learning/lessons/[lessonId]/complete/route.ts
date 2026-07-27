import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLessonStart, markCourseCompleted, markLessonCompleted } from "@/lib/learning-progress";
import { recordLearningActivity } from "@/lib/ai-points";
import {
  getCourseLearningGateState,
  getNextCourseLearningAction,
  isModuleUnlocked,
} from "@/lib/course-learning-gates";

const MIN_READING_SECONDS = 3 * 60;

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

    if (!lesson.videoUrl) {
      const start = await getLessonStart(user.id, courseId, lessonId);
      if (!start) {
        return NextResponse.json({ error: "Ban can bat dau hoc truoc." }, { status: 400 });
      }

      const elapsed = Math.floor((Date.now() - start.createdAt.getTime()) / 1000);
      if (elapsed < MIN_READING_SECONDS) {
        return NextResponse.json(
          { error: "Can hoc toi thieu 3 phut cho bai nay.", elapsedSeconds: elapsed },
          { status: 400 },
        );
      }
    } else {
      const watch = await prisma.videoWatchProgress.findUnique({
        where: { userId_lessonId: { userId: user.id, lessonId } },
      });
      const duration = watch?.durationSeconds ?? 0;
      const watchedSeconds = watch
        ? (Date.now() - watch.startedAt.getTime()) / 1000
        : 0;
      const heartbeatFresh = watch
        ? Date.now() - watch.lastHeartbeatAt.getTime() <= 15_000
        : false;
      const serverVerified = Boolean(
        watch &&
          !watch.seekViolation &&
          heartbeatFresh &&
          duration > 0 &&
          watch.lastPositionSeconds >= duration - 2 &&
          watchedSeconds >= duration * 0.9,
      );
      if (!serverVerified) {
        return NextResponse.json(
          { error: "Máy chủ chưa xác nhận bạn đã xem hết video liên tục và không tua." },
          { status: 400 },
        );
      }
      await prisma.videoWatchProgress.update({
        where: { id: watch!.id },
        data: { completedAt: new Date() },
      });
    }

    await markLessonCompleted(user.id, courseId, lessonId);
    await recordLearningActivity({
      userId: user.id,
      courseId,
      activityType: "LESSON",
      sourceId: lessonId,
    });

    const updatedGateState = !isAdmin && !isInstructor
      ? await getCourseLearningGateState(user.id, courseId)
      : null;
    if (updatedGateState?.courseComplete) {
      await markCourseCompleted(user.id, courseId);
    }

    return NextResponse.json({
      ok: true,
      nextAction: updatedGateState ? getNextCourseLearningAction(updatedGateState) : null,
    });
  } catch {
    return NextResponse.json({ error: "Lỗi hệ thống." }, { status: 500 });
  }
}
