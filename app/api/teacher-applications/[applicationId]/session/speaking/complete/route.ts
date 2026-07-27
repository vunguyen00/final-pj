import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyTeacherTransitionToken } from "@/lib/teacher-sequential-exam";

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
    const questionInstanceId =
      typeof body.questionInstanceId === "string" ? body.questionInstanceId : "";
    const processingToken =
      typeof body.processingToken === "string" ? body.processingToken : "";
    const failed = body.failed === true;
    const transcript =
      typeof body.transcript === "string" ? body.transcript.trim().slice(0, 50_000) : "";
    const processingError =
      typeof body.error === "string" ? body.error.trim().slice(0, 500) : "";
    if (
      !sessionId ||
      !questionInstanceId ||
      !processingToken ||
      (!failed && !transcript)
    ) {
      return NextResponse.json({ error: "INVALID_PROCESSING_RESULT" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "TeacherApplication" WHERE "id" = ${applicationId} FOR UPDATE`;
      const application = await tx.teacherApplication.findUnique({
        where: { id: applicationId },
        select: { userId: true, status: true, proctorSessionId: true },
      });
      if (!application || application.userId !== user.id) throw new Error("FORBIDDEN");
      if (
        !["DRAFT", "SUBMITTED"].includes(application.status) ||
        application.proctorSessionId !== sessionId
      ) {
        throw new Error("SESSION_NOT_ACTIVE");
      }
      const instance = await tx.teacherEntranceQuestionInstance.findFirst({
        where: { id: questionInstanceId, applicationId, type: "SPEAKING" },
      });
      if (!instance?.speakingProcessingTokenHash) {
        throw new Error("INVALID_PROCESSING_TOKEN");
      }
      if (
        !instance.speakingProcessingTokenExpiresAt ||
        instance.speakingProcessingTokenExpiresAt.getTime() < Date.now() ||
        !verifyTeacherTransitionToken(
          processingToken,
          instance.speakingProcessingTokenHash,
        )
      ) {
        throw new Error("INVALID_PROCESSING_TOKEN");
      }

      const shouldSetFinalAnswer = ["FINALIZED", "EXPIRED"].includes(instance.status);
      const updated = await tx.teacherEntranceQuestionInstance.update({
        where: { id: instance.id },
        data: failed
          ? {
              speakingMediaStatus: "FAILED",
              speakingProcessingError:
                processingError || "Không thể chuyển audio thành văn bản.",
              speakingProcessingTokenHash: null,
              speakingProcessingTokenExpiresAt: null,
            }
          : {
              speakingMediaStatus: "READY",
              speakingTranscript: transcript,
              speakingProcessingError: null,
              speakingProcessingTokenHash: null,
              speakingProcessingTokenExpiresAt: null,
              ...(shouldSetFinalAnswer && {
                finalAnswer: transcript,
                answerState: transcript,
              }),
            },
      });
      return {
        ok: true,
        status: updated.speakingMediaStatus,
      };
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const statuses: Record<string, number> = {
      FORBIDDEN: 403,
      SESSION_NOT_ACTIVE: 409,
      INVALID_PROCESSING_TOKEN: 409,
    };
    if (statuses[message]) {
      return NextResponse.json({ error: message }, { status: statuses[message] });
    }
    console.error("Unable to complete teacher speaking transcription", { error });
    return NextResponse.json({ error: "Không thể cập nhật transcript." }, { status: 500 });
  }
}
