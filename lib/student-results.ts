import type { AppRole } from "@/lib/auth";
import { Prisma } from "@/.generated/prisma/client";
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

export type StudentResultsPayload = {
  items: StudentResultItem[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  overview: {
    total: number;
    average: number;
    highest: number;
    lowest: number;
    passed: number;
    failed: number;
    passRate: number;
  };
  scoreTrend: Array<{ id: string; type: "TEST" | "SPEAKING" | "WRITING"; submittedAt: string; scorePercent: number }>;
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

export async function getStudentResults(
  user: Viewer,
  filterInput?: string | null,
  pageInput = 1,
  pageSizeInput = 10,
): Promise<StudentResultsPayload> {
  assertCanReadResults(user);
  const type = normalizeFilter(filterInput);
  const page = Math.max(1, Math.trunc(pageInput) || 1);
  const pageSize = Math.min(50, Math.max(1, Math.trunc(pageSizeInput) || 10));
  const sourceTake = type === "all" ? page * pageSize : pageSize;
  const sourceSkip = type === "all" ? 0 : (page - 1) * pageSize;

  const [testCount, aiCount, testAttempts, aiAssessments] = await Promise.all([
    type === "all" || type === "TEST"
      ? prisma.testAttempt.count({ where: { userId: user.id, test: { kind: { not: "TEACHER_ENTRANCE" } } } })
      : Promise.resolve(0),
    type === "all" || type === "SPEAKING" || type === "WRITING"
      ? prisma.aiAssessment.count({ where: { userId: user.id, ...(type === "SPEAKING" || type === "WRITING" ? { type } : {}) } })
      : Promise.resolve(0),
    type === "all" || type === "TEST"
      ? prisma.testAttempt.findMany({
          where: { userId: user.id, test: { kind: { not: "TEACHER_ENTRANCE" } } },
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
          skip: sourceSkip,
          take: sourceTake,
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
          skip: sourceSkip,
          take: sourceTake,
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

  const combinedItems = [...testItems, ...aiItems].sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
  );
  const items = type === "all"
    ? combinedItems.slice((page - 1) * pageSize, page * pageSize)
    : combinedItems.slice(0, pageSize);
  const totalItems = testCount + aiCount;

  const typeClause = type === "all" ? Prisma.empty : Prisma.sql`WHERE "type" = ${type}`;
  type AggregateRow = { total: number; average: number; highest: number; lowest: number; passed: number };
  type TrendRow = { id: string; type: "TEST" | "SPEAKING" | "WRITING"; submittedAt: Date; scorePercent: number };
  const [aggregateRows, trendRows] = await Promise.all([
    prisma.$queryRaw<AggregateRow[]>(Prisma.sql`
      WITH combined AS (
        SELECT 'TEST'::text AS "type",
               CASE WHEN attempt."maxScore" > 0 THEN (attempt."score" / attempt."maxScore") * 100 ELSE 0 END AS percent,
               attempt."isPassed" AS passed
        FROM "TestAttempt" attempt
        INNER JOIN "Test" test ON test."id" = attempt."testId"
        WHERE attempt."userId" = ${user.id} AND test."kind" <> 'TEACHER_ENTRANCE'
        UNION ALL
        SELECT "type"::text AS "type",
               CASE WHEN "maxScore" > 0 THEN ("score" / "maxScore") * 100 ELSE 0 END AS percent,
               CASE WHEN "maxScore" > 0 THEN ("score" / "maxScore") * 100 >= 50 ELSE false END AS passed
        FROM "AiAssessment" WHERE "userId" = ${user.id}
      ), filtered AS (SELECT * FROM combined ${typeClause})
      SELECT COUNT(*)::int AS total,
             COALESCE(AVG(percent), 0)::float8 AS average,
             COALESCE(MAX(percent), 0)::float8 AS highest,
             COALESCE(MIN(percent), 0)::float8 AS lowest,
             COALESCE(SUM(CASE WHEN passed THEN 1 ELSE 0 END), 0)::int AS passed
      FROM filtered
    `),
    prisma.$queryRaw<TrendRow[]>(Prisma.sql`
      WITH combined AS (
        SELECT attempt."id", 'TEST'::text AS "type", attempt."submittedAt",
               CASE WHEN attempt."maxScore" > 0 THEN (attempt."score" / attempt."maxScore") * 100 ELSE 0 END AS "scorePercent"
        FROM "TestAttempt" attempt
        INNER JOIN "Test" test ON test."id" = attempt."testId"
        WHERE attempt."userId" = ${user.id} AND test."kind" <> 'TEACHER_ENTRANCE'
        UNION ALL
        SELECT "id", "type"::text AS "type", "submittedAt",
               CASE WHEN "maxScore" > 0 THEN ("score" / "maxScore") * 100 ELSE 0 END AS "scorePercent"
        FROM "AiAssessment" WHERE "userId" = ${user.id}
      )
      SELECT * FROM combined ${typeClause} ORDER BY "submittedAt" DESC LIMIT 120
    `),
  ]);
  const aggregate = aggregateRows[0] ?? { total: 0, average: 0, highest: 0, lowest: 0, passed: 0 };

  return {
    items,
    page,
    pageSize,
    totalItems,
    totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
    overview: {
      total: aggregate.total,
      average: Math.round(aggregate.average * 10) / 10,
      highest: Math.round(aggregate.highest * 10) / 10,
      lowest: Math.round(aggregate.lowest * 10) / 10,
      passed: aggregate.passed,
      failed: Math.max(0, aggregate.total - aggregate.passed),
      passRate: aggregate.total ? Math.round((aggregate.passed / aggregate.total) * 1000) / 10 : 0,
    },
    scoreTrend: trendRows.reverse().map((row) => ({
      id: row.id,
      type: row.type,
      submittedAt: row.submittedAt.toISOString(),
      scorePercent: Math.round(row.scorePercent * 10) / 10,
    })),
  };
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
