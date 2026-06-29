import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type ComplaintReason = "NOT_RECEIVED" | "WRONG_AMOUNT" | "OTHER";

const reasonLabels: Record<ComplaintReason, string> = {
  NOT_RECEIVED: "chưa nhận được tiền",
  WRONG_AMOUNT: "số tiền nhận được không đúng",
  OTHER: "vấn đề khác",
};

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function isComplaintReason(value: unknown): value is ComplaintReason {
  return value === "NOT_RECEIVED" || value === "WRONG_AMOUNT" || value === "OTHER";
}

function serializeComplaint(complaint: {
  id: string;
  reason: ComplaintReason;
  reportedAmount: number | null;
  message: string;
  status: "OPEN" | "RESOLVED" | "REJECTED";
  adminNote: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
}) {
  return {
    ...complaint,
    resolvedAt: complaint.resolvedAt?.toISOString() ?? null,
    createdAt: complaint.createdAt.toISOString(),
  };
}

export async function POST(request: Request, { params }: { params: Promise<{ withdrawalId: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "TEACHER") {
    return NextResponse.json({ error: "Chỉ giảng viên mới có thể gửi khiếu nại rút doanh thu." }, { status: 403 });
  }

  const { withdrawalId } = await params;
  const body = (await request.json().catch(() => null)) as {
    reason?: unknown;
    reportedAmount?: unknown;
    message?: unknown;
  } | null;

  const reason = body?.reason;
  const message = cleanText(body?.message, 1000);
  const rawReportedAmount = body?.reportedAmount;
  const reportedAmount = rawReportedAmount === null || rawReportedAmount === "" || typeof rawReportedAmount === "undefined"
    ? null
    : Number(rawReportedAmount);

  if (!isComplaintReason(reason)) {
    return NextResponse.json({ error: "Vui lòng chọn lý do khiếu nại hợp lệ." }, { status: 400 });
  }
  if (message.length < 20) {
    return NextResponse.json({ error: "Vui lòng mô tả vấn đề ít nhất 20 ký tự." }, { status: 400 });
  }
  if (
    reason === "WRONG_AMOUNT" &&
    (reportedAmount === null || !Number.isSafeInteger(reportedAmount) || reportedAmount < 0)
  ) {
    return NextResponse.json({ error: "Vui lòng nhập số tiền thực nhận hợp lệ." }, { status: 400 });
  }
  if (reportedAmount !== null && (!Number.isSafeInteger(reportedAmount) || reportedAmount < 0)) {
    return NextResponse.json({ error: "Số tiền thực nhận không hợp lệ." }, { status: 400 });
  }

  try {
    const complaint = await prisma.$transaction(async (tx) => {
      const withdrawal = await tx.teacherRevenueWithdrawal.findUnique({
        where: { id: withdrawalId },
        include: { complaint: true },
      });
      if (!withdrawal || withdrawal.teacherId !== user.id) throw new Error("NOT_FOUND");
      if (withdrawal.status !== "PAID") throw new Error("INVALID_STATUS");
      if (withdrawal.complaint) throw new Error("DUPLICATE");

      const createdComplaint = await tx.teacherRevenueWithdrawalComplaint.create({
        data: {
          withdrawalId: withdrawal.id,
          teacherId: user.id,
          reason,
          reportedAmount,
          message,
        },
        select: {
          id: true,
          reason: true,
          reportedAmount: true,
          message: true,
          status: true,
          adminNote: true,
          resolvedAt: true,
          createdAt: true,
        },
      });

      const admins = await tx.user.findMany({
        where: { role: "ADMIN" },
        select: { id: true },
      });
      if (admins.length > 0) {
        const amount = new Intl.NumberFormat("vi-VN", {
          style: "currency",
          currency: "VND",
          maximumFractionDigits: 0,
        }).format(withdrawal.amount);
        await tx.notification.createMany({
          data: admins.map((admin) => ({
            userId: admin.id,
            title: "Có khiếu nại rút doanh thu",
            body: `${user.username} khiếu nại yêu cầu rút ${amount}: ${reasonLabels[reason]}.`,
          })),
        });
      }

      return createdComplaint;
    });

    return NextResponse.json({ complaint: serializeComplaint(complaint) }, { status: 201 });
  } catch (error) {
    const messageText = error instanceof Error ? error.message : "";
    if (messageText === "NOT_FOUND") {
      return NextResponse.json({ error: "Không tìm thấy yêu cầu rút doanh thu." }, { status: 404 });
    }
    if (messageText === "INVALID_STATUS") {
      return NextResponse.json({ error: "Chỉ có thể khiếu nại yêu cầu đã được hệ thống đánh dấu đã thanh toán." }, { status: 409 });
    }
    if (messageText === "DUPLICATE") {
      return NextResponse.json({ error: "Yêu cầu rút doanh thu này đã có khiếu nại." }, { status: 409 });
    }
    console.error("Create teacher withdrawal complaint failed", error);
    return NextResponse.json({ error: "Chưa thể gửi khiếu nại. Vui lòng thử lại." }, { status: 500 });
  }
}
