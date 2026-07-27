import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyTeacherTransitionToken } from "@/lib/teacher-sequential-exam";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ applicationId: string }> },
) {
  try {
    const user = await requireUser();
    const { applicationId } = await params;
    const body = await request.json().catch(() => ({}));
    const sessionId = request.headers.get("x-proctor-session-id")?.trim() ?? "";
    const questionInstanceId =
      typeof body.questionInstanceId === "string" ? body.questionInstanceId : "";
    const transitionToken =
      typeof body.transitionToken === "string" ? body.transitionToken : "";
    const answer = typeof body.answer === "string" ? body.answer.slice(0, 100_000) : "";
    const revision = Number(body.revision);

    if (
      !/^[a-zA-Z0-9-]{16,100}$/.test(sessionId) ||
      !questionInstanceId ||
      !transitionToken ||
      !Number.isSafeInteger(revision) ||
      revision < 1
    ) {
      return NextResponse.json({ error: "INVALID_AUTOSAVE_REQUEST" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "TeacherApplication" WHERE "id" = ${applicationId} FOR UPDATE`;
      const application = await tx.teacherApplication.findUnique({
        where: { id: applicationId },
        select: {
          userId: true,
          status: true,
          proctorSessionId: true,
          currentQuestionInstanceId: true,
        },
      });
      if (!application || application.userId !== user.id) throw new Error("FORBIDDEN");
      if (
        application.status !== "DRAFT" ||
        application.proctorSessionId !== sessionId
      ) {
        throw new Error("SESSION_NOT_ACTIVE");
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
        !verifyTeacherTransitionToken(
          transitionToken,
          instance.transitionTokenHash,
        )
      ) {
        throw new Error("INVALID_TRANSITION_TOKEN");
      }
      if (instance.answerStartsAt && instance.answerStartsAt.getTime() > Date.now()) {
        throw new Error("QUESTION_NOT_ANSWERABLE_YET");
      }
      if (instance.deadlineAt && instance.deadlineAt.getTime() <= Date.now()) {
        throw new Error("QUESTION_EXPIRED");
      }
      if (revision <= instance.answerRevision) {
        return { savedAt: new Date().toISOString(), revision: instance.answerRevision };
      }

      const updated = await tx.teacherEntranceQuestionInstance.update({
        where: { id: instance.id },
        data: {
          status: "ANSWERING",
          answerState: answer,
          answerRevision: revision,
        },
      });
      return { savedAt: new Date().toISOString(), revision: updated.answerRevision };
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const statuses: Record<string, number> = {
      FORBIDDEN: 403,
      SESSION_NOT_ACTIVE: 409,
      QUESTION_NO_LONGER_AVAILABLE: 403,
      QUESTION_ALREADY_FINALIZED: 409,
      INVALID_TRANSITION_TOKEN: 409,
      QUESTION_NOT_ANSWERABLE_YET: 409,
      QUESTION_EXPIRED: 409,
    };
    if (statuses[message]) {
      return NextResponse.json({ error: message }, { status: statuses[message] });
    }
    console.error("Unable to autosave teacher entrance answer", { error });
    return NextResponse.json({ error: "Lỗi hệ thống." }, { status: 500 });
  }
}
