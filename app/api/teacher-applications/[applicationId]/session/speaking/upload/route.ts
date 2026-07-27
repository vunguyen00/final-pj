import { createHash, randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createTeacherSpeakingProcessingToken,
  verifyTeacherTransitionToken,
} from "@/lib/teacher-sequential-exam";
import {
  getAllowedUpload,
  MAX_AUDIO_UPLOAD_BYTES,
  validateUploadSignature,
} from "@/lib/upload-validation";

const SPEAKING_UPLOAD_GRACE_MS = 60_000;

function sessionIdFrom(request: Request) {
  const value = request.headers.get("x-proctor-session-id")?.trim() ?? "";
  return /^[a-zA-Z0-9-]{16,100}$/.test(value) ? value : "";
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ applicationId: string }> },
) {
  let savedDiskPath = "";
  try {
    const user = await requireUser();
    const { applicationId } = await params;
    const sessionId = sessionIdFrom(request);
    const form = await request.formData();
    const questionInstanceId = String(form.get("questionInstanceId") || "");
    const transitionToken = String(form.get("transitionToken") || "");
    const audio = form.get("audio");
    if (
      !sessionId ||
      !questionInstanceId ||
      !transitionToken ||
      !(audio instanceof File) ||
      audio.size <= 0 ||
      audio.size > MAX_AUDIO_UPLOAD_BYTES
    ) {
      return NextResponse.json({ error: "INVALID_SPEAKING_UPLOAD" }, { status: 400 });
    }
    const allowed = getAllowedUpload(audio.type, ["audio"], audio.name);
    if (!allowed) {
      return NextResponse.json({ error: "INVALID_AUDIO_FILE" }, { status: 400 });
    }
    const buffer = Buffer.from(await audio.arrayBuffer());
    if (!validateUploadSignature(buffer, audio.type, audio.name)) {
      return NextResponse.json({ error: "INVALID_AUDIO_FILE" }, { status: 400 });
    }
    const preflight = await prisma.teacherApplication.findFirst({
      where: {
        id: applicationId,
        userId: user.id,
        status: "DRAFT",
        proctorSessionId: sessionId,
        currentQuestionInstanceId: questionInstanceId,
      },
      select: {
        startedAt: true,
        entranceTimeLimit: true,
        questionInstances: {
          where: { id: questionInstanceId },
          select: {
            type: true,
            status: true,
            transitionTokenHash: true,
            deadlineAt: true,
            speakingAudioUrl: true,
          },
        },
      },
    });
    const preflightInstance = preflight?.questionInstances[0];
    if (
      !preflightInstance ||
      preflightInstance.type !== "SPEAKING" ||
      !["REVEALED", "ANSWERING"].includes(preflightInstance.status) ||
      !preflightInstance.transitionTokenHash ||
      !verifyTeacherTransitionToken(
        transitionToken,
        preflightInstance.transitionTokenHash,
      ) ||
      Boolean(
        preflightInstance.deadlineAt &&
        preflightInstance.deadlineAt.getTime() + SPEAKING_UPLOAD_GRACE_MS <=
          Date.now(),
      ) ||
      Boolean(
        preflight.startedAt &&
        preflight.entranceTimeLimit &&
        preflight.startedAt.getTime() +
          preflight.entranceTimeLimit * 60 * 1000 +
          SPEAKING_UPLOAD_GRACE_MS <=
          Date.now(),
      ) ||
      preflightInstance.speakingAudioUrl
    ) {
      return NextResponse.json({ error: "INVALID_SPEAKING_UPLOAD_STATE" }, { status: 409 });
    }

    const filename = `${randomUUID()}.${allowed.extension}`;
    const relativeUrl = `/uploads/teacher-entrance-speaking/${filename}`;
    const uploadsDir = path.join(
      process.cwd(),
      "public",
      "uploads",
      "teacher-entrance-speaking",
    );
    await mkdir(uploadsDir, { recursive: true });
    savedDiskPath = path.join(uploadsDir, filename);
    await writeFile(savedDiskPath, buffer);
    const audioHash = createHash("sha256").update(buffer).digest("hex");
    const processing = createTeacherSpeakingProcessingToken();

    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "TeacherApplication" WHERE "id" = ${applicationId} FOR UPDATE`;
      const application = await tx.teacherApplication.findUnique({
        where: { id: applicationId },
        select: {
          userId: true,
          status: true,
          proctorSessionId: true,
          currentQuestionInstanceId: true,
          startedAt: true,
          entranceTimeLimit: true,
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
      if (!instance || instance.type !== "SPEAKING") {
        throw new Error("INVALID_SPEAKING_QUESTION");
      }
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
      if (
        instance.deadlineAt &&
        instance.deadlineAt.getTime() + SPEAKING_UPLOAD_GRACE_MS <= Date.now()
      ) {
        throw new Error("QUESTION_EXPIRED");
      }
      if (
        application.startedAt &&
        application.entranceTimeLimit &&
        application.startedAt.getTime() +
          application.entranceTimeLimit * 60 * 1000 +
          SPEAKING_UPLOAD_GRACE_MS <=
          Date.now()
      ) {
        throw new Error("QUESTION_EXPIRED");
      }
      if (instance.speakingAudioUrl) {
        throw new Error("SPEAKING_AUDIO_ALREADY_UPLOADED");
      }

      const updated = await tx.teacherEntranceQuestionInstance.update({
        where: { id: instance.id },
        data: {
          speakingAudioUrl: relativeUrl,
          speakingAudioHash: audioHash,
          speakingAudioMime: audio.type,
          speakingAudioBytes: audio.size,
          speakingMediaStatus: "PROCESSING",
          speakingProcessingTokenHash: processing.tokenHash,
          speakingProcessingTokenExpiresAt: processing.expiresAt,
          speakingProcessingError: null,
        },
      });
      return {
        questionInstanceId: updated.id,
        audioUrl: relativeUrl,
        audioHash,
        processingToken: processing.token,
      };
    });

    savedDiskPath = "";
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (savedDiskPath) {
      await unlink(savedDiskPath).catch(() => undefined);
    }
    const message = error instanceof Error ? error.message : "";
    const statuses: Record<string, number> = {
      FORBIDDEN: 403,
      SESSION_NOT_ACTIVE: 409,
      QUESTION_NO_LONGER_AVAILABLE: 403,
      INVALID_SPEAKING_QUESTION: 400,
      QUESTION_ALREADY_FINALIZED: 409,
      INVALID_TRANSITION_TOKEN: 409,
      QUESTION_EXPIRED: 409,
      SPEAKING_AUDIO_ALREADY_UPLOADED: 409,
    };
    if (statuses[message]) {
      return NextResponse.json({ error: message }, { status: statuses[message] });
    }
    console.error("Unable to upload teacher speaking answer", { error });
    return NextResponse.json({ error: "Không thể lưu bản ghi âm." }, { status: 500 });
  }
}
