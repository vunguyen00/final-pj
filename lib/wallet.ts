import type { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const MIN_TOP_UP_AMOUNT = 10000;
export const VNPAY_PROVIDER = "VNPAY";
export const PAYMENT_STATUS = {
  PENDING: "PENDING",
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
} as const;

type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

function isUniqueConstraintError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

export function normalizeTopUpAmount(amount: unknown) {
  const parsed =
    typeof amount === "string" && amount.trim() !== ""
      ? Number(amount)
      : typeof amount === "number"
        ? amount
        : NaN;

  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < MIN_TOP_UP_AMOUNT) {
    return null;
  }

  return parsed;
}

export function isValidTopUpAmount(amount: unknown) {
  return normalizeTopUpAmount(amount) !== null;
}

async function calculateLedgerBalance(userId: string) {
  const [totalTopUp, totalSpent, aiPointPurchases] = await prisma.$transaction([
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: {
        status: PAYMENT_STATUS.SUCCESS,
        userId,
      },
    }),
    prisma.orderItem.aggregate({
      _sum: { price: true },
      where: {
        order: { userId },
      },
    }),
    prisma.pointTransaction.findMany({
      where: {
        userId,
        type: "AI_POINTS_PURCHASE",
      },
      select: { metadata: true },
    }),
  ]);
  const totalAiPointSpent = aiPointPurchases.reduce((sum, item) => {
    const metadata = item.metadata as { cost?: unknown } | null;
    const cost = Number(metadata?.cost ?? 0);
    return sum + (Number.isFinite(cost) ? cost : 0);
  }, 0);

  return Math.round((totalTopUp._sum.amount ?? 0) - (totalSpent._sum.price ?? 0) - totalAiPointSpent);
}

export async function getOrCreateWallet(userId: string) {
  const existing = await prisma.wallet.findUnique({ where: { userId } });
  if (existing) {
    return existing;
  }

  const balance = await calculateLedgerBalance(userId);
  try {
    return await prisma.wallet.create({
      data: {
        userId,
        balance,
      },
    });
  } catch (error) {
    if (!isUniqueConstraintError(error)) {
      throw error;
    }

    const wallet = await prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) {
      throw error;
    }
    return wallet;
  }
}

export async function getUserBalance(userId: string) {
  const wallet = await getOrCreateWallet(userId);
  return wallet.balance;
}

export async function debitWalletForPurchase(params: {
  tx: Prisma.TransactionClient;
  userId: string;
  amount: number;
}) {
  const amount = Math.round(params.amount);
  const result = await params.tx.wallet.updateMany({
    where: {
      userId: params.userId,
      balance: { gte: amount },
    },
    data: {
      balance: { decrement: amount },
    },
  });

  if (result.count === 0) {
    throw new Error("INSUFFICIENT_BALANCE");
  }

  const wallet = await params.tx.wallet.findUnique({ where: { userId: params.userId } });
  if (!wallet) {
    throw new Error("WALLET_NOT_FOUND");
  }

  return wallet.balance;
}

export async function createTopUp(userId: string, amount: number) {
  const normalizedAmount = normalizeTopUpAmount(amount);
  if (normalizedAmount === null) {
    throw new Error("INVALID_TOP_UP_AMOUNT");
  }

  return prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        userId,
      },
    });

    const payment = await tx.payment.create({
      data: {
        orderId: order.id,
        userId,
        provider: VNPAY_PROVIDER,
        txnRef: order.id,
        amount: normalizedAmount,
        status: PAYMENT_STATUS.SUCCESS,
        orderInfo: `Manual wallet top-up ${order.id}`,
      },
    });

    await tx.wallet.upsert({
      where: { userId },
      create: { userId, balance: normalizedAmount },
      update: { balance: { increment: normalizedAmount } },
    });

    return { order, payment };
  });
}

export async function createPendingTopUp(params: {
  userId: string;
  amount: number;
  txnRef: string;
  orderInfo: string;
}) {
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
        provider: VNPAY_PROVIDER,
        txnRef: params.txnRef,
        amount: params.amount,
        status: PAYMENT_STATUS.PENDING,
        orderInfo: params.orderInfo,
      },
    });

    await tx.wallet.upsert({
      where: { userId: params.userId },
      create: { userId: params.userId, balance: 0 },
      update: { balance: { increment: 0 } },
    });

    return { order, payment };
  });
}

export async function findTopUpByTxnRef(txnRef: string) {
  return prisma.payment.findUnique({
    where: { txnRef },
    include: {
      order: true,
      user: true,
    },
  });
}

