import { prisma } from "@/lib/prisma";

export async function getUserBalance(userId: string) {
  const [totalTopUp, totalSpent] = await prisma.$transaction([
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: {
        status: "SUCCESS",
        order: { userId },
      },
    }),
    prisma.orderItem.aggregate({
      _sum: { price: true },
      where: {
        order: { userId },
      },
    }),
  ]);

  return (totalTopUp._sum.amount ?? 0) - (totalSpent._sum.price ?? 0);
}

export async function createTopUp(userId: string, amount: number) {
  return prisma.order.create({
    data: {
      userId,
      payment: {
        create: {
          amount,
          status: "SUCCESS",
        },
      },
    },
  });
}

export async function createPendingTopUp(userId: string, amount: number, txnRef: string) {
  return prisma.order.create({
    data: {
      id: txnRef,
      userId,
      payment: {
        create: {
          amount,
          status: "PENDING",
        },
      },
    },
    include: {
      payment: true,
    },
  });
}

export async function findTopUpByTxnRef(txnRef: string) {
  return prisma.order.findUnique({
    where: { id: txnRef },
    include: { payment: true, user: true },
  });
}

export async function markTopUpResultByTxnRef(params: {
  txnRef: string;
  responseCode: string;
}) {
  const order = await prisma.order.findUnique({
    where: { id: params.txnRef },
    include: { payment: true },
  });

  if (!order?.payment) {
    return { updated: false as const, reason: "NOT_FOUND" as const };
  }

  const payment = order.payment;
  if (payment.status !== "PENDING") {
    return { updated: false as const, reason: "ALREADY_FINAL" as const, payment };
  }

  const status = params.responseCode === "00" ? "SUCCESS" : "FAILED";
  const result = await prisma.payment.updateMany({
    where: {
      id: payment.id,
      status: "PENDING",
    },
    data: {
      status,
    },
  });

  if (result.count === 0) {
    const latest = await prisma.payment.findUnique({ where: { id: payment.id } });
    return { updated: false as const, reason: "ALREADY_FINAL" as const, payment: latest ?? payment };
  }

  const updated = await prisma.payment.findUnique({ where: { id: payment.id } });
  if (!updated) {
    return { updated: false as const, reason: "NOT_FOUND" as const };
  }

  return { updated: true as const, payment: updated };
}

export function isValidTopUpAmount(amount: unknown) {
  return typeof amount === "number" && Number.isFinite(amount) && amount >= 10000;
}

export type WalletTransaction = {
  id: string;
  type: "TOP_UP" | "PURCHASE";
  amount: number;
  status: "SUCCESS";
  createdAt: string;
  courseName?: string;
};

export async function getWalletTransactions(userId: string): Promise<WalletTransaction[]> {
  const [topUps, purchases] = await prisma.$transaction([
    prisma.payment.findMany({
      where: {
        status: "SUCCESS",
        order: { userId },
      },
      select: {
        id: true,
        amount: true,
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
  ]);

  const txTopUp: WalletTransaction[] = topUps.map((item) => ({
    id: `topup-${item.id}`,
    type: "TOP_UP",
    amount: item.amount,
    status: "SUCCESS",
    createdAt: item.createdAt.toISOString(),
  }));

  const txPurchase: WalletTransaction[] = purchases.map((item) => ({
    id: `purchase-${item.id}`,
    type: "PURCHASE",
    amount: item.price,
    status: "SUCCESS",
    createdAt: item.order.createdAt.toISOString(),
    courseName: item.course.name,
  }));

  return [...txTopUp, ...txPurchase]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 100);
}

