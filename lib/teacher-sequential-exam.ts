import {
  createHash,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from "node:crypto";
import { Prisma } from "@/.generated/prisma/client";
import { getTeacherQuestionTiming } from "@/lib/teacher-question-timing";

const TRANSITION_TOKEN_BYTES = 32;
const TRANSITION_TOKEN_FALLBACK_HOURS = 24;
const EXPIRED_FINALIZE_GRACE_MINUTES = 5;

type TransactionClient = Prisma.TransactionClient;

type SnapshotAnswer = {
  id: string;
  content: string;
  order: number;
  isCorrect: boolean;
};

export type SequentialQuestionPayload = {
  questionInstanceId: string;
  sequence: number;
  displaySequence: string;
  type: string;
  prompt: string;
  audioUrl: string | null;
  hint: string | null;
  score: number;
  answers: Array<{ id: string; content: string; order: number }> | null;
  revealedAt: string;
  answerStartsAt: string | null;
  deadlineAt: string | null;
  transitionToken: string;
  answer: string;
  revision: number;
  speakingAudioUploaded: boolean;
  speakingMediaStatus: string;
};

function jsonRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function snapshotAnswers(value: unknown): SnapshotAnswer[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const record = jsonRecord(item);
    if (
      typeof record.id !== "string" ||
      typeof record.content !== "string" ||
      typeof record.order !== "number"
    ) {
      return [];
    }
    return [{
      id: record.id,
      content: record.content,
      order: record.order,
      isCorrect: record.isCorrect === true,
    }];
  });
}

function shuffled<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const other = randomInt(index + 1);
    [copy[index], copy[other]] = [copy[other], copy[index]];
  }
  return copy;
}

