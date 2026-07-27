import { sendBasicEmail } from "@/lib/mailer";
import { prisma } from "@/lib/prisma";
import {
  evaluateTestAiAnswers,
  getTestAiScoreRatio,
  isTestAiAnswerCorrect,
} from "@/lib/test-ai-evaluation";
import { logTeacherApplication } from "@/lib/teacher-onboarding";
import { FIXED_TEST_MAX_SCORE, isTestReady } from "@/lib/test-rules";

type SnapshotAnswer = {
  id: string;
  content: string;
  isCorrect: boolean;
};

type SequentialQuestionResult = {
  questionId: string;
  questionInstanceId: string;
  sequence: number;
  questionType: string;
  content: string;
  rawAnswer: string;
  studentAnswer: string;
  correctAnswer: string | null;
  isCorrect: boolean;
  score: number;
  earnedScore: number;
  status: string;
  audioUrl: string | null;
  aiEvaluation?: Record<string, unknown>;
};

function scoringAnswers(value: unknown): SnapshotAnswer[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const record = item as Record<string, unknown>;
    if (typeof record.id !== "string" || typeof record.content !== "string") {
      return [];
    }
    return [{
      id: record.id,
      content: record.content,
      isCorrect: record.isCorrect === true,
    }];
  });
}

async function notifyAdminsOfGradingFailure(applicationId: string, message: string) {
  const [application, admins] = await Promise.all([
    prisma.teacherApplication.findUnique({
      where: { id: applicationId },
      select: {
        user: { select: { username: true, email: true } },
        language: { select: { name: true } },
      },
    }),
    prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
    }),
  ]);

  if (!application || admins.length === 0) return;
  await prisma.notification.createMany({
    data: admins.map((admin) => ({
      userId: admin.id,
      title: "Chấm bài đầu vào giảng viên chưa hoàn tất",
      body: `Hệ thống chưa thể chấm bài của ${application.user.username} (${application.user.email}) - ${application.language.name}. Vui lòng kiểm tra hệ thống. Lỗi: ${message}`,
    })),
  });
}

