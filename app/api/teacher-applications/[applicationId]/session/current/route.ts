import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  initializeTeacherQuestionInstances,
  revealTeacherQuestionInstance,
  rotateTeacherQuestionToken,
  serializeTeacherQuestionInstance,
  teacherSequentialSummary,
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
    if (!sessionId) {
      return NextResponse.json({ error: "INVALID_PROCTOR_SESSION" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "TeacherApplication" WHERE "id" = ${applicationId} FOR UPDATE`;
      let application = await tx.teacherApplication.findUnique({
        where: { id: applicationId },
        select: {
          userId: true,
          status: true,
          startedAt: true,
          proctorSessionId: true,
          currentQuestionInstanceId: true,
          sequentialCompletedAt: true,
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

      await initializeTeacherQuestionInstances(tx, applicationId);
      application = await tx.teacherApplication.findUniqueOrThrow({
        where: { id: applicationId },
        select: {
          userId: true,
          status: true,
          startedAt: true,
          proctorSessionId: true,
          currentQuestionInstanceId: true,
          sequentialCompletedAt: true,
          entranceTimeLimit: true,
        },
      });

      const globalDeadline = application.entranceTimeLimit
        ? application.startedAt!.getTime() +
          application.entranceTimeLimit * 60 * 1000
        : null;
      if (globalDeadline && Date.now() >= globalDeadline) {
        const finalizedAt = new Date();
        const activeInstances = await tx.teacherEntranceQuestionInstance.findMany({
          where: {
            applicationId,
            status: { in: ["REVEALED", "ANSWERING"] },
          },
          select: { id: true, answerState: true },
        });
        for (const activeInstance of activeInstances) {
          await tx.teacherEntranceQuestionInstance.update({
            where: { id: activeInstance.id },
            data: {
              status: "EXPIRED",
              finalAnswer: activeInstance.answerState,
              finalizedAt,
              transitionTokenHash: null,
              transitionTokenExpiresAt: null,
            },
          });
        }
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

      if (application.sequentialCompletedAt) {
        return {
          phase: "SUMMARY" as const,
          summary: await teacherSequentialSummary(tx, applicationId),
        };
      }

      let current = application.currentQuestionInstanceId
        ? await tx.teacherEntranceQuestionInstance.findFirst({
            where: {
              id: application.currentQuestionInstanceId,
              applicationId,
            },
          })
        : null;

      if (
        current &&
        (current.status === "REVEALED" || current.status === "ANSWERING") &&
        current.deadlineAt &&
        current.deadlineAt.getTime() <= Date.now()
      ) {
        await tx.teacherEntranceQuestionInstance.update({
          where: { id: current.id },
          data: {
            status: "EXPIRED",
            finalAnswer: current.answerState,
            finalizedAt: new Date(),
            transitionTokenHash: null,
            transitionTokenExpiresAt: null,
          },
        });
        current = null;
      }

      if (!current || !["REVEALED", "ANSWERING"].includes(current.status)) {
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
          startedAt: application.startedAt!,
          entranceTimeLimit: application.entranceTimeLimit,
        });
        await tx.teacherApplication.update({
          where: { id: applicationId },
          data: { currentQuestionInstanceId: next.id },
        });
        current = revealed.instance;
        return {
          phase: "QUESTION" as const,
          question: serializeTeacherQuestionInstance(
            current,
            revealed.transitionToken,
          ),
          totalQuestions: await tx.teacherEntranceQuestionInstance.count({
            where: { applicationId },
          }),
        };
      }

      const transitionToken = await rotateTeacherQuestionToken(
        tx,
        current,
        {
          startedAt: application.startedAt!,
          entranceTimeLimit: application.entranceTimeLimit,
        },
      );
      return {
        phase: "QUESTION" as const,
        question: serializeTeacherQuestionInstance(current, transitionToken),
        totalQuestions: await tx.teacherEntranceQuestionInstance.count({
          where: { applicationId },
        }),
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (message === "SESSION_CONNECTION_MISMATCH") {
      return NextResponse.json(
        { error: "Phiên thi đang hoạt động ở tab hoặc thiết bị khác." },
        { status: 423 },
      );
    }
    if (message === "SESSION_NOT_ACTIVE") {
      return NextResponse.json({ error: "Phiên thi không còn hoạt động." }, { status: 409 });
    }
    console.error("Unable to load current teacher entrance question", { error });
    return NextResponse.json({ error: "Không thể tải câu hỏi hiện tại." }, { status: 500 });
  }
}
