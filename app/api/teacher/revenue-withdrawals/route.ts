import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  calculateAvailableTeacherRevenue,
  REVENUE_ELIGIBLE_ORDER_ITEM_WHERE,
  RESERVED_WITHDRAWAL_STATUSES,
} from "@/lib/teacher-revenue";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "TEACHER") {
    return NextResponse.json({ error: "Chi giang vien moi co the xem doanh thu." }, { status: 403 });
  }

  const [earned, reserved, withdrawals, notifications, unreadNotificationCount, bankAccount] = await Promise.all([
    prisma.orderItem.aggregate({
      where: {
        course: { instructorId: user.id },
        ...REVENUE_ELIGIBLE_ORDER_ITEM_WHERE,
      },
      _sum: { teacherRevenue: true },
    }),
    prisma.teacherRevenueWithdrawal.aggregate({
      where: {
        teacherId: user.id,
        status: { in: [...RESERVED_WITHDRAWAL_STATUSES] },
      },
      _sum: { amount: true },
    }),
    prisma.teacherRevenueWithdrawal.findMany({
      where: { teacherId: user.id },
      select: {
        id: true,
        amount: true,
        bankName: true,
        accountNumber: true,
        accountName: true,
        status: true,
        note: true,
        createdAt: true,
        complaint: {
          select: {
            id: true,
            reason: true,
            reportedAmount: true,
            message: true,
            evidenceImageUrl: true,
            evidenceImageName: true,
            status: true,
            adminNote: true,
            resolvedAt: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.notification.findMany({
      where: {
        userId: user.id,
        title: { contains: "doanh thu", mode: "insensitive" },
      },
      select: { id: true, title: true, body: true, readAt: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.notification.count({
      where: {
        userId: user.id,
        title: { contains: "doanh thu", mode: "insensitive" },
        readAt: null,
      },
    }),
    prisma.teacherBankAccount.findUnique({
      where: { teacherId: user.id },
      select: {
        bankName: true,
        accountNumber: true,
        accountName: true,
        branch: true,
        verificationStatus: true,
        updatedAt: true,
      },
    }),
  ]);

  return NextResponse.json({
    availableRevenue: calculateAvailableTeacherRevenue(earned._sum.teacherRevenue ?? 0, reserved._sum.amount ?? 0),
    bankAccount: bankAccount ? { ...bankAccount, updatedAt: bankAccount.updatedAt.toISOString() } : null,
    unreadNotificationCount,
    withdrawals: withdrawals.map((item) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
      complaint: item.complaint
        ? {
            ...item.complaint,
            createdAt: item.complaint.createdAt.toISOString(),
            resolvedAt: item.complaint.resolvedAt?.toISOString() ?? null,
          }
        : null,
    })),
    notifications: notifications.map((item) => ({
      ...item,
      readAt: item.readAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
    })),
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "TEACHER") {
    return NextResponse.json({ error: "Chi giang vien moi co the rut doanh thu." }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Du lieu yeu cau khong hop le." }, { status: 400 });
  }

  const amount = Number(body.amount);

  if (!Number.isSafeInteger(amount) || amount <= 0) {
    return NextResponse.json({ error: "So tien rut phai la so nguyen lon hon 0." }, { status: 400 });
  }

  const savedBankAccount = await prisma.teacherBankAccount.findUnique({
    where: { teacherId: user.id },
  });

  if (!savedBankAccount || savedBankAccount.verificationStatus !== "VERIFIED") {
    return NextResponse.json(
      { error: "Vui lòng lưu và xác thực OTP tài khoản nhận tiền trước khi tạo yêu cầu rút tiền." },
      { status: 400 },
    );
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const [earned, reserved] = await Promise.all([
        tx.orderItem.aggregate({
          where: {
            course: { instructorId: user.id },
            ...REVENUE_ELIGIBLE_ORDER_ITEM_WHERE,
          },
          _sum: { teacherRevenue: true },
        }),
        tx.teacherRevenueWithdrawal.aggregate({
          where: {
            teacherId: user.id,
            status: { in: [...RESERVED_WITHDRAWAL_STATUSES] },
          },
          _sum: { amount: true },
        }),
      ]);

      const available = calculateAvailableTeacherRevenue(
        earned._sum.teacherRevenue ?? 0,
        reserved._sum.amount ?? 0,
      );
      if (amount > available) {
        throw new Error("INSUFFICIENT_REVENUE");
      }

      const withdrawal = await tx.teacherRevenueWithdrawal.create({
        data: {
          teacherId: user.id,
          amount,
          bankName: savedBankAccount.bankName,
          accountNumber: savedBankAccount.accountNumber,
          accountName: savedBankAccount.accountName,
          bankBranch: savedBankAccount.branch,
          bankVerificationStatus: savedBankAccount.verificationStatus,
        },
      });

      return { withdrawal, bankAccount: savedBankAccount, available: available - amount };
    }, { isolationLevel: "Serializable" });

    return NextResponse.json({ success: true, ...result }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "INSUFFICIENT_REVENUE") {
      return NextResponse.json({ error: "So tien rut vuot qua doanh thu kha dung." }, { status: 400 });
    }
    console.error("Create teacher revenue withdrawal failed", error);
    return NextResponse.json({ error: "Chua the tao yeu cau rut tien. Vui long thu lai." }, { status: 500 });
  }
}
