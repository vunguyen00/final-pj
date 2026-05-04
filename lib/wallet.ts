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

export function isValidTopUpAmount(amount: unknown) {
  return typeof amount === "number" && Number.isFinite(amount) && amount >= 10000;
}

