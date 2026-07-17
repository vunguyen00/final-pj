import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ lessonId: string }> },
) {
  const [user, { lessonId }, body] = await Promise.all([
    requireUser(),
    params,
    request.json().catch(() => ({})),
  ]);
  const position = Number(body.positionSeconds);
  const duration = Number(body.durationSeconds);
  if (!Number.isFinite(position) || position < 0 || !Number.isFinite(duration) || duration <= 0) {
    return NextResponse.json({ error: "Thời lượng video không hợp lệ." }, { status: 400 });
  }

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: {
      videoUrl: true,
      module: { select: { course: { select: { id: true, instructorId: true } } } },
    },
  });
  if (!lesson?.videoUrl) {
    return NextResponse.json({ error: "Không tìm thấy video bài học." }, { status: 404 });
  }

  const courseId = lesson.module.course.id;
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: user.id, courseId } },
    select: { id: true },
  });
  if (user.role !== "ADMIN" && lesson.module.course.instructorId !== user.id && !enrollment) {
    return NextResponse.json({ error: "Bạn chưa đăng ký khóa học." }, { status: 403 });
  }

  const now = new Date();
  const progress = await prisma.videoWatchProgress.findUnique({
    where: { userId_lessonId: { userId: user.id, lessonId } },
  });
  if (!progress) {
    return NextResponse.json({ error: "Bạn cần bắt đầu video trước." }, { status: 400 });
  }

  const elapsed = Math.max(0, (now.getTime() - progress.lastHeartbeatAt.getTime()) / 1000);
  const allowedPosition = progress.lastPositionSeconds + Math.max(3, elapsed * 1.5);
  const durationChanged = Boolean(
    progress.durationSeconds && Math.abs(progress.durationSeconds - duration) > 2,
  );
  const jumpedForward = position > allowedPosition;
  const seekViolation = progress.seekViolation || durationChanged || jumpedForward;

  const updated = await prisma.videoWatchProgress.update({
    where: { id: progress.id },
    data: {
      durationSeconds: duration,
      lastHeartbeatAt: now,
      seekViolation,
      lastPositionSeconds: jumpedForward
        ? progress.lastPositionSeconds
        : Math.max(progress.lastPositionSeconds, Math.min(position, duration)),
    },
  });

  return NextResponse.json({
    ok: true,
    acceptedPositionSeconds: updated.lastPositionSeconds,
    seekViolation: updated.seekViolation,
  });
}
