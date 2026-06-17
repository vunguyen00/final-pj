import { randomUUID } from "node:crypto";
import type { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { debitWalletForPurchase } from "@/lib/wallet";

export const COURSE_COMPLETION_POINTS = 0;
export const SPEAKING_AI_COST = 7;
export const WRITING_AI_COST = 3;
export const STREAK_3_DAY_POINTS = 0;
export const STREAK_7_DAY_POINTS = 0;
export const AI_POINT_PRICE_VND = Math.max(1, Number(process.env.AI_POINT_PRICE_VND ?? 1000));

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

type PointClient = typeof prisma | Prisma.TransactionClient;

const AI_POINT_BALANCE_TYPES = new Set(["AI_POINTS_PURCHASE", "AI_POINTS_ADMIN_GRANT"]);

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

function isUsablePointTransaction(item: { type: string; amount: number }) {
  if (item.amount < 0) return item.type.toUpperCase().includes("_SPENT");
  return AI_POINT_BALANCE_TYPES.has(item.type.toUpperCase());
}

function getBeanPointDescription(item: { type: string; amount: number; description: string }) {
  if (item.type === "AI_POINTS_PURCHASE") {
    return `Mua ${item.amount} hạt đậu`;
  }
  if (item.type === "AI_POINTS_ADMIN_GRANT") {
    return `Được cấp ${item.amount} hạt đậu`;
  }
  return item.description
    .replace(new RegExp("diem\\s+AI", "gi"), "hạt đậu")
    .replace(new RegExp("\\u0111i\\u1ec3m\\s+AI", "gi"), "hạt đậu");
}

async function getCurrentBalance(userId: string, client: PointClient = prisma) {
  const rows = await client.pointTransaction.findMany({
    where: { userId },
    select: { type: true, amount: true },
  });

  return rows
    .filter(isUsablePointTransaction)
    .reduce((sum, row) => sum + row.amount, 0);
}

async function recordPointTransactionWithClient(client: PointClient, input: PointTransactionInput) {
  const existing = await client.pointTransaction.findUnique({
    where: { sourceKey: input.sourceKey },
  });

  if (existing) {
    return { created: false, transaction: existing };
  }

  const amount = Math.trunc(input.amount);
  const balanceBefore = await getCurrentBalance(input.userId, client);
  const transaction = await client.pointTransaction.create({
    data: {
      userId: input.userId,
      courseId: input.courseId || null,
      type: input.type,
      amount,
      balanceAfter: balanceBefore + amount,
      sourceKey: input.sourceKey,
      description: input.description,
      metadata: input.metadata ?? undefined,
    } as never,
  });

  return { created: true, transaction };
}

export async function recordPointTransaction(input: PointTransactionInput) {
  return recordPointTransactionWithClient(prisma, input);
}

export async function grantCourseCompletionPoints(userId: string, courseId: string) {
  void userId;
  void courseId;
  return { awarded: false, points: 0 };
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

  const normalizedPoints = Math.trunc(points);
  const normalizedFeature = normalizeKeyPart(feature.toUpperCase());
  const normalizedSource = normalizeKeyPart(sourceId || `${Date.now()}`);
  const result = await recordPointTransaction({
    userId,
    courseId,
    type: `${normalizedFeature}_SPENT`,
    amount: -normalizedPoints,
    sourceKey: `AI_SPENT:${userId}:${normalizedFeature}:${normalizedSource}`,
    description:
      normalizedFeature === "SPEAKING_AI"
        ? "Speaking AI"
        : normalizedFeature === "WRITING_AI"
          ? "Writing AI"
          : feature,
    metadata: { feature, points: normalizedPoints },
  });

  return {
    spent: result.created ? normalizedPoints : 0,
    available: result.created ? summary.available - normalizedPoints : summary.available,
  };
}

export async function purchaseAiPointsWithWallet(userId: string, points: number) {
  const normalizedPoints = Math.trunc(Number(points));
  if (!Number.isFinite(normalizedPoints) || normalizedPoints <= 0) {
    throw new Error("INVALID_POINTS");
  }

  const cost = normalizedPoints * AI_POINT_PRICE_VND;

  return prisma.$transaction(async (tx) => {
    const walletBalance = await debitWalletForPurchase({
      tx,
      userId,
      amount: cost,
    });

    const result = await recordPointTransactionWithClient(tx, {
      userId,
      type: "AI_POINTS_PURCHASE",
      amount: normalizedPoints,
      sourceKey: `AI_POINTS_PURCHASE:${userId}:${randomUUID()}`,
      description: `Mua ${normalizedPoints} hạt đậu`,
      metadata: {
        points: normalizedPoints,
        cost,
        pricePerPoint: AI_POINT_PRICE_VND,
      },
    });

    return {
      points: result.created ? normalizedPoints : 0,
      cost,
      available: result.transaction.balanceAfter,
      walletBalance,
      pricePerPoint: AI_POINT_PRICE_VND,
    };
  });
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

  const streak = await calculateCurrentStreak(input.userId);
  return { created: true, streak };
}

export async function getAiPointsSummary(userId: string) {
  const [transactions, streak, speakingUses, writingUses] = await Promise.all([
    prisma.pointTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
    calculateCurrentStreak(userId),
    prisma.aiAssessment.count({ where: { userId, type: "SPEAKING" } }),
    prisma.aiAssessment.count({ where: { userId, type: "WRITING" } }),
  ]);

  const usableTransactions = transactions.filter(isUsablePointTransaction);
  const earned = usableTransactions
    .filter((item) => item.amount > 0)
    .reduce((sum, item) => sum + item.amount, 0);
  const spent = Math.abs(
    usableTransactions.filter((item) => item.amount < 0).reduce((sum, item) => sum + item.amount, 0),
  );

  return {
    earned,
    spent,
    available: Math.max(0, earned - spent),
    pointPriceVnd: AI_POINT_PRICE_VND,
    streak,
    speakingUses,
    writingUses,
    history: usableTransactions.map((item) => ({
      id: item.id,
      type: item.type,
      amount: item.amount,
      balanceAfter: item.balanceAfter,
      description: getBeanPointDescription(item),
      createdAt: item.createdAt,
    })),
  };
}