export async function getTopUpStatusByTxnRef(txnRef: string) {
  return prisma.payment.findUnique({
    where: { txnRef },
    select: {
      id: true,
      amount: true,
      status: true,
      responseCode: true,
      transactionStatus: true,
    },
  });
}

export async function confirmTopUpFromIpn(params: {
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
        amount: true,
        status: true,
      },
    });

    if (!payment) {
      return {
        kind: "NOT_FOUND" as const,
      };
    }

    const statusBefore = payment.status;
    if (statusBefore === PAYMENT_STATUS.SUCCESS) {
      return {
        kind: "ALREADY_SUCCESS" as const,
        amount: payment.amount,
        statusBefore,
        statusAfter: statusBefore,
      };
    }

    const isSuccess = params.responseCode === "00" && params.transactionStatus === "00";
    const statusAfter: PaymentStatus = isSuccess ? PAYMENT_STATUS.SUCCESS : PAYMENT_STATUS.FAILED;
    const updateResult = await tx.payment.updateMany({
      where: {
        id: payment.id,
        status: PAYMENT_STATUS.PENDING,
      },
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

    if (updateResult.count === 0) {
      const latest = await tx.payment.findUnique({
        where: { id: payment.id },
        select: { status: true },
      });

      return {
        kind: latest?.status === PAYMENT_STATUS.SUCCESS ? ("ALREADY_SUCCESS" as const) : ("ALREADY_FINAL" as const),
        amount: payment.amount,
        statusBefore,
        statusAfter: latest?.status ?? statusBefore,
      };
    }

    if (!isSuccess) {
      return {
        kind: "FAILED" as const,
        amount: payment.amount,
        statusBefore,
        statusAfter,
      };
    }

    const walletBefore = await tx.wallet.findUnique({
      where: { userId: payment.userId },
      select: { balance: true },
    });
    const walletBalanceBefore = walletBefore?.balance ?? 0;
    const wallet = await tx.wallet.upsert({
      where: { userId: payment.userId },
      create: {
        userId: payment.userId,
        balance: payment.amount,
      },
      update: {
        balance: { increment: payment.amount },
      },
    });

    return {
      kind: "SUCCESS" as const,
      amount: payment.amount,
      statusBefore,
      statusAfter,
      walletBalanceBefore,
      walletBalanceAfter: wallet.balance,
    };
  });
}

export type WalletTransaction = {
  id: string;
  type: "TOP_UP" | "PURCHASE" | "AI_POINT_PURCHASE";
  amount: number;
  status: string;
  createdAt: string;
  courseName?: string;
  points?: number;
};

export async function getWalletTransactions(userId: string): Promise<WalletTransaction[]> {
  const [topUps, purchases, aiPointPurchases] = await prisma.$transaction([
    prisma.payment.findMany({
      where: {
        userId,
      },
      select: {
        id: true,
        txnRef: true,
        amount: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.orderItem.findMany({
      where: {
        order: { userId },
      },
      select: {
        id: true,
        price: true,
        course: { select: { name: true } },
        order: { select: { createdAt: true } },
      },
      orderBy: { order: { createdAt: "desc" } },
      take: 50,
    }),
    prisma.pointTransaction.findMany({
      where: {
        userId,
        type: "AI_POINTS_PURCHASE",
      },
      select: {
        id: true,
        amount: true,
        metadata: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  const txTopUp: WalletTransaction[] = topUps.map((item) => ({
    id: `topup-${item.txnRef || item.id}`,
    type: "TOP_UP",
    amount: item.amount,
    status: item.status,
    createdAt: item.createdAt.toISOString(),
  }));

  const txPurchase: WalletTransaction[] = purchases.map((item) => ({
    id: `purchase-${item.id}`,
    type: "PURCHASE",
    amount: Math.round(item.price),
    status: PAYMENT_STATUS.SUCCESS,
    createdAt: item.order.createdAt.toISOString(),
    courseName: item.course.name,
  }));

  const txAiPointPurchase: WalletTransaction[] = aiPointPurchases.map((item) => {
    const metadata = item.metadata as { cost?: unknown; points?: unknown } | null;
    const cost = Number(metadata?.cost ?? 0);
    const points = Number(metadata?.points ?? item.amount);
    return {
      id: `ai-points-${item.id}`,
      type: "AI_POINT_PURCHASE",
      amount: Number.isFinite(cost) ? Math.round(cost) : 0,
      points: Number.isFinite(points) ? Math.round(points) : item.amount,
      status: PAYMENT_STATUS.SUCCESS,
      createdAt: item.createdAt.toISOString(),
    };
  });

  return [...txTopUp, ...txPurchase, ...txAiPointPurchase]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 100);
}