async function gradeTeacherEntranceSubmission(applicationId: string, userId: string) {
  const application = await prisma.teacherApplication.findUnique({
    where: { id: applicationId },
    include: {
      user: { select: { id: true, username: true, email: true } },
      language: { select: { name: true, code: true } },
      entranceTest: { select: { id: true } },
      questionInstances: { orderBy: { sequence: "asc" } },
    },
  });

  if (
    !application ||
    application.userId !== userId ||
    application.status !== "SUBMITTED" ||
    application.entranceAttemptId ||
    !application.entranceTest ||
    !application.startedAt
  ) {
    return;
  }
  const entranceTestId = application.entranceTest.id;
  const startedAt = application.startedAt;

  const rawMax = application.questionInstances.reduce(
    (sum, question) => sum + Number(question.score || 0),
    0,
  );
  if (!isTestReady(rawMax)) {
    throw new Error(`Tổng điểm đề thi không bằng ${FIXED_TEST_MAX_SCORE}.`);
  }

  const aiInputs = application.questionInstances.flatMap((question) => {
    if (question.type !== "ESSAY" && question.type !== "SPEAKING") return [];
    const answer = String(question.finalAnswer || "").trim();
    if (!answer) return [];
    return [{
      questionId: question.id,
      mode: question.type === "SPEAKING" ? ("SPEAKING" as const) : ("WRITING" as const),
      answer,
      prompt: question.content,
      languageCode: application.language.code,
    }];
  });
  const aiResults = await evaluateTestAiAnswers(aiInputs);
  const failedAiResult = aiInputs
    .map((input) => aiResults.get(input.questionId))
    .find((result) => result?.failed);
  if (failedAiResult) {
    throw new Error(
      failedAiResult.failureReason === "invalid_response"
        ? "AI trả về kết quả không hợp lệ."
        : "Dịch vụ chấm AI đang tạm thời không khả dụng.",
    );
  }

  let earned = 0;
  const questionResults: SequentialQuestionResult[] = [];
  const finalAnswers: Record<string, string> = {};

  for (const question of application.questionInstances) {
    const rawAnswer = question.finalAnswer ?? "";
    finalAnswers[question.sourceQuestionId] = rawAnswer;
    let isCorrect = false;
    let earnedScore = 0;
    let correctAnswer: string | null = null;
    let studentAnswer = rawAnswer;
    let aiEvaluation: Record<string, unknown> | null = null;
    const answers = scoringAnswers(question.scoringData);

    if (question.type === "MULTIPLE_CHOICE" || question.type === "TRUE_FALSE") {
      const selected = answers.find((answer) => answer.id === rawAnswer);
      const correct = answers.find((answer) => answer.isCorrect);
      studentAnswer = selected?.content ?? "";
      correctAnswer = correct?.content ?? null;
      isCorrect = Boolean(selected && correct && selected.id === correct.id);
    }
    if (question.type === "FILL_IN_BLANK") {
      const correct = answers.find((answer) => answer.isCorrect);
      correctAnswer = correct?.content ?? null;
      isCorrect = Boolean(
        correct &&
        studentAnswer.trim().toLowerCase() === correct.content.trim().toLowerCase()
      );
    }
    if ((question.type === "ESSAY" || question.type === "SPEAKING") && studentAnswer.trim()) {
      const aiResult = aiResults.get(question.id);
      if (aiResult) {
        earnedScore = Math.round(
          question.score * getTestAiScoreRatio(aiResult) * 10,
        ) / 10;
        isCorrect = isTestAiAnswerCorrect(aiResult);
        earned += earnedScore;
        aiEvaluation = aiResult.aiEvaluation as unknown as Record<string, unknown>;
      }
    }
    if (isCorrect && question.type !== "ESSAY" && question.type !== "SPEAKING") {
      earnedScore = question.score;
      earned += question.score;
    }
    questionResults.push({
      questionId: question.sourceQuestionId,
      questionInstanceId: question.id,
      sequence: question.sequence,
      questionType: question.type,
      content: question.content,
      rawAnswer,
      studentAnswer,
      correctAnswer,
      isCorrect,
      score: question.score,
      earnedScore,
      status: question.status,
      audioUrl: question.speakingAudioUrl,
      ...(aiEvaluation && { aiEvaluation }),
    });
  }

  const finalScore = rawMax > 0
    ? (earned / rawMax) * FIXED_TEST_MAX_SCORE
    : 0;
  const passingScore = application.entrancePassingScore ?? 50;
  const isPassed = finalScore >= passingScore;
  const nextApplicationStatus = isPassed ? "UNDER_REVIEW" : "REJECTED";
  const submittedAt = new Date();

  const attempt = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "TeacherApplication" WHERE "id" = ${application.id} FOR UPDATE`;
    const current = await tx.teacherApplication.findUnique({
      where: { id: application.id },
      select: { status: true, entranceAttemptId: true },
    });
    if (current?.status !== "SUBMITTED" || current.entranceAttemptId) {
      return null;
    }

    const previousAttempts = await tx.testAttempt.count({
      where: { testId: entranceTestId, userId },
    });
    const created = await tx.testAttempt.create({
      data: {
        testId: entranceTestId,
        userId,
        attemptNo: previousAttempts + 1,
        score: finalScore,
        maxScore: FIXED_TEST_MAX_SCORE,
        answers: finalAnswers,
        results: {
          totalQuestions: application.questionInstances.length,
          correctAnswers: questionResults.filter((item) => item.isCorrect).length,
          questionResults,
          teacherApplicationId: application.id,
          sequential: true,
        },
        startedAt,
        submittedAt,
        isPassed,
      } as never,
    });
    await tx.teacherApplication.update({
      where: { id: application.id },
      data: {
        status: nextApplicationStatus,
        entranceAttemptId: created.id,
        submittedAt,
        reviewedAt: isPassed ? null : submittedAt,
        rejectionReason: isPassed
          ? null
          : `Không đạt điểm yêu cầu của bài test đầu vào (${finalScore.toFixed(1)}/${passingScore}).`,
        answerState: finalAnswers,
      },
    });

    const admins = await tx.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
    });
    if (admins.length > 0) {
      await tx.notification.createMany({
        data: admins.map((admin) => ({
          userId: admin.id,
          title: "Đã chấm xong bài đầu vào giảng viên",
          body: `Bài của ${application.user.username} (${application.user.email}) - ${application.language.name} đã được chấm: ${finalScore.toFixed(1)}/${FIXED_TEST_MAX_SCORE} (${isPassed ? "đạt" : "không đạt"}). Vào Tổng quan admin > Hồ sơ đăng ký giảng viên để kiểm tra bài làm.`,
        })),
      });
    }
    return created;
  });

  if (!attempt) return;

  await logTeacherApplication({
    applicationId: application.id,
    status: nextApplicationStatus,
    message: isPassed
      ? "Đã chấm xong bài test đầu vào tuần tự, chờ admin review."
      : "Đã chấm xong và tự động từ chối vì không đạt điểm bài test đầu vào tuần tự.",
    actorId: userId,
  });

  try {
    await sendBasicEmail(
      application.user.email,
      isPassed
        ? "Hồ sơ đăng ký giảng viên đang chờ review"
        : "Kết quả hồ sơ đăng ký giảng viên",
      isPassed
        ? "Bài test đầu vào của bạn đã được chấm xong và đạt yêu cầu. Admin sẽ review hồ sơ của bạn."
        : `Hồ sơ đã bị từ chối tự động vì điểm ${finalScore.toFixed(1)} chưa đạt mức ${passingScore}.`,
    );
  } catch {
    // SMTP errors must not roll back an already completed grading job.
  }
}

export async function processTeacherEntranceSubmission(
  applicationId: string,
  userId: string,
) {
  try {
    await gradeTeacherEntranceSubmission(applicationId, userId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi hệ thống không xác định.";
    console.error("Unable to grade teacher entrance submission in background", {
      applicationId,
      error,
    });
    await prisma.teacherApplication.updateMany({
      where: {
        id: applicationId,
        userId,
        status: "SUBMITTED",
        entranceAttemptId: null,
      },
      data: { failureReason: "AI_GRADING_FAILED" },
    }).catch(() => undefined);
    await notifyAdminsOfGradingFailure(applicationId, message).catch(() => undefined);
  }
}
