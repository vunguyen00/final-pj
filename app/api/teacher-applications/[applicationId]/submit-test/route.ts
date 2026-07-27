import { after, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ANTI_CHEAT_CONFIG } from "@/lib/teacher-anti-cheat";
import { processTeacherEntranceSubmission } from "@/lib/teacher-entrance-grading";
import { FIXED_TEST_MAX_SCORE, isTestReady } from "@/lib/test-rules";

function validSessionId(request: Request) {
  const value = request.headers.get("x-proctor-session-id")?.trim() ?? "";
  return /^[a-zA-Z0-9-]{16,100}$/.test(value) ? value : "";
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ applicationId: string }> },
) {
  try {
    const user = await requireUser();
    const { applicationId } = await params;
    const sessionId = validSessionId(request);
    if (!sessionId) {
      return NextResponse.json({ error: "Phiên giám sát không hợp lệ." }, { status: 400 });
    }

    const application = await prisma.teacherApplication.findUnique({
      where: { id: applicationId },
      include: {
        language: true,
        entranceTest: { select: { id: true } },
        questionInstances: { orderBy: { sequence: "asc" } },
      },
    });
    if (!application || application.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (application.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Bài test đã được nộp hoặc hồ sơ không còn ở trạng thái draft." },
        { status: 409 },
      );
    }
    if (!application.entranceTest) {
      return NextResponse.json({ error: "Hồ sơ không có bài test đầu vào." }, { status: 400 });
    }
    if (!application.startedAt) {
      return NextResponse.json(
        { error: "Phiên thi chưa được bắt đầu bằng camera và chế độ toàn màn hình." },
        { status: 409 },
      );
    }
    if (application.proctorSessionId !== sessionId) {
      return NextResponse.json(
        { error: "Phiên thi đang hoạt động ở tab hoặc thiết bị khác." },
        { status: 423 },
      );
    }

    const heartbeatAgeSeconds = application.proctorHeartbeatAt
      ? Math.floor((Date.now() - application.proctorHeartbeatAt.getTime()) / 1000)
      : Number.POSITIVE_INFINITY;
    if (heartbeatAgeSeconds > ANTI_CHEAT_CONFIG.heartbeatGapSeconds) {
      return NextResponse.json(
        { error: "Phiên giám sát bị gián đoạn. Vui lòng chờ hệ thống xác nhận trước khi nộp bài." },
        { status: 409 },
      );
    }
    if (
      !application.sequentialCompletedAt ||
      application.currentQuestionInstanceId ||
      application.questionInstances.length === 0 ||
      application.questionInstances.some(
        (item) => !["FINALIZED", "SKIPPED", "EXPIRED"].includes(item.status),
      )
    ) {
      return NextResponse.json(
        { error: "Bạn cần chốt tất cả câu hỏi trước khi nộp toàn bài." },
        { status: 409 },
      );
    }
    const unfinishedSpeaking = application.questionInstances.filter(
      (item) =>
        item.type === "SPEAKING" &&
        item.status !== "SKIPPED" &&
        Boolean(item.speakingAudioUrl) &&
        item.speakingMediaStatus !== "READY",
    );
    if (unfinishedSpeaking.length > 0) {
      return NextResponse.json(
        {
          error: "Audio Speaking vẫn đang được xử lý.",
          mediaPending: unfinishedSpeaking.filter(
            (item) => item.speakingMediaStatus !== "FAILED",
          ).length,
          mediaFailed: unfinishedSpeaking.filter(
            (item) => item.speakingMediaStatus === "FAILED",
          ).length,
        },
        { status: 409 },
      );
    }

    const rawMax = application.questionInstances.reduce(
      (sum, question) => sum + Number(question.score || 0),
      0,
    );
    if (!isTestReady(rawMax)) {
      return NextResponse.json(
        { error: `Bài test đầu vào chưa hợp lệ. Tổng điểm câu hỏi phải bằng ${FIXED_TEST_MAX_SCORE}.` },
        { status: 400 },
      );
    }

    const deadline = application.entranceTimeLimit
      ? application.startedAt.getTime() +
        (application.entranceTimeLimit * 60 + 15) * 1000
      : null;
    if (deadline && Date.now() > deadline) {
      await prisma.teacherApplication.updateMany({
        where: { id: application.id, status: "DRAFT" },
        data: { status: "EXPIRED" },
      });
      return NextResponse.json({ error: "Bài test đã quá thời gian cho phép." }, { status: 408 });
    }

    const claimed = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "TeacherApplication" WHERE "id" = ${application.id} FOR UPDATE`;
      const current = await tx.teacherApplication.findUnique({
        where: { id: application.id },
        select: {
          status: true,
          currentQuestionInstanceId: true,
          sequentialCompletedAt: true,
          proctorSessionId: true,
        },
      });
      if (
        current?.status !== "DRAFT" ||
        current.currentQuestionInstanceId ||
        !current.sequentialCompletedAt ||
        current.proctorSessionId !== sessionId
      ) {
        return false;
      }
      await tx.teacherApplication.update({
        where: { id: application.id },
        data: {
          status: "SUBMITTED",
          submittedAt: new Date(),
          failureReason: null,
        },
      });
      return true;
    });
    if (!claimed) {
      return NextResponse.json(
        { error: "Bài test đang được xử lý hoặc đã được nộp." },
        { status: 409 },
      );
    }
    after(() => processTeacherEntranceSubmission(application.id, user.id));
    return NextResponse.json(
      {
        accepted: true,
        applicationStatus: "SUBMITTED",
        message: "Đã nhận bài. Hệ thống đang chấm bài trong nền.",
      },
      { status: 202 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi hệ thống.";
    console.error("Unable to submit sequential teacher entrance test", { error });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
