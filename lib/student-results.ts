import type { AppRole } from "@/lib/auth";
import { getCertificateRating, type CertificateRating } from "@/lib/certificate-rating";
import { prisma } from "@/lib/prisma";

export type ResultFilter = "all" | "TEST" | "SPEAKING" | "WRITING";

export type StudentResultItem = {
  id: string;
  type: "TEST" | "SPEAKING" | "WRITING";
  title: string;
  course: { id: string; name: string } | null;
  language: { name: string; code: string } | null;
  score: number;
  maxScore: number;
  bandSystem: string;
  bandLevel: string;
  bandScore: number;
  submittedAt: string;
  durationSeconds: number | null;
  summary: string;
  certificate: CertificateRating;
  scoreOnly?: boolean;
};

export type ResultDetail = {
  id: string;
  type: "TEST" | "SPEAKING" | "WRITING";
  title: string;
  taskType?: string | null;
  course: { id: string; name: string; language?: { name: string; code: string } | null } | null;
  language?: { name: string; code: string } | null;
  score: number;
  maxScore: number;
  band: { system: string; level: string; score: number };
  criteria: Record<string, unknown>;
  feedback: Record<string, unknown>;
  mistakes: Record<string, unknown> | null;
  improvements: Record<string, unknown> | null;
  sampleAnswer?: string | null;
  prompt?: string | null;
  submissionText?: string | null;
  audioUrl?: string | null;
  durationSeconds?: number | null;
  submittedAt: string;
  certificate: CertificateRating;
  testId?: string;
  scoreOnly?: boolean;
};

type Viewer = {
  id: string;
  role: AppRole;
};

export const RESULT_FORBIDDEN_ERROR = "RESULT_FORBIDDEN";

function assertCanReadResults(user: Viewer) {
  if (user.role !== "STUDENT" && user.role !== "TEACHER" && user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
}

function estimateLevel(score: number, maxScore: number, bandLevel?: string) {
  if (bandLevel) return bandLevel;
  const percent = maxScore > 0 ? (score / maxScore) * 100 : 0;
  if (percent >= 85) return "Advanced";
  if (percent >= 70) return "Upper Intermediate";
  if (percent >= 55) return "Intermediate";
  if (percent >= 40) return "Elementary";
  return "Beginner";
}

function normalizeFilter(value?: string | null): ResultFilter {
  if (value === "TEST" || value === "SPEAKING" || value === "WRITING") return value;
  return "all";
}

export async function getStudentResults(user: Viewer, filterInput?: string | null) {
  assertCanReadResults(user);
  const type = normalizeFilter(filterInput);

  const [testAttempts, aiAssessments] = await Promise.all([
    type === "all" || type === "TEST"
      ? prisma.testAttempt.findMany({
          where: { userId: user.id },
          include: {
            test: {
              select: {
                id: true,
                name: true,
                language: { select: { name: true, code: true } },
                course: {
                  select: {
                    id: true,
                    name: true,
                    language: { select: { name: true, code: true } },
                  },
                },
              },
            },
          },
          orderBy: { submittedAt: "desc" },
        })
      : Promise.resolve([]),
    type === "all" || type === "SPEAKING" || type === "WRITING"
      ? prisma.aiAssessment.findMany({
          where: {
            userId: user.id,
            ...(type === "SPEAKING" || type === "WRITING" ? { type } : {}),
          },
          include: {
            course: {
              select: {
                id: true,
                name: true,
                language: { select: { name: true, code: true } },
              },
            },
          },
          orderBy: { submittedAt: "desc" },
        })
      : Promise.resolve([]),
  ]);

  const testItems: StudentResultItem[] = testAttempts.map((attempt) => {
    const stored = (attempt.results ?? {}) as Record<string, unknown>;
    const language = attempt.test.language ?? attempt.test.course?.language ?? null;
    return {
      id: attempt.id,
      type: "TEST",
      title: attempt.test.name,
      course: attempt.test.course ? { id: attempt.test.course.id, name: attempt.test.course.name } : null,
      language,
      score: attempt.score,
      maxScore: attempt.maxScore,
      bandSystem: "GENERAL",
      bandLevel: estimateLevel(attempt.score, attempt.maxScore),
      bandScore: attempt.score,
      submittedAt: attempt.submittedAt.toISOString(),
      durationSeconds: Math.max(0, Math.round((attempt.submittedAt.getTime() - attempt.startedAt.getTime()) / 1000)),
      summary: `${Number(stored.correctAnswers ?? 0)}/${Number(stored.totalQuestions ?? 0)} câu đúng`,
      certificate: getCertificateRating({
        score: attempt.score,
        maxScore: attempt.maxScore,
        languageCode: language?.code,
        languageName: language?.name,
      }),
    };
  });

  const aiItems: StudentResultItem[] = aiAssessments.map((item) => {
    const feedback = item.feedback as Record<string, unknown>;
    const ielts = feedback.ielts as Record<string, unknown> | undefined;
    const legacyEvaluation = feedback.evaluation as Record<string, unknown> | undefined;

    return {
      id: item.id,
      type: item.type as "SPEAKING" | "WRITING",
      title: item.title || (item.type === "SPEAKING" ? "Speaking AI" : "Writing AI"),
      course: item.course ? { id: item.course.id, name: item.course.name } : null,
      language: item.course?.language ?? null,
      score: item.score,
      maxScore: item.maxScore,
      bandSystem: item.bandSystem,
      bandLevel: item.bandLevel,
      bandScore: item.bandScore,
      submittedAt: item.submittedAt.toISOString(),
      durationSeconds: item.durationSeconds,
      summary: String(feedback.scoreOnly === true ? "" : ielts?.final_feedback || legacyEvaluation?.summary || ""),
      certificate: getCertificateRating({
        score: item.score,
        maxScore: item.maxScore,
        bandSystem: item.bandSystem,
        bandScore: item.bandScore,
        languageCode: item.course?.language?.code,
        languageName: item.course?.language?.name,
      }),
      scoreOnly: feedback.scoreOnly === true,
    };
  });

  return [...testItems, ...aiItems].sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
  );
}

