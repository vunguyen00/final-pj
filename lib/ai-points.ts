import type { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { VNPAY_PROVIDER } from "@/lib/wallet";

export const COURSE_COMPLETION_POINTS = 0;
export const SPEAKING_AI_COST = 7;
export const WRITING_AI_COST = 3;
export const STREAK_3_DAY_POINTS = 0;
export const STREAK_7_DAY_POINTS = 0;
export const AI_POINT_PRICE_VND = Math.max(1, Number(process.env.AI_POINT_PRICE_VND ?? 1000));
export const AI_POINT_PAYMENT_PURPOSE = "AI_POINTS_PURCHASE";
export const AI_POINT_PAYMENT_EXPIRE_MINUTES = 15;
export const AI_POINT_PAYMENT_STATUS = {
  PENDING: "PENDING",
  PAID: "PAID",
  PROCESSING: "PROCESSING",
  USED: "USED",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
  EXPIRED: "EXPIRED",
} as const;

export const AI_FEEDBACK_FEATURES = new Set([
  "WRITING_AI",
  "SPEAKING_AI",
  "TEST_AI_FEEDBACK",
]);

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

function base64urlDecode(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
  return Buffer.from(normalized + padding, "base64").toString("utf8");
}

export function normalizeAiFeedbackFeature(value: unknown) {
  const feature = typeof value === "string" ? normalizeKeyPart(value.toUpperCase()) : "";
  return AI_FEEDBACK_FEATURES.has(feature) ? feature : null;
}

export function getAiFeedbackCost(feature: string) {
  if (feature === "SPEAKING_AI") return SPEAKING_AI_COST;
  if (feature === "WRITING_AI") return WRITING_AI_COST;
  if (feature === "TEST_AI_FEEDBACK") return SPEAKING_AI_COST;
  throw new Error("INVALID_AI_FEEDBACK_FEATURE");
}

export function normalizeAiReturnTo(value: unknown) {
  if (typeof value !== "string") return "/student/results";
  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes("\\")) {
    return "/student/results";
  }
  return trimmed.slice(0, 500);
}

function buildAiPaymentOrderInfo(params: {
  points: number;
  txnRef: string;
}) {
  return `AI_POINTS|${params.points}|${params.txnRef}`;
}

export function parseAiPaymentOrderInfo(orderInfo?: string | null) {
  const [kind, second, encodedReturnTo] = String(orderInfo || "").split("|");
  if (kind === "AI_POINTS") {
    const points = normalizeAiPointAmount(second);
    return { feature: null as string | null, returnTo: "/student/wallet", points };
  }
  if (kind !== "AI_FEEDBACK") {
    return { feature: null as string | null, returnTo: "/student/wallet", points: null as number | null };
  }
  const normalizedFeature = normalizeAiFeedbackFeature(second);
  let returnTo = "/student/results";
  try {
    returnTo = normalizeAiReturnTo(base64urlDecode(encodedReturnTo || ""));
  } catch {
    returnTo = "/student/results";
  }
  return { feature: normalizedFeature, returnTo, points: null as number | null };
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
  return prisma.$transaction(
    (tx) => spendAiPointsWithClient(tx, userId, courseId, points, feature, sourceId),
    { isolationLevel: "Serializable" },
  );
}

export async function spendAiPointsWithClient(
  client: Prisma.TransactionClient,
  userId: string,
  courseId: string | null,
  points: number,
  feature: string,
  sourceId?: string,
) {
  if (!Number.isFinite(points) || points <= 0) {
    throw new Error("INVALID_POINTS");
  }

  const availableBefore = await getCurrentBalance(userId, client);
  if (availableBefore < points) {
    throw new Error("INSUFFICIENT_POINTS");
  }

  const normalizedPoints = Math.trunc(points);
  const normalizedFeature = normalizeKeyPart(feature.toUpperCase());
  const normalizedSource = normalizeKeyPart(sourceId || `${Date.now()}`);
  const result = await recordPointTransactionWithClient(client, {
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
    available: result.created ? result.transaction.balanceAfter : availableBefore,
  };
}

export function normalizeAiPointAmount(points: unknown) {
  const normalizedPoints = Math.trunc(Number(points));
  if (!Number.isFinite(normalizedPoints) || normalizedPoints <= 0) {
    return null;
  }
  return normalizedPoints;
}

export function getAiPointPurchaseCost(points: number) {
  return points * AI_POINT_PRICE_VND;
}

export async function createPendingAiPointPayment(params: {
  userId: string;
  points: number;
  txnRef: string;
}) {
  const normalizedPoints = normalizeAiPointAmount(params.points);
  if (normalizedPoints === null) {
    throw new Error("INVALID_POINTS");
  }

  const amount = getAiPointPurchaseCost(normalizedPoints);
  const expiresAt = new Date(Date.now() + AI_POINT_PAYMENT_EXPIRE_MINUTES * 60 * 1000);

  return prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        userId: params.userId,
      },
    });

    const payment = await tx.payment.create({
      data: {
        orderId: order.id,
        userId: params.userId,
        purpose: AI_POINT_PAYMENT_PURPOSE,
        pointAmount: normalizedPoints,
        provider: VNPAY_PROVIDER,
        txnRef: params.txnRef,
        amount,
        status: AI_POINT_PAYMENT_STATUS.PENDING,
        orderInfo: buildAiPaymentOrderInfo({ points: normalizedPoints, txnRef: params.txnRef }),
        expiresAt,
      },
    });

    return { order, payment };
  });
}

