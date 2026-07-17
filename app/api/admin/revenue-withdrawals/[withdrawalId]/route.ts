import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  calculateAvailableTeacherRevenue,
  REVENUE_ELIGIBLE_ORDER_ITEM_WHERE,
  RESERVED_WITHDRAWAL_STATUSES,
} from "@/lib/teacher-revenue";

type Action = "APPROVE" | "PAY" | "REJECT";

const transition = {
  APPROVE: { from: ["PENDING"], to: "APPROVED" },
  PAY: { from: ["APPROVED"], to: "COMPLETED" },
  REJECT: { from: ["PENDING", "APPROVED"], to: "REJECTED" },
} as const;
const moneyFormatter = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });

const notificationCopy: Record<Action, { title: string; body: (amount: string, note: string) => string }> = {
  APPROVE: { title: "Yêu cầu rút doanh thu đã được duyệt", body: (amount) => `Yêu cầu rút ${amount} của bạn đã được duyệt và đang chờ chuyển khoản.` },
  PAY: { title: "Đã thanh toán doanh thu", body: (amount) => `Admin đã xác nhận chuyển khoản ${amount} cho yêu cầu rút doanh thu của bạn.` },
  REJECT: { title: "Yêu cầu rút doanh thu bị từ chối", body: (amount, note) => `Yêu cầu rút ${amount} bị từ chối. Lý do: ${note}` },
};

export async function PATCH(request: Request, { params }: { params: Promise<{ withdrawalId: string }> }) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Bạn không có quyền xử lý yêu cầu này." }, { status: 403 });
  }

  const { withdrawalId } = await params;
  const body = (await request.json().catch(() => null)) as {
    action?: unknown;
    note?: unknown;
    systemBankName?: unknown;
    transferTransactionCode?: unknown;
  } | null;
  const action = typeof body?.action === "string" ? body.action.toUpperCase() as Action : null;
  const note = typeof body?.note === "string" ? body.note.trim().slice(0, 500) : "";
  const systemBankName = typeof body?.systemBankName === "string" ? body.systemBankName.trim().slice(0, 100) : "";
  const transferTransactionCode = typeof body?.transferTransactionCode === "string" ? body.transferTransactionCode.trim().slice(0, 100) : "";
  if (!action || !(action in transition) || (action === "REJECT" && !note)) {
    return NextResponse.json({ error: "Thao tác hoặc lý do từ chối không hợp lệ." }, { status: 400 });
  }
  if (action === "PAY" && (!systemBankName || !transferTransactionCode)) {
    return NextResponse.json(
      { error: "Cần nhập ngân hàng chuyển và mã giao dịch trước khi xác nhận đã thanh toán." },
      { status: 400 },
    );
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.teacherRevenueWithdrawal.findUnique({ where: { id: withdrawalId } });
      if (!current) throw new Error("NOT_FOUND");
      if (!(transition[action].from as readonly string[]).includes(current.status)) throw new Error("INVALID_STATUS");

      if (action === "APPROVE" || action === "PAY") {
        const [earned, reserved] = await Promise.all([
          tx.orderItem.aggregate({
            where: {
              course: { instructorId: current.teacherId },
              ...REVENUE_ELIGIBLE_ORDER_ITEM_WHERE,
            },
            _sum: { teacherRevenue: true },
          }),
          tx.teacherRevenueWithdrawal.aggregate({
            where: {
              teacherId: current.teacherId,
              id: { not: current.id },
              status: { in: [...RESERVED_WITHDRAWAL_STATUSES] },
            },
            _sum: { amount: true },
          }),
        ]);
        const available = calculateAvailableTeacherRevenue(
          earned._sum.teacherRevenue ?? 0,
          reserved._sum.amount ?? 0,
        );
        if (current.amount > available) throw new Error("INSUFFICIENT_REVENUE");
      }

      const withdrawal = await tx.teacherRevenueWithdrawal.update({
        where: { id: withdrawalId },
        data: {
          status: transition[action].to,
          note: action === "REJECT" ? note : current.note,
          processedAt: action === "PAY" || action === "REJECT" ? new Date() : null,
          processedById: action === "PAY" || action === "REJECT" ? admin.id : current.processedById,
          systemBankName: action === "PAY" ? systemBankName || null : current.systemBankName,
          transferTransactionCode: action === "PAY" ? transferTransactionCode || null : current.transferTransactionCode,
        },
        include: {
          teacher: { select: { id: true, username: true, email: true } },
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
      });
      const amount = moneyFormatter.format(current.amount);
      const copy = notificationCopy[action];
      await tx.notification.create({
        data: { userId: current.teacherId, title: copy.title, body: copy.body(amount, note) },
      });
      return withdrawal;
    });

    return NextResponse.json({
      withdrawal: {
        ...result,
        createdAt: result.createdAt.toISOString(),
        processedAt: result.processedAt?.toISOString() ?? null,
        complaint: result.complaint
          ? {
              ...result.complaint,
              createdAt: result.complaint.createdAt.toISOString(),
              resolvedAt: result.complaint.resolvedAt?.toISOString() ?? null,
            }
          : null,
        updatedAt: undefined,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "NOT_FOUND") return NextResponse.json({ error: "Không tìm thấy yêu cầu." }, { status: 404 });
    if (message === "INVALID_STATUS") return NextResponse.json({ error: "Yêu cầu đã được xử lý hoặc không còn ở trạng thái phù hợp." }, { status: 409 });
    if (message === "INSUFFICIENT_REVENUE") return NextResponse.json({ error: "Doanh thu kha dung cua giang vien khong con du do co don da hoan tien." }, { status: 400 });
    console.error("Admin process revenue withdrawal failed", error);
    return NextResponse.json({ error: "Không thể xử lý yêu cầu rút tiền." }, { status: 500 });
  }
}