export async function getStudentResultDetail(user: Viewer, resultId: string): Promise<ResultDetail | null> {
  assertCanReadResults(user);

  const aiAssessment = await prisma.aiAssessment.findUnique({
    where: { id: resultId },
    include: { course: { select: { id: true, name: true, language: { select: { name: true, code: true } } } } },
  });

  if (aiAssessment) {
    if (aiAssessment.userId !== user.id && user.role !== "ADMIN") {
      throw new Error(RESULT_FORBIDDEN_ERROR);
    }

    const assessmentFeedback = aiAssessment.feedback as Record<string, unknown>;
    return {
      id: aiAssessment.id,
      type: aiAssessment.type as "SPEAKING" | "WRITING",
      title: aiAssessment.title || (aiAssessment.type === "SPEAKING" ? "Speaking AI" : "Writing AI"),
      course: aiAssessment.course,
      language: aiAssessment.course?.language ?? null,
      taskType: aiAssessment.taskType,
      score: aiAssessment.score,
      maxScore: aiAssessment.maxScore,
      band: {
        system: aiAssessment.bandSystem,
        level: aiAssessment.bandLevel,
        score: aiAssessment.bandScore,
      },
      criteria: aiAssessment.criteria as Record<string, unknown>,
      feedback: aiAssessment.feedback as Record<string, unknown>,
      scoreOnly: assessmentFeedback.scoreOnly === true,
      mistakes: aiAssessment.mistakes as Record<string, unknown> | null,
      improvements: aiAssessment.improvements as Record<string, unknown> | null,
      sampleAnswer: aiAssessment.sampleAnswer,
      prompt: aiAssessment.prompt,
      submissionText: aiAssessment.submissionText,
      audioUrl: aiAssessment.audioUrl,
      durationSeconds: aiAssessment.durationSeconds,
      submittedAt: aiAssessment.submittedAt.toISOString(),
      certificate: getCertificateRating({
        score: aiAssessment.score,
        maxScore: aiAssessment.maxScore,
        bandSystem: aiAssessment.bandSystem,
        bandScore: aiAssessment.bandScore,
        languageCode: aiAssessment.course?.language?.code,
        languageName: aiAssessment.course?.language?.name,
      }),
    };
  }

  const attempt = await prisma.testAttempt.findUnique({
    where: { id: resultId },
    include: {
      test: {
        include: {
          course: { select: { id: true, name: true, language: { select: { name: true, code: true } } } },
          language: { select: { name: true, code: true } },
        },
      },
    },
  });

  if (!attempt) return null;
  if (attempt.userId !== user.id && user.role !== "ADMIN") {
    throw new Error(RESULT_FORBIDDEN_ERROR);
  }

  const stored = (attempt.results ?? {}) as Record<string, unknown>;
  const scoreOnly = stored.scoreOnlyAiFeedback === true;
  const resultLanguage = attempt.test.language ?? attempt.test.course?.language ?? null;

  return {
    id: attempt.id,
    type: "TEST",
    title: attempt.test.name,
    course: attempt.test.course,
    language: resultLanguage,
    score: attempt.score,
    maxScore: attempt.maxScore,
    band: {
      system: "GENERAL",
      level: estimateLevel(attempt.score, attempt.maxScore),
      score: attempt.score,
    },
    criteria: {
      totalQuestions: Number(stored.totalQuestions ?? 0),
      correctAnswers: Number(stored.correctAnswers ?? 0),
    },
    feedback: {
      summary: scoreOnly
        ? ""
        : attempt.isPassed
          ? "Bạn đã đạt bài test."
          : "Bạn cần ôn lại các kỹ năng còn yếu.",
      questionResults: Array.isArray(stored.questionResults) ? stored.questionResults : [],
      scoreOnly,
    },
    scoreOnly,
    mistakes: scoreOnly
      ? null
      : {
          wrongAnswers: Array.isArray(stored.questionResults)
            ? stored.questionResults.filter((item) => (item as Record<string, unknown>).isCorrect === false)
            : [],
        },
    improvements: scoreOnly
      ? null
      : {
          suggestions: [
            "Xem lại các câu sai và đọc phần giải thích.",
            "Làm lại bài sau khi ôn tập các kỹ năng còn yếu.",
            "Theo dõi lịch sử kết quả để đánh giá tiến bộ theo thời gian.",
          ],
        },
    durationSeconds: Math.max(0, Math.round((attempt.submittedAt.getTime() - attempt.startedAt.getTime()) / 1000)),
    submittedAt: attempt.submittedAt.toISOString(),
    certificate: getCertificateRating({
      score: attempt.score,
      maxScore: attempt.maxScore,
      languageCode: resultLanguage?.code,
      languageName: resultLanguage?.name,
    }),
    testId: attempt.testId,
  };
}
