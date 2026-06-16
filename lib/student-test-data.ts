import { shouldChargeAiPoints } from "@/lib/ai-access";
import { SPEAKING_AI_COST, WRITING_AI_COST } from "@/lib/ai-points";
import { getCurrentUser } from "@/lib/auth";
import { getCourseProgressPercent } from "@/lib/learning-progress";
import { prisma } from "@/lib/prisma";
import { FIXED_TEST_MAX_SCORE, isTestReady } from "@/lib/test-rules";
import type { ChartMaterialData } from "@/lib/test-material";

export type StudentTestQuestion = {
  id: string;
  type: string;
  content: string;
  audioUrl: string | null;
  hint: string | null;
  order: number;
  score: number;
  answers: { id: string; content: string; order: number }[] | null;
};

export type StudentTestInfo = {
  id: string;
  name: string;
  description: string | null;
  courseName: string;
  kind: string;
  assessmentMode: "STANDARD" | "WRITING" | "SPEAKING";
  language: { id: string; name: string; code: string } | null;
  maxScore: number;
  passingScore: number;
  timeLimit: number | null;
  shuffleQuestions: boolean;
  materialTitle: string | null;
  materialContent: string | null;
  materialUrl: string | null;
  materialType: string | null;
  materialData: ChartMaterialData | null;
  previewMode: boolean;
  aiFeedbackCost: number;
  chargeAiFeedback: boolean;
};

export type StudentTestAttemptHistoryItem = {
  id: string;
  attemptNo: number;
  score: number;
  maxScore: number;
  isPassed: boolean;
  submittedAt: string;
};

export type StudentTestPayload = {
  test: StudentTestInfo;
  questions: StudentTestQuestion[];
  attempts: StudentTestAttemptHistoryItem[];
};

export type StudentTestLoadResult =
  | { ok: true; data: StudentTestPayload }
  | {
      ok: false;
      status: number;
      error: string;
      details?: Record<string, unknown>;
    };

export async function getStudentTestPayload(
  testId: string,
): Promise<StudentTestLoadResult> {
  const user = await getCurrentUser();

  if (
    !user ||
    (user.role !== "STUDENT" && user.role !== "TEACHER" && user.role !== "ADMIN")
  ) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const test = await prisma.test.findUnique({
    where: { id: testId },
    include: {
      course: {
        include: {
          language: {
            select: { id: true, name: true, code: true },
          },
        },
      },
      language: {
        select: { id: true, name: true, code: true },
      },
      questions: {
        include: {
          answers: {
            orderBy: { order: "asc" },
          },
        },
        orderBy: { order: "asc" },
      },
    },
  });

  if (!test) {
    return { ok: false, status: 404, error: "Test not found" };
  }

  const totalQuestionScore = test.questions.reduce(
    (sum, question) => sum + Number(question.score || 0),
    0,
  );
  if (!isTestReady(totalQuestionScore)) {
    return {
      ok: false,
      status: 400,
      error: `Bai test chua hop le. Tong diem cau hoi phai bang ${FIXED_TEST_MAX_SCORE}.`,
      details: { totalQuestionScore },
    };
  }

  if (test.kind === "TEACHER_ENTRANCE") {
    return {
      ok: false,
      status: 403,
      error:
        "Teacher entrance tests are only available from the teacher registration flow.",
    };
  }

  const isOwnerPreview =
    (user.role === "TEACHER" || user.role === "ADMIN") &&
    test.course?.instructorId === user.id;

  if (!isOwnerPreview && test.kind === "COURSE") {
    if (!test.courseId) {
      return { ok: false, status: 400, error: "Invalid course test." };
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: user.id,
          courseId: test.courseId,
        },
      },
    });

    if (!enrollment) {
      return { ok: false, status: 403, error: "Not enrolled in this course" };
    }

    const progress = await getCourseProgressPercent(user.id, test.courseId);
    if (progress < 100) {
      return {
        ok: false,
        status: 403,
        error: "Ban can hoan thanh 100% bai hoc truoc khi lam test.",
        details: { progress },
      };
    }
  }

  const attempts = await prisma.testAttempt.findMany({
    where: { testId, userId: user.id },
    orderBy: { submittedAt: "desc" },
    select: {
      id: true,
      attemptNo: true,
      score: true,
      maxScore: true,
      isPassed: true,
      submittedAt: true,
    },
    take: 20,
  });

  const questions = test.questions.map((question) => ({
    id: question.id,
    type: question.type,
    content: question.content,
    audioUrl: question.audioUrl,
    hint: question.hint,
    order: question.order,
    score: question.score,
    answers:
      question.type === "MULTIPLE_CHOICE" || question.type === "TRUE_FALSE"
        ? question.answers.map((answer) => ({
            id: answer.id,
            content: answer.content,
            order: answer.order,
          }))
        : null,
  }));
  const aiFeedbackCost = test.questions.some(
    (question) => question.type === "SPEAKING",
  )
    ? SPEAKING_AI_COST
    : test.questions.some((question) => question.type === "ESSAY")
      ? WRITING_AI_COST
      : 0;

  return {
    ok: true,
    data: {
      test: {
        id: test.id,
        name: test.name,
        description: test.description,
        courseName: test.course?.name ?? "Public practice",
        kind: test.kind,
        assessmentMode: test.assessmentMode,
        language: test.language ?? test.course?.language ?? null,
        maxScore: FIXED_TEST_MAX_SCORE,
        passingScore: test.passingScore,
        timeLimit: test.timeLimit,
        shuffleQuestions: test.shuffleQuestions,
        materialTitle: test.materialTitle,
        materialContent: test.materialContent,
        materialUrl: test.materialUrl,
        materialType: test.materialType,
        materialData: test.materialData as ChartMaterialData | null,
        previewMode: isOwnerPreview,
        aiFeedbackCost,
        chargeAiFeedback: shouldChargeAiPoints(user.role),
      },
      questions,
      attempts: attempts.map((attempt) => ({
        id: attempt.id,
        attemptNo: attempt.attemptNo,
        score: attempt.score,
        maxScore: attempt.maxScore,
        isPassed: attempt.isPassed,
        submittedAt: attempt.submittedAt.toISOString(),
      })),
    },
  };
}
