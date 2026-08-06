import type { Prisma } from "@/.generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { calculateCourseRevenueSplit } from "@/lib/revenue";
import { VNPAY_PROVIDER } from "@/lib/payment-provider";

export const COURSE_PAYMENT_STATUS = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  PAID: "PAID",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
  EXPIRED: "EXPIRED",
} as const;

export const COURSE_PAYMENT_EXPIRE_MINUTES = 15;

export function normalizeCoursePrice(price: number) {
  return Math.max(0, Math.round(price));
}

export async function createPendingCoursePayment(params: {
  userId: string;
  courseId: string;
  amount: number;
  txnRef: string;
  orderInfo: string;
}) {
  const expiresAt = new Date(Date.now() + COURSE_PAYMENT_EXPIRE_MINUTES * 60 * 1000);

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
        courseId: params.courseId,
        provider: VNPAY_PROVIDER,
        txnRef: params.txnRef,
        amount: params.amount,
        status: COURSE_PAYMENT_STATUS.PENDING,
        orderInfo: params.orderInfo,
        expiresAt,
      },
    });

    return { order, payment };
  });
}

export async function getCoursePaymentStatusByTxnRef(txnRef: string) {
  return prisma.payment.findUnique({
    where: { txnRef },
    select: {
      id: true,
      userId: true,
      courseId: true,
      purpose: true,
      amount: true,
      status: true,
      expiresAt: true,
      responseCode: true,
      transactionStatus: true,
    },
  });
}

export async function confirmCoursePaymentFromVnpay(params: {
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
        orderId: true,
        userId: true,
        courseId: true,
        amount: true,
        status: true,
        expiresAt: true,
      },
    });

    if (!payment || !payment.courseId || !payment.orderId) {
      return { kind: "NOT_FOUND" as const };
    }

    if (payment.status === COURSE_PAYMENT_STATUS.PAID) {
      return {
        kind: "ALREADY_PAID" as const,
        amount: payment.amount,
        courseId: payment.courseId,
        statusBefore: payment.status,
        statusAfter: payment.status,
      };
    }

    if (payment.status !== COURSE_PAYMENT_STATUS.PENDING) {
      return {
        kind: "ALREADY_FINAL" as const,
        amount: payment.amount,
        courseId: payment.courseId,
        statusBefore: payment.status,
        statusAfter: payment.status,
      };
    }

    const claim = await tx.payment.updateMany({
      where: { id: payment.id, status: COURSE_PAYMENT_STATUS.PENDING },
      data: { status: COURSE_PAYMENT_STATUS.PROCESSING },
    });
    if (claim.count === 0) {
      const latest = await tx.payment.findUnique({
        where: { id: payment.id },
        select: { status: true },
      });
      return {
        kind:
          latest?.status === COURSE_PAYMENT_STATUS.PAID
            ? ("ALREADY_PAID" as const)
            : ("ALREADY_FINAL" as const),
        amount: payment.amount,
        courseId: payment.courseId,
        statusBefore: payment.status,
        statusAfter: latest?.status ?? payment.status,
      };
    }

    const now = new Date();
    const isExpired = Boolean(payment.expiresAt && payment.expiresAt < now);
    const isSuccess = params.responseCode === "00" && params.transactionStatus === "00" && !isExpired;
    const statusAfter = isSuccess
      ? COURSE_PAYMENT_STATUS.PAID
      : isExpired
        ? COURSE_PAYMENT_STATUS.EXPIRED
        : params.responseCode === "24"
          ? COURSE_PAYMENT_STATUS.CANCELLED
          : COURSE_PAYMENT_STATUS.FAILED;

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
        amount: payment.amount,
        courseId: payment.courseId,
        statusBefore: payment.status,
        statusAfter,
      };
    }

    const course = await tx.course.findUnique({
      where: { id: payment.courseId },
      select: {
        id: true,
        price: true,
        instructor: { select: { role: true } },
      },
    });
    if (!course) {
      throw new Error("COURSE_NOT_FOUND");
    }

    const coursePrice = normalizeCoursePrice(course.price);
    if (coursePrice !== payment.amount) {
      throw new Error("COURSE_PRICE_MISMATCH");
    }

    const revenueSplit = calculateCourseRevenueSplit(payment.amount, course.instructor?.role);
    await tx.orderItem.upsert({
      where: {
        orderId_courseId: {
          orderId: payment.orderId,
          courseId: payment.courseId,
        },
      },
      create: {
          orderId: payment.orderId,
          courseId: payment.courseId,
          price: payment.amount,
          adminRevenue: revenueSplit.adminRevenue,
          teacherRevenue: revenueSplit.teacherRevenue,
          revenueSplit: revenueSplit.revenueSplit,
      },
      update: {},
    });

    await tx.enrollment.upsert({
      where: {
        userId_courseId: {
          userId: payment.userId,
          courseId: payment.courseId,
        },
      },
      create: {
        userId: payment.userId,
        courseId: payment.courseId,
      },
      update: {},
    });

    return {
      kind: "SUCCESS" as const,
      amount: payment.amount,
      courseId: payment.courseId,
      statusBefore: payment.status,
      statusAfter,
    };
  });
}
