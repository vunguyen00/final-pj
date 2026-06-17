import type { AppRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type AiEvaluation = {
  scoreOnly?: boolean;
  language: string;
  overallScore: number;
  taskRelevance?: number;
  onTopic?: boolean;
  offTopicReason?: string;
  detailedComment?: string;
  sampleAnswer?: string;
  band?: { system: string; level: string; score: number; rationale: string };
  summary: string;
  strengths: string[];
  weaknesses: string[];
  feedback?: string[];
  suggestions: string[];
  corrections?: Array<{ original: string; improved: string; reason: string }>;
};

export type QuestionResult = {
  questionId: string;
  questionType: string;
  content: string;
  studentAnswer: string;
  correctAnswer: string | null;
  isCorrect: boolean | null;
  score: number;
  earnedScore: number;
  explanation: string | null;
  aiEvaluation?: AiEvaluation;
};

export type TestResultData = {
  attemptId: string;
  attemptNo: number;
  score: number;
  maxScore: number;
  passingScore: number;
  isPassed: boolean;
  courseId: string | null;
  courseName: string;
  totalQuestions: number;
  correctAnswers: number;
  submittedAnswers: unknown[];
  questionResults: QuestionResult[];
  scoreOnlyAiFeedback?: boolean;
  aiFeedbackPurchased?: boolean;
  aiFeedbackCost?: number;
  submittedAt: string;
};

type Viewer = {
  id: string;
  role: AppRole;
};

export async function getStudentTestAttemptResult(
  user: Viewer,
  testId: string,
  attemptId: string,
): Promise<TestResultData | null> {
  if (user.role !== "STUDENT" && user.role !== "TEACHER" && user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  const attempt = (await prisma.testAttempt.findUnique({
    where: { id: attemptId },
    include: {
      test: {
        include: {
          course: {
            select: { id: true, name: true, instructorId: true },
          },
        },
      },
    },
  })) as (Record<string, unknown> & {
    id: string;
    testId: string;
    userId: string;
    score: number;
    maxScore: number;
    isPassed: boolean;
    submittedAt: Date;
    test: { passingScore: number; course: { id: string; name: string; instructorId: string | null } | null };
  }) | null;

  if (!attempt || attempt.testId !== testId) {
    return null;
  }

  const isOwnerPreview =
    (user.role === "TEACHER" || user.role === "ADMIN") &&
    attempt.test.course?.instructorId === user.id;

  if (attempt.userId !== user.id && !isOwnerPreview) {
    throw new Error("Forbidden");
  }

  const stored = (attempt.results ?? {}) as Record<string, unknown>;

  return {
    attemptId: attempt.id,
    attemptNo: Number(attempt.attemptNo ?? 1),
    score: attempt.score,
    maxScore: Number(attempt.maxScore ?? attempt.score),
    passingScore: attempt.test.passingScore,
    isPassed: attempt.isPassed,
    courseId: attempt.test.course?.id ?? null,
    courseName: attempt.test.course?.name ?? "Public practice",
    totalQuestions: Number(stored.totalQuestions ?? 0),
    correctAnswers: Number(stored.correctAnswers ?? 0),
    submittedAnswers: Array.isArray(stored.submittedAnswers) ? stored.submittedAnswers : [],
    questionResults: Array.isArray(stored.questionResults) ? (stored.questionResults as QuestionResult[]) : [],
    scoreOnlyAiFeedback: stored.scoreOnlyAiFeedback === true,
    aiFeedbackPurchased: stored.aiFeedbackPurchased === true,
    aiFeedbackCost: Number(stored.aiFeedbackCost ?? 0),
    submittedAt: attempt.submittedAt.toISOString(),
  };
}
