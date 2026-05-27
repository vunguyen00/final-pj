import { prisma } from "@/lib/prisma";

export const COURSE_COMPLETION_POINTS = 50;
export const SPEAKING_AI_COST = 7;
export const WRITING_AI_COST = 3;
export const STREAK_3_DAY_POINTS = 7;
export const STREAK_7_DAY_POINTS = 20;

type ActivityType = "LESSON" | "QUIZ" | "SPEAKING" | "WRITING" | "PRACTICE_TEST" | "COURSE";

type PointTransactionInput = {
  userId: string;
  courseId?: string | null;
  type: string;
  amount: number;
  sourceKey: string;
  description: string;
  metadata?: Record<string, unknown>;
};

const LEGACY_COURSE_POINT_PREFIX = "AI_POINTS:COURSE_COMPLETED:";
const LEGACY_SPENT_POINT_PREFIX = "AI_POINTS:SPENT:";

function localDayKey(date = new Date()) {
  const local = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

function dayStartFromKey(dayKey: string) {
  return new Date(`${dayKey}T00:00:00.000Z`);
}

function normalizeKeyPart(value: string) {
  return value.trim().replace(/[^a-zA-Z0-9:_-]/g, "_");
}

async function getCurrentBalance(userId: string) {
  const [rows, legacy] = await Promise.all([
    prisma.pointTransaction.findMany({
      where: { userId },
      select: { amount: true },
    }),
    getLegacyPointSummary(userId),
  ]);

  return rows.reduce((sum, row) => sum + row.amount, legacy.earned - legacy.spent);
}

async function getLegacyPointSummary(userId: string) {
  const rows = await prisma.feedback.findMany({
    where: {
      userId,
      OR: [
        { content: { startsWith: LEGACY_COURSE_POINT_PREFIX } },
        { content: { startsWith: LEGACY_SPENT_POINT_PREFIX } },
      ],
    },
    select: { content: true },
  });

  let earned = 0;
  let spent = 0;

  for (const row of rows) {
    if (row.content.startsWith(LEGACY_COURSE_POINT_PREFIX)) {
      earned += COURSE_COMPLETION_POINTS;
      continue;
    }

    const payload = row.content.replace(LEGACY_SPENT_POINT_PREFIX, "");
    const [rawPoints] = payload.split(":");
    const value = Number(rawPoints);
    if (Number.isFinite(value) && value > 0) spent += value;
  }

  return { earned, spent };
}

export async function recordPointTransaction(input: PointTransactionInput) {
  const existing = await prisma.pointTransaction.findUnique({
    where: { sourceKey: input.sourceKey },
  });

  if (existing) {
    return { created: false, transaction: existing };
  }

  const balanceBefore = await getCurrentBalance(input.userId);
  const transaction = await prisma.pointTransaction.create({
    data: {
      userId: input.userId,
      courseId: input.courseId || null,
      type: input.type,
      amount: Math.trunc(input.amount),
      balanceAfter: balanceBefore + Math.trunc(input.amount),
      sourceKey: input.sourceKey,
      description: input.description,
      metadata: input.metadata ?? undefined,
    } as never,
  });

  return { created: true, transaction };
}

export async function grantCourseCompletionPoints(userId: string, courseId: string) {
  const result = await recordPointTransaction({
    userId,
    courseId,
    type: "COURSE_COMPLETED",
    amount: COURSE_COMPLETION_POINTS,
    sourceKey: `COURSE_COMPLETED:${userId}:${courseId}`,
    description: "Hoan thanh khoa hoc",
    metadata: { courseId },
  });

  return { awarded: result.created, points: result.created ? COURSE_COMPLETION_POINTS : 0 };
}

export async function spendAiPoints(
  userId: string,
  courseId: string | null,
  points: number,
  feature: string,
  sourceId?: string,
) {
  if (!Number.isFinite(points) || points <= 0) {
    throw new Error("INVALID_POINTS");
  }

  const summary = await getAiPointsSummary(userId);
  if (summary.available < points) {
    throw new Error("INSUFFICIENT_POINTS");
  }

  const normalizedFeature = normalizeKeyPart(feature.toUpperCase());
  const normalizedSource = normalizeKeyPart(sourceId || `${Date.now()}`);
  const result = await recordPointTransaction({
    userId,
    courseId,
    type: `${normalizedFeature}_SPENT`,
    amount: -Math.trunc(points),
    sourceKey: `AI_SPENT:${userId}:${normalizedFeature}:${normalizedSource}`,
    description:
      normalizedFeature === "SPEAKING_AI"
        ? "Speaking AI"
        : normalizedFeature === "WRITING_AI"
          ? "Writing AI"
          : feature,
    metadata: { feature, points },
  });

  return {
    spent: result.created ? points : 0,
    available: result.created ? summary.available - points : summary.available,
  };
}

async function calculateCurrentStreak(userId: string) {
  const activities = await prisma.learningActivity.findMany({
    where: { userId },
    select: { activityDate: true },
    orderBy: { activityDate: "desc" },
  });

  const activeDays = new Set(activities.map((activity) => activity.activityDate.toISOString().slice(0, 10)));
  let streak = 0;
  const cursor = dayStartFromKey(localDayKey());

  while (true) {
    const key = cursor.toISOString().slice(0, 10);
    if (!activeDays.has(key)) break;
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return streak;
}

async function awardStreakMilestones(userId: string, courseId?: string | null) {
  const streak = await calculateCurrentStreak(userId);
  const today = localDayKey();
  const awards: Array<{ days: number; points: number }> = [];

  if (streak === 3) awards.push({ days: 3, points: STREAK_3_DAY_POINTS });
  if (streak === 7) awards.push({ days: 7, points: STREAK_7_DAY_POINTS });

  for (const award of awards) {
    await recordPointTransaction({
      userId,
      courseId,
      type: `STREAK_${award.days}_DAYS`,
      amount: award.points,
      sourceKey: `STREAK:${award.days}:${userId}:${today}`,
      description: `Streak ${award.days} ngay`,
      metadata: { streakDays: award.days },
    });
  }

  return streak;
}

export async function recordLearningActivity(input: {
  userId: string;
  courseId?: string | null;
  activityType: ActivityType;
  sourceId: string;
}) {
  const dayKey = localDayKey();
  const sourceKey = `ACTIVITY:${input.userId}:${input.activityType}:${normalizeKeyPart(input.sourceId)}`;
  const existing = await prisma.learningActivity.findUnique({ where: { sourceKey } });

  if (existing) {
    const streak = await calculateCurrentStreak(input.userId);
    return { created: false, streak };
  }

  await prisma.learningActivity.create({
    data: {
      userId: input.userId,
      courseId: input.courseId || null,
      activityType: input.activityType,
      sourceKey,
      activityDate: dayStartFromKey(dayKey),
    },
  });

  const streak = await awardStreakMilestones(input.userId, input.courseId);
  return { created: true, streak };
}

export async function getAiPointsSummary(userId: string) {
  const [transactions, legacy, streak, speakingUses, writingUses] = await Promise.all([
    prisma.pointTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
    getLegacyPointSummary(userId),
    calculateCurrentStreak(userId),
    prisma.aiAssessment.count({ where: { userId, type: "SPEAKING" } }),
    prisma.aiAssessment.count({ where: { userId, type: "WRITING" } }),
  ]);

  const transactionEarned = transactions
    .filter((item) => item.amount > 0)
    .reduce((sum, item) => sum + item.amount, 0);
  const transactionSpent = Math.abs(
    transactions.filter((item) => item.amount < 0).reduce((sum, item) => sum + item.amount, 0),
  );

  const earned = transactionEarned + legacy.earned;
  const spent = transactionSpent + legacy.spent;

  return {
    earned,
    spent,
    available: Math.max(0, earned - spent),
    streak,
    speakingUses,
    writingUses,
    history: transactions.map((item) => ({
      id: item.id,
      type: item.type,
      amount: item.amount,
      balanceAfter: item.balanceAfter,
      description: item.description,
      createdAt: item.createdAt,
    })),
  };
}
