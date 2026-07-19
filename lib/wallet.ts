import type { Prisma } from "@/.generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const VNPAY_PROVIDER = "VNPAY";
export const PAYMENT_STATUS = {
  PENDING: "PENDING",
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
} as const;

type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

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
