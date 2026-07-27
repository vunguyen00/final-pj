import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createTeacherSpeakingProcessingToken } from "@/lib/teacher-sequential-exam";

function sessionIdFrom(request: Request) {
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
    const sessionId = sessionIdFrom(request);
    const body = await request.json().catch(() => ({}));
    const retryFailed = body.retryFailed === true;
    if (!sessionId) {
      return NextResponse.json({ error: "INVALID_PROCTOR_SESSION" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "TeacherApplication" WHERE "id" = ${applicationId} FOR UPDATE`;
      const application = await tx.teacherApplication.findUnique({
        where: { id: applicationId },
        select: {
          userId: true,
          status: true,
          proctorSessionId: true,
          language: { select: { code: true } },
        },
      });
      if (!application || application.userId !== user.id) throw new Error("FORBIDDEN");
      if (
        !["DRAFT", "SUBMITTED"].includes(application.status) ||
        application.proctorSessionId !== sessionId
      ) {
        throw new Error("SESSION_NOT_ACTIVE");
      }

      const statuses = retryFailed
        ? (["UPLOADED", "PROCESSING", "FAILED"] as const)
        : (["UPLOADED", "PROCESSING"] as const);
      const instances = await tx.teacherEntranceQuestionInstance.findMany({
        where: {
          applicationId,
          type: "SPEAKING",
          speakingMediaStatus: { in: [...statuses] },
          speakingAudioUrl: { not: null },
        },
        orderBy: { sequence: "asc" },
      });
      const jobs = [];
      for (const instance of instances) {
        const processing = createTeacherSpeakingProcessingToken();
        await tx.teacherEntranceQuestionInstance.update({
          where: { id: instance.id },
          data: {
            speakingMediaStatus: "PROCESSING",
            speakingProcessingTokenHash: processing.tokenHash,
            speakingProcessingTokenExpiresAt: processing.expiresAt,
            speakingProcessingError: null,
            speakingProcessingAttempts: { increment: 1 },
          },
        });
        jobs.push({
          questionInstanceId: instance.id,
          audioUrl: instance.speakingAudioUrl!,
          languageCode: application.language.code,
          processingToken: processing.token,
        });
      }
      const counts = await tx.teacherEntranceQuestionInstance.groupBy({
        by: ["speakingMediaStatus"],
        where: { applicationId, type: "SPEAKING" },
        _count: { _all: true },
      });
      return { jobs, counts };
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (message === "SESSION_NOT_ACTIVE") {
      return NextResponse.json({ error: "Phiên thi không còn hoạt động." }, { status: 409 });
    }
    console.error("Unable to load teacher speaking media jobs", { error });
    return NextResponse.json({ error: "Không thể tải tiến trình xử lý audio." }, { status: 500 });
  }
}
