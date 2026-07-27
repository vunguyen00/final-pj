import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sendBasicEmail } from "@/lib/mailer";
import { prisma } from "@/lib/prisma";
import { logTeacherApplication } from "@/lib/teacher-onboarding";
import { FIXED_TEST_MAX_SCORE } from "@/lib/test-rules";

type SnapshotAnswer = {
  id: string;
  content: string;
  isCorrect: boolean;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

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

function questionDisplayData(question: {
  id: string;
  sourceQuestionId: string;
  sequence: number;
  type: string;
  content: string;
  score: number;
  finalAnswer: string | null;
  scoringData: unknown;
  status: string;
  speakingAudioUrl: string | null;
}) {
  const rawAnswer = question.finalAnswer ?? "";
  const answers = scoringAnswers(question.scoringData);
  let studentAnswer = rawAnswer;
  let correctAnswer: string | null = null;
  let suggestedScore = 0;

  if (question.type === "MULTIPLE_CHOICE" || question.type === "TRUE_FALSE") {
    const selected = answers.find((answer) => answer.id === rawAnswer);
    const correct = answers.find((answer) => answer.isCorrect);
    studentAnswer = selected?.content ?? "";
    correctAnswer = correct?.content ?? null;
    suggestedScore = selected && correct && selected.id === correct.id
      ? question.score
      : 0;
  } else if (question.type === "FILL_IN_BLANK") {
    const correct = answers.find((answer) => answer.isCorrect);
    correctAnswer = correct?.content ?? null;
    suggestedScore =
      correct &&
      studentAnswer.trim().toLocaleLowerCase() === correct.content.trim().toLocaleLowerCase()
        ? question.score
        : 0;
  }

  return {
    questionId: question.sourceQuestionId,
    questionInstanceId: question.id,
    sequence: question.sequence,
    questionType: question.type,
    content: question.content,
    rawAnswer,
    studentAnswer,
    correctAnswer,
    isCorrect: suggestedScore === question.score,
    score: question.score,
    earnedScore: suggestedScore,
    status: question.status,
    audioUrl: question.speakingAudioUrl,
  };
}

async function getApplication(applicationId: string) {
  return prisma.teacherApplication.findUnique({
    where: { id: applicationId },
    include: {
      user: { select: { id: true, username: true, email: true } },
      language: { select: { name: true } },
      questionInstances: { orderBy: { sequence: "asc" } },
    },
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ applicationId: string }> },
) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { applicationId } = await params;
  const application = await getApplication(applicationId);
  if (!application) {
    return NextResponse.json({ error: "Không tìm thấy hồ sơ giảng viên." }, { status: 404 });
  }

  const applicationSummary = {
    id: application.id,
    status: application.status,
    user: {
      username: application.user.username,
      email: application.user.email,
    },
    language: application.language,
  };

  if (!application.entranceAttemptId) {
    if (
      application.status !== "SUBMITTED" ||
      application.failureReason !== "AI_GRADING_FAILED"
    ) {
      return NextResponse.json(
        { error: "Bài thi đang được chấm hoặc chưa có kết quả." },
        { status: 409 },
      );
    }

    return NextResponse.json({
      application: applicationSummary,
      manualGradingRequired: true,
      submission: {
        submittedAt: (application.submittedAt ?? application.updatedAt).toISOString(),
        passingScore: application.entrancePassingScore ?? 50,
        maxScore: FIXED_TEST_MAX_SCORE,
        questionResults: application.questionInstances.map(questionDisplayData),
      },
    });
  }

  const attempt = await prisma.testAttempt.findUnique({
    where: { id: application.entranceAttemptId },
    select: {
      id: true,
      attemptNo: true,
      score: true,
      maxScore: true,
      isPassed: true,
      startedAt: true,
      submittedAt: true,
      answers: true,
      results: true,
    },
  });
  if (!attempt) {
    return NextResponse.json({ error: "Không tìm thấy bài làm đã chấm." }, { status: 404 });
  }

  const results = asRecord(attempt.results);
  return NextResponse.json({
    application: applicationSummary,
    manualGradingRequired: false,
    attempt: {
      ...attempt,
      startedAt: attempt.startedAt.toISOString(),
      submittedAt: attempt.submittedAt.toISOString(),
      answers: asRecord(attempt.answers),
      questionResults: Array.isArray(results.questionResults)
        ? results.questionResults
        : [],
    },
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ applicationId: string }> },
) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { applicationId } = await params;
  const body = await request.json().catch(() => ({}));
  const scoreItems = Array.isArray(body?.scores) ? body.scores : [];
  const scoreMap = new Map<string, number>();

  for (const item of scoreItems) {
    const questionInstanceId =
      typeof item?.questionInstanceId === "string" ? item.questionInstanceId : "";
    const earnedScore =
      typeof item?.earnedScore === "number" ? item.earnedScore : Number.NaN;
    if (
      !questionInstanceId ||
      !Number.isFinite(earnedScore) ||
      scoreMap.has(questionInstanceId)
    ) {
      return NextResponse.json(
        { error: "Danh sách điểm chấm không hợp lệ." },
        { status: 400 },
      );
    }
    scoreMap.set(questionInstanceId, earnedScore);
  }

  const application = await getApplication(applicationId);
  if (!application) {
    return NextResponse.json({ error: "Không tìm thấy hồ sơ giảng viên." }, { status: 404 });
  }
  if (
    application.status !== "SUBMITTED" ||
    application.failureReason !== "AI_GRADING_FAILED" ||
    application.entranceAttemptId
  ) {
    return NextResponse.json(
      { error: "Bài thi này không còn chờ admin chấm thủ công." },
      { status: 409 },
    );
  }
  if (!application.entranceTestId || !application.startedAt) {
    return NextResponse.json(
      { error: "Bài thi thiếu dữ liệu để lưu kết quả." },
      { status: 409 },
    );
  }
  if (
    scoreMap.size !== application.questionInstances.length ||
    application.questionInstances.some((question) => {
      const score = scoreMap.get(question.id);
      return score === undefined || score < 0 || score > question.score;
    })
  ) {
    return NextResponse.json(
      { error: "Vui lòng chấm đủ tất cả câu và không nhập điểm vượt quá điểm tối đa." },
      { status: 400 },
    );
  }

  const rawMax = application.questionInstances.reduce(
    (total, question) => total + question.score,
    0,
  );
  if (rawMax <= 0) {
    return NextResponse.json({ error: "Tổng điểm bài thi không hợp lệ." }, { status: 409 });
  }

  const questionResults = application.questionInstances.map((question) => {
    const earnedScore = Math.round((scoreMap.get(question.id) ?? 0) * 10) / 10;
    return {
      ...questionDisplayData(question),
      earnedScore,
      isCorrect: earnedScore >= question.score / 2,
      manuallyGraded: true,
    };
  });
  const earned = questionResults.reduce((total, question) => total + question.earnedScore, 0);
  const finalScore = Math.round(
    ((earned / rawMax) * FIXED_TEST_MAX_SCORE) * 10,
  ) / 10;
  const passingScore = application.entrancePassingScore ?? 50;
  const isPassed = finalScore >= passingScore;
  const nextStatus = isPassed ? "UNDER_REVIEW" : "REJECTED";
  const submittedAt = application.submittedAt ?? new Date();
  const finalAnswers = Object.fromEntries(
    application.questionInstances.map((question) => [
      question.sourceQuestionId,
      question.finalAnswer ?? "",
    ]),
  );

  const attempt = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "TeacherApplication" WHERE "id" = ${application.id} FOR UPDATE`;
    const current = await tx.teacherApplication.findUnique({
      where: { id: application.id },
      select: { status: true, entranceAttemptId: true, failureReason: true },
    });
    if (
      current?.status !== "SUBMITTED" ||
      current.entranceAttemptId ||
      current.failureReason !== "AI_GRADING_FAILED"
    ) {
      return null;
    }

    const previousAttempts = await tx.testAttempt.count({
      where: { testId: application.entranceTestId!, userId: application.userId },
    });
    const created = await tx.testAttempt.create({
      data: {
        testId: application.entranceTestId!,
        userId: application.userId,
        attemptNo: previousAttempts + 1,
        score: finalScore,
        maxScore: FIXED_TEST_MAX_SCORE,
        answers: finalAnswers,
        results: {
          totalQuestions: questionResults.length,
          correctAnswers: questionResults.filter((question) => question.isCorrect).length,
          questionResults,
          teacherApplicationId: application.id,
          sequential: true,
          manuallyGraded: true,
          manuallyGradedById: admin.id,
        },
        startedAt: application.startedAt!,
        submittedAt,
        isPassed,
      } as never,
    });

    await tx.teacherApplication.update({
      where: { id: application.id },
      data: {
        status: nextStatus,
        entranceAttemptId: created.id,
        failureReason: null,
        reviewedAt: isPassed ? null : new Date(),
        reviewedById: isPassed ? null : admin.id,
        rejectionReason: isPassed
          ? null
          : `Không đạt điểm yêu cầu của bài test đầu vào (${finalScore.toFixed(1)}/${passingScore}).`,
        answerState: finalAnswers,
      },
    });
    await tx.notification.create({
      data: {
        userId: application.userId,
        title: "Bài đầu vào giảng viên đã được chấm",
        body: isPassed
          ? `Admin đã chấm bài đầu vào của bạn: ${finalScore.toFixed(1)}/${FIXED_TEST_MAX_SCORE}. Hồ sơ đang chờ xét duyệt.`
          : `Admin đã chấm bài đầu vào của bạn: ${finalScore.toFixed(1)}/${FIXED_TEST_MAX_SCORE}. Kết quả chưa đạt mức yêu cầu ${passingScore}.`,
      },
    });
    return created;
  });

  if (!attempt) {
    return NextResponse.json(
      { error: "Bài thi đã được xử lý bởi một tiến trình khác. Vui lòng làm mới danh sách." },
      { status: 409 },
    );
  }

  await logTeacherApplication({
    applicationId: application.id,
    status: nextStatus,
    message: `Admin chấm thủ công sau khi AI chấm bài thất bại: ${finalScore.toFixed(1)}/${FIXED_TEST_MAX_SCORE}.`,
    actorId: admin.id,
  });
  try {
    await sendBasicEmail(
      application.user.email,
      "Kết quả bài đầu vào giảng viên",
      isPassed
        ? `Bài đầu vào của bạn đã được admin chấm ${finalScore.toFixed(1)}/${FIXED_TEST_MAX_SCORE} và đang chờ xét duyệt hồ sơ.`
        : `Bài đầu vào của bạn đã được admin chấm ${finalScore.toFixed(1)}/${FIXED_TEST_MAX_SCORE}, chưa đạt mức yêu cầu ${passingScore}.`,
    );
  } catch {
    // Kết quả trong cơ sở dữ liệu là nguồn dữ liệu chính; lỗi email không hủy việc chấm.
  }

  return NextResponse.json({
    ok: true,
    status: nextStatus,
    attempt: {
      id: attempt.id,
      score: attempt.score,
      maxScore: attempt.maxScore,
      isPassed: attempt.isPassed,
    },
  });
}
