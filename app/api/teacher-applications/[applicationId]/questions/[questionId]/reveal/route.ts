import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getTeacherQuestionTiming,
  parseTeacherQuestionRevealState,
} from "@/lib/teacher-question-timing";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ applicationId: string; questionId: string }> },
) {
  try {
    const user = await requireUser();
    const { applicationId, questionId } = await params;

    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "TeacherApplication" WHERE "id" = ${applicationId} FOR UPDATE`;
      const application = await tx.teacherApplication.findUnique({
        where: { id: applicationId },
        select: {
          userId: true,
          status: true,
          startedAt: true,
          questionRevealState: true,
          entranceTest: {
            select: {
              kind: true,
              questions: {
                where: { id: questionId },
                select: {
                  id: true,
                  type: true,
                  preparationTimeSeconds: true,
                  answerTimeSeconds: true,
                },
              },
            },
          },
        },
      });

      if (!application || application.userId !== user.id) throw new Error("FORBIDDEN");
      if (application.status !== "DRAFT" || !application.startedAt) throw new Error("NOT_ACTIVE");
      const question = application.entranceTest?.questions[0];
      const timing = question ? getTeacherQuestionTiming(question) : null;
      if (application.entranceTest?.kind !== "TEACHER_ENTRANCE" || !question || !timing) {
        throw new Error("INVALID_QUESTION");
      }

      const state = parseTeacherQuestionRevealState(application.questionRevealState);
      const revealedAt = state[questionId] ?? new Date().toISOString();
      if (!state[questionId]) {
        await tx.teacherApplication.update({
          where: { id: applicationId },
          data: { questionRevealState: { ...state, [questionId]: revealedAt } },
        });
      }
      return { revealedAt, ...timing };
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "FORBIDDEN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (message === "NOT_ACTIVE") return NextResponse.json({ error: "Phiên thi không còn hoạt động." }, { status: 409 });
    if (message === "INVALID_QUESTION") return NextResponse.json({ error: "Câu hỏi không hỗ trợ bộ đếm riêng." }, { status: 400 });
    console.error("Unable to reveal teacher entrance question", { error });
    return NextResponse.json({ error: "Không thể lấy câu hỏi." }, { status: 500 });
  }
}
