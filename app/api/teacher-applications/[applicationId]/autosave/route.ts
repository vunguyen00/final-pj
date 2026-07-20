import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getTeacherQuestionTiming,
  parseTeacherQuestionRevealState,
  teacherQuestionAnswerStartsAt,
  teacherQuestionDeadline,
} from "@/lib/teacher-question-timing";

function answerRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ applicationId: string }> },
) {
  try {
    const user = await requireUser();
    const { applicationId } = await params;
    const body = await request.json();

    const application = await prisma.teacherApplication.findUnique({
      where: { id: applicationId },
      select: {
        userId: true,
        status: true,
        answerState: true,
        questionRevealState: true,
        entranceTest: {
          select: {
            kind: true,
            questions: {
              select: { id: true, type: true, preparationTimeSeconds: true, answerTimeSeconds: true },
            },
          },
        },
      },
    });

    if (!application || application.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (application.status !== "DRAFT") {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const incoming = answerRecord(body.answers);
    const saved = answerRecord(application.answerState);
    const reveals = parseTeacherQuestionRevealState(application.questionRevealState);
    const lockedQuestionIds: string[] = [];
    for (const question of application.entranceTest?.questions ?? []) {
      const timing = application.entranceTest?.kind === "TEACHER_ENTRANCE"
        ? getTeacherQuestionTiming(question)
        : null;
      if (!timing) continue;
      const revealedAt = reveals[question.id];
      if (
        !revealedAt ||
        Date.now() < teacherQuestionAnswerStartsAt(revealedAt, timing) ||
        Date.now() > teacherQuestionDeadline(revealedAt, timing)
      ) {
        lockedQuestionIds.push(question.id);
        if (saved[question.id] === undefined) delete incoming[question.id];
        else incoming[question.id] = saved[question.id];
      }
    }

    await prisma.teacherApplication.update({
      where: { id: applicationId },
      data: { answerState: incoming },
    });

    return NextResponse.json({ ok: true, savedAt: new Date().toISOString(), lockedQuestionIds });
  } catch {
    return NextResponse.json({ error: "Lỗi hệ thống." }, { status: 500 });
  }
}