export function hashTeacherTransitionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function verifyTeacherTransitionToken(token: string, expectedHash: string) {
  const actual = Buffer.from(hashTeacherTransitionToken(token), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function createTeacherSpeakingProcessingToken() {
  const token = randomBytes(TRANSITION_TOKEN_BYTES).toString("base64url");
  return {
    token,
    tokenHash: hashTeacherTransitionToken(token),
    expiresAt: new Date(
      Date.now() + TRANSITION_TOKEN_FALLBACK_HOURS * 60 * 60 * 1000,
    ),
  };
}

function contentHash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function tokenExpiry(params: {
  deadlineAt: Date | null;
  startedAt: Date;
  timeLimit: number | null;
}) {
  if (params.deadlineAt) {
    return new Date(
      params.deadlineAt.getTime() + EXPIRED_FINALIZE_GRACE_MINUTES * 60 * 1000,
    );
  }
  if (params.timeLimit) {
    return new Date(
      params.startedAt.getTime() +
        (params.timeLimit + EXPIRED_FINALIZE_GRACE_MINUTES) * 60 * 1000,
    );
  }
  return new Date(
    params.startedAt.getTime() +
      TRANSITION_TOKEN_FALLBACK_HOURS * 60 * 60 * 1000,
  );
}

function questionTimes(
  question: {
    type: string;
    preparationTimeSeconds: number | null;
    answerTimeSeconds: number | null;
  },
  revealedAt: Date,
) {
  const timing = getTeacherQuestionTiming(question);
  if (!timing) {
    return { answerStartsAt: revealedAt, deadlineAt: null };
  }
  const answerStartsAt = new Date(
    revealedAt.getTime() + timing.preparationTimeSeconds * 1000,
  );
  return {
    answerStartsAt,
    deadlineAt: new Date(
      answerStartsAt.getTime() + timing.answerTimeSeconds * 1000,
    ),
  };
}

async function issueTransitionToken(
  tx: TransactionClient,
  instance: {
    id: string;
    deadlineAt: Date | null;
  },
  application: {
    startedAt: Date;
    entranceTimeLimit: number | null;
  },
) {
  const token = randomBytes(TRANSITION_TOKEN_BYTES).toString("base64url");
  await tx.teacherEntranceQuestionInstance.update({
    where: { id: instance.id },
    data: {
      transitionTokenHash: hashTeacherTransitionToken(token),
      transitionTokenExpiresAt: tokenExpiry({
        deadlineAt: instance.deadlineAt,
        startedAt: application.startedAt,
        timeLimit: application.entranceTimeLimit,
      }),
    },
  });
  return token;
}

export async function initializeTeacherQuestionInstances(
  tx: TransactionClient,
  applicationId: string,
) {
  const existing = await tx.teacherEntranceQuestionInstance.count({
    where: { applicationId },
  });
  if (existing > 0) return;

  const application = await tx.teacherApplication.findUnique({
    where: { id: applicationId },
    select: {
      id: true,
      startedAt: true,
      entranceTest: {
        select: {
          passingScore: true,
          maxScore: true,
          timeLimit: true,
          shuffleQuestions: true,
          questions: {
            orderBy: { order: "asc" },
            select: {
              id: true,
              type: true,
              content: true,
              audioUrl: true,
              hint: true,
              score: true,
              preparationTimeSeconds: true,
              answerTimeSeconds: true,
              answers: {
                orderBy: { order: "asc" },
                select: {
                  id: true,
                  content: true,
                  order: true,
                  isCorrect: true,
                },
              },
            },
          },
        },
      },
    },
  });
  if (!application?.startedAt || !application.entranceTest) {
    throw new Error("SEQUENTIAL_SESSION_NOT_READY");
  }

  const test = application.entranceTest;
  const orderedQuestions = test.shuffleQuestions
    ? shuffled(test.questions)
    : test.questions;

  for (const [index, question] of orderedQuestions.entries()) {
    const answerSnapshot = question.answers.map((answer) => ({
      id: answer.id,
      content: answer.content,
      order: answer.order,
      isCorrect: answer.isCorrect,
    }));
    const publicAnswers =
      question.type === "MULTIPLE_CHOICE" || question.type === "TRUE_FALSE"
        ? shuffled(answerSnapshot).map(({ id, content }, answerIndex) => ({
            id,
            content,
            order: answerIndex + 1,
          }))
        : null;
    const snapshot = {
      sourceQuestionId: question.id,
      type: question.type,
      content: question.content,
      audioUrl: question.audioUrl,
      hint: question.hint,
      score: question.score,
      preparationTimeSeconds: question.preparationTimeSeconds,
      answerTimeSeconds: question.answerTimeSeconds,
      publicAnswers,
      scoringAnswers: answerSnapshot,
    };
    await tx.teacherEntranceQuestionInstance.create({
      data: {
        applicationId,
        sourceQuestionId: question.id,
        sequence: index + 1,
        type: question.type,
        content: question.content,
        audioUrl: question.audioUrl,
        hint: question.hint,
        score: question.score,
        preparationTimeSeconds: question.preparationTimeSeconds,
        answerTimeSeconds: question.answerTimeSeconds,
        answerOptions: publicAnswers ?? Prisma.JsonNull,
        scoringData: answerSnapshot,
        contentHash: contentHash(snapshot),
      },
    });
  }

  await tx.teacherApplication.update({
    where: { id: applicationId },
    data: {
      entrancePassingScore: test.passingScore,
      entranceMaxScore: test.maxScore,
      entranceTimeLimit: test.timeLimit,
    },
  });
}

export async function revealTeacherQuestionInstance(
  tx: TransactionClient,
  params: {
    applicationId: string;
    instanceId: string;
    startedAt: Date;
    entranceTimeLimit: number | null;
  },
) {
  const instance = await tx.teacherEntranceQuestionInstance.findFirst({
    where: {
      id: params.instanceId,
      applicationId: params.applicationId,
      status: "LOCKED",
    },
  });
  if (!instance) throw new Error("QUESTION_NOT_LOCKED");

  const revealedAt = new Date();
  const times = questionTimes(instance, revealedAt);
  const updated = await tx.teacherEntranceQuestionInstance.update({
    where: { id: instance.id },
    data: {
      status: "REVEALED",
      revealedAt,
      answerStartsAt: times.answerStartsAt,
      deadlineAt: times.deadlineAt,
    },
  });
  const transitionToken = await issueTransitionToken(tx, updated, {
    startedAt: params.startedAt,
    entranceTimeLimit: params.entranceTimeLimit,
  });
  return { instance: updated, transitionToken };
}

export async function rotateTeacherQuestionToken(
  tx: TransactionClient,
  instance: {
    id: string;
    deadlineAt: Date | null;
  },
  application: {
    startedAt: Date;
    entranceTimeLimit: number | null;
  },
) {
  return issueTransitionToken(tx, instance, application);
}

export function serializeTeacherQuestionInstance(
  instance: {
    id: string;
    sequence: number;
    type: string;
    content: string;
    audioUrl: string | null;
    hint: string | null;
    score: number;
    answerOptions: unknown;
    revealedAt: Date | null;
    answerStartsAt: Date | null;
    deadlineAt: Date | null;
    answerState: string | null;
    answerRevision: number;
    speakingAudioUrl: string | null;
    speakingMediaStatus: string;
  },
  transitionToken: string,
): SequentialQuestionPayload {
  const options = snapshotAnswers(instance.answerOptions).map(
    ({ id, content, order }) => ({ id, content, order }),
  );
  return {
    questionInstanceId: instance.id,
    sequence: instance.sequence,
    displaySequence: `Câu ${instance.sequence}`,
    type: instance.type,
    prompt: instance.content,
    audioUrl: instance.audioUrl,
    hint: instance.hint,
    score: instance.score,
    answers: options.length > 0 ? options : null,
    revealedAt: (instance.revealedAt ?? new Date()).toISOString(),
    answerStartsAt: instance.answerStartsAt?.toISOString() ?? null,
    deadlineAt: instance.deadlineAt?.toISOString() ?? null,
    transitionToken,
    answer: instance.answerState ?? "",
    revision: instance.answerRevision,
    speakingAudioUploaded: Boolean(instance.speakingAudioUrl),
    speakingMediaStatus: instance.speakingMediaStatus,
  };
}

export async function teacherSequentialSummary(
  tx: TransactionClient,
  applicationId: string,
) {
  const instances = await tx.teacherEntranceQuestionInstance.findMany({
    where: { applicationId },
    select: { status: true, finalAnswer: true },
  });
  const completed = instances.filter((item) =>
    ["FINALIZED", "SKIPPED", "EXPIRED"].includes(item.status)
  ).length;
  const blank = instances.filter(
    (item) => !String(item.finalAnswer ?? "").trim(),
  ).length;
  const mediaInstances = await tx.teacherEntranceQuestionInstance.findMany({
    where: { applicationId, type: "SPEAKING" },
    select: { status: true, speakingMediaStatus: true },
  });
  const pendingMediaJobs = mediaInstances.filter(
    (item) =>
      item.status !== "SKIPPED" &&
      ["UPLOADED", "PROCESSING"].includes(item.speakingMediaStatus),
  ).length;
  const failedMediaJobs = mediaInstances.filter(
    (item) =>
      item.status !== "SKIPPED" &&
      item.speakingMediaStatus === "FAILED",
  ).length;
  return {
    totalQuestions: instances.length,
    completedQuestions: completed,
    blankQuestions: blank,
    pendingMediaJobs,
    failedMediaJobs,
    pendingTechnicalIssues: failedMediaJobs,
  };
}
