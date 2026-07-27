import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  revealTeacherQuestionInstance,
  serializeTeacherQuestionInstance,
  teacherSequentialSummary,
  verifyTeacherTransitionToken,
} from "@/lib/teacher-sequential-exam";

function proctorSessionId(request: Request) {
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
    const sessionId = proctorSessionId(request);
    const body = await request.json().catch(() => ({}));
    const questionInstanceId =
      typeof body.questionInstanceId === "string" ? body.questionInstanceId : "";
    const transitionToken =
      typeof body.transitionToken === "string" ? body.transitionToken : "";
    const answer = typeof body.answer === "string" ? body.answer.slice(0, 100_000) : "";
    const revision = Number(body.revision);
    const skip = body.skip === true;

    if (
      !sessionId ||
      !questionInstanceId ||
      !transitionToken ||
      !Number.isSafeInteger(revision) ||
      revision < 0
    ) {
      return NextResponse.json({ error: "INVALID_FINALIZE_REQUEST" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "TeacherApplication" WHERE "id" = ${applicationId} FOR UPDATE`;
      const application = await tx.teacherApplication.findUnique({
        where: { id: applicationId },
        select: {
          userId: true,
          status: true,
          startedAt: true,
          proctorSessionId: true,
          currentQuestionInstanceId: true,
          entranceTimeLimit: true,
        },
      });
      if (!application || application.userId !== user.id) throw new Error("FORBIDDEN");
      if (application.status !== "DRAFT" || !application.startedAt) {
        throw new Error("SESSION_NOT_ACTIVE");
      }
      if (application.proctorSessionId !== sessionId) {
        throw new Error("SESSION_CONNECTION_MISMATCH");
      }
      if (application.currentQuestionInstanceId !== questionInstanceId) {
        throw new Error("QUESTION_NO_LONGER_AVAILABLE");
      }

      await tx.$queryRaw`SELECT "id" FROM "TeacherEntranceQuestionInstance" WHERE "id" = ${questionInstanceId} FOR UPDATE`;
      const instance = await tx.teacherEntranceQuestionInstance.findFirst({
        where: { id: questionInstanceId, applicationId },
      });
      if (!instance) throw new Error("QUESTION_NO_LONGER_AVAILABLE");
      if (!["REVEALED", "ANSWERING"].includes(instance.status)) {
        throw new Error("QUESTION_ALREADY_FINALIZED");
      }
      if (
        !instance.transitionTokenHash ||
        !instance.transitionTokenExpiresAt ||
        instance.transitionTokenExpiresAt.getTime() < Date.now() ||
        !verifyTeacherTransitionToken(
          transitionToken,
          instance.transitionTokenHash,
        )
      ) {
        throw new Error("INVALID_TRANSITION_TOKEN");
      }
      const expired = Boolean(
        instance.deadlineAt && instance.deadlineAt.getTime() <= Date.now(),
      );
      const globalExpired = Boolean(
        application.entranceTimeLimit &&
        application.startedAt.getTime() +
          application.entranceTimeLimit * 60 * 1000 <= Date.now(),
      );
      if (
        instance.type === "SPEAKING" &&
        !skip &&
        !expired &&
        !globalExpired &&
        (
          !instance.speakingAudioUrl ||
          instance.speakingMediaStatus === "NONE"
        )
      ) {
        throw new Error("SPEAKING_AUDIO_REQUIRED");
      }
      const canUseIncomingRevision =
        instance.type !== "SPEAKING" &&
        !expired &&
        revision > instance.answerRevision;
      const finalAnswer = skip
        ? null
        : instance.type === "SPEAKING"
          ? instance.speakingTranscript
        : canUseIncomingRevision
          ? answer
          : instance.answerState;
      const status = expired || globalExpired
        ? "EXPIRED"
        : skip
          ? "SKIPPED"
          : "FINALIZED";

      await tx.teacherEntranceQuestionInstance.update({
        where: { id: instance.id },
        data: {
          status: "FINALIZING",
          transitionTokenHash: null,
          transitionTokenExpiresAt: null,
        },
      });
      await tx.teacherEntranceQuestionInstance.update({
        where: { id: instance.id },
        data: {
          status,
          answerState: finalAnswer,
          answerRevision: canUseIncomingRevision
            ? revision
            : instance.answerRevision,
          finalAnswer,
          finalizedAt: new Date(),
        },
      });

      if (globalExpired) {
        const finalizedAt = new Date();
        await tx.teacherEntranceQuestionInstance.updateMany({
          where: { applicationId, status: "LOCKED" },
          data: { status: "EXPIRED", finalizedAt },
        });
        await tx.teacherApplication.update({
          where: { id: applicationId },
          data: {
            currentQuestionInstanceId: null,
            sequentialCompletedAt: finalizedAt,
          },
        });
        return {
          phase: "SUMMARY" as const,
          summary: await teacherSequentialSummary(tx, applicationId),
        };
      }

      const next = await tx.teacherEntranceQuestionInstance.findFirst({
        where: { applicationId, status: "LOCKED" },
        orderBy: { sequence: "asc" },
      });
      if (!next) {
        await tx.teacherApplication.update({
          where: { id: applicationId },
          data: {
            currentQuestionInstanceId: null,
            sequentialCompletedAt: new Date(),
          },
        });
        return {
          phase: "SUMMARY" as const,
          summary: await teacherSequentialSummary(tx, applicationId),
        };
      }

      const revealed = await revealTeacherQuestionInstance(tx, {
        applicationId,
        instanceId: next.id,
        startedAt: application.startedAt,
        entranceTimeLimit: application.entranceTimeLimit,
      });
      await tx.teacherApplication.update({
        where: { id: applicationId },
        data: { currentQuestionInstanceId: next.id },
      });
      return {
        phase: "QUESTION" as const,
        question: serializeTeacherQuestionInstance(
          revealed.instance,
          revealed.transitionToken,
        ),
        totalQuestions: await tx.teacherEntranceQuestionInstance.count({
          where: { applicationId },
        }),
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const statuses: Record<string, number> = {
      FORBIDDEN: 403,
      SESSION_NOT_ACTIVE: 409,
      SESSION_CONNECTION_MISMATCH: 423,
      QUESTION_NO_LONGER_AVAILABLE: 403,
      QUESTION_ALREADY_FINALIZED: 409,
      INVALID_TRANSITION_TOKEN: 409,
      SPEAKING_AUDIO_REQUIRED: 409,
    };
    if (statuses[message]) {
      return NextResponse.json({ error: message }, { status: statuses[message] });
    }
    console.error("Unable to finalize teacher entrance question", { error });
    return NextResponse.json({ error: "Không thể chốt câu trả lời." }, { status: 500 });
  }
}