export async function getAiPointPaymentStatusByTxnRef(txnRef: string) {
  return prisma.payment.findUnique({
    where: { txnRef },
    select: {
      id: true,
      userId: true,
      purpose: true,
      pointAmount: true,
      amount: true,
      status: true,
      expiresAt: true,
      orderInfo: true,
    },
  });
}

export async function confirmAiPointPaymentFromVnpay(params: {
  txnRef: string;
  responseCode: string;
  transactionStatus: string;
  bankCode?: string;
  payDate?: string;
  transactionNo?: string;
  rawResponse: Record<string, string>;
}) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { txnRef: params.txnRef },
      select: {
        id: true,
        userId: true,
        purpose: true,
        pointAmount: true,
        amount: true,
        status: true,
        expiresAt: true,
      },
    });

    if (!payment || payment.purpose !== AI_POINT_PAYMENT_PURPOSE || !payment.pointAmount) {
      return { kind: "NOT_FOUND" as const };
    }

    if (payment.status === AI_POINT_PAYMENT_STATUS.PAID || payment.status === AI_POINT_PAYMENT_STATUS.USED) {
      return {
        kind: "ALREADY_PAID" as const,
        points: payment.pointAmount,
        amount: payment.amount,
        statusBefore: payment.status,
        statusAfter: payment.status,
      };
    }

    if (payment.status !== AI_POINT_PAYMENT_STATUS.PENDING) {
      return {
        kind: "ALREADY_FINAL" as const,
        points: payment.pointAmount,
        amount: payment.amount,
        statusBefore: payment.status,
        statusAfter: payment.status,
      };
    }

    const expectedAmount = getAiPointPurchaseCost(payment.pointAmount);
    if (expectedAmount !== payment.amount) {
      throw new Error("AI_POINT_AMOUNT_MISMATCH");
    }

    const isExpired = Boolean(payment.expiresAt && payment.expiresAt < new Date());
    const isSuccess = params.responseCode === "00" && params.transactionStatus === "00" && !isExpired;
    const statusAfter = isSuccess
      ? AI_POINT_PAYMENT_STATUS.PAID
      : isExpired
        ? AI_POINT_PAYMENT_STATUS.EXPIRED
        : params.responseCode === "24"
          ? AI_POINT_PAYMENT_STATUS.CANCELLED
          : AI_POINT_PAYMENT_STATUS.FAILED;

    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: statusAfter,
        bankCode: params.bankCode,
        payDate: params.payDate,
        transactionNo: params.transactionNo,
        responseCode: params.responseCode,
        transactionStatus: params.transactionStatus,
        rawResponse: params.rawResponse as Prisma.InputJsonObject,
      },
    });

    if (!isSuccess) {
      return {
        kind: statusAfter as "FAILED" | "CANCELLED" | "EXPIRED",
        points: payment.pointAmount,
        amount: payment.amount,
        statusBefore: payment.status,
        statusAfter,
      };
    }

    await recordPointTransactionWithClient(tx, {
      userId: payment.userId,
      type: "AI_POINTS_PURCHASE",
      amount: payment.pointAmount,
      sourceKey: `AI_POINTS_PAYMENT:${payment.id}`,
      description: `Mua ${payment.pointAmount} hạt đậu`,
      metadata: {
        points: payment.pointAmount,
        cost: payment.amount,
        pricePerPoint: AI_POINT_PRICE_VND,
        txnRef: params.txnRef,
      },
    });

    return {
      kind: "SUCCESS" as const,
      points: payment.pointAmount,
      amount: payment.amount,
      statusBefore: payment.status,
      statusAfter,
    };
  });
}

export async function reservePaidAiFeedbackPayment(params: {
  txnRef: string;
  userId: string;
  feature: string;
  expectedPoints: number;
}) {
  const normalizedFeature = normalizeAiFeedbackFeature(params.feature);
  if (!normalizedFeature) {
    throw new Error("INVALID_AI_FEEDBACK_FEATURE");
  }

  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { txnRef: params.txnRef },
      select: {
        id: true,
        userId: true,
        purpose: true,
        pointAmount: true,
        status: true,
        orderInfo: true,
      },
    });

    const info = parseAiPaymentOrderInfo(payment?.orderInfo);
    if (
      !payment ||
      payment.userId !== params.userId ||
      payment.purpose !== AI_POINT_PAYMENT_PURPOSE ||
      payment.pointAmount !== params.expectedPoints ||
      payment.status !== AI_POINT_PAYMENT_STATUS.PAID ||
      info.feature !== normalizedFeature
    ) {
      throw new Error("AI_PAYMENT_REQUIRED");
    }

    const updated = await tx.payment.updateMany({
      where: {
        id: payment.id,
        status: AI_POINT_PAYMENT_STATUS.PAID,
      },
      data: { status: AI_POINT_PAYMENT_STATUS.PROCESSING },
    });

    if (updated.count === 0) {
      throw new Error("AI_PAYMENT_REQUIRED");
    }

    return { paymentId: payment.id };
  });
}

export async function completePaidAiFeedbackPayment(paymentId: string) {
  await prisma.payment.updateMany({
    where: { id: paymentId, status: AI_POINT_PAYMENT_STATUS.PROCESSING },
    data: { status: AI_POINT_PAYMENT_STATUS.USED },
  });
}

export async function releasePaidAiFeedbackPayment(paymentId: string) {
  await prisma.payment.updateMany({
    where: { id: paymentId, status: AI_POINT_PAYMENT_STATUS.PROCESSING },
    data: { status: AI_POINT_PAYMENT_STATUS.PAID },
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
