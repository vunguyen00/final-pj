import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Action = "APPROVE" | "PAY" | "REJECT";

const transition = {
  APPROVE: { from: ["PENDING"], to: "APPROVED" },
  PAY: { from: ["APPROVED"], to: "PAID" },
  REJECT: { from: ["PENDING", "APPROVED"], to: "REJECTED" },
} as const;

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
  const body = (await request.json().catch(() => null)) as { action?: unknown; note?: unknown } | null;
  const action = typeof body?.action === "string" ? body.action.toUpperCase() as Action : null;
  const note = typeof body?.note === "string" ? body.note.trim().slice(0, 500) : "";
  if (!action || !(action in transition) || (action === "REJECT" && !note)) {
    return NextResponse.json({ error: "Thao tác hoặc lý do từ chối không hợp lệ." }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.teacherRevenueWithdrawal.findUnique({ where: { id: withdrawalId } });
      if (!current) throw new Error("NOT_FOUND");
      if (!(transition[action].from as readonly string[]).includes(current.status)) throw new Error("INVALID_STATUS");

      const withdrawal = await tx.teacherRevenueWithdrawal.update({
        where: { id: withdrawalId },
        data: {
          status: transition[action].to,
          note: action === "REJECT" ? note : current.note,
          processedAt: action === "PAY" || action === "REJECT" ? new Date() : null,
        },
        include: { teacher: { select: { id: true, username: true, email: true } } },
      });
      const amount = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(current.amount);
      const copy = notificationCopy[action];
      await tx.notification.create({
        data: { userId: current.teacherId, title: copy.title, body: copy.body(amount, note) },
      });
      return withdrawal;
    });

    return NextResponse.json({ withdrawal: { ...result, createdAt: result.createdAt.toISOString(), processedAt: result.processedAt?.toISOString() ?? null, updatedAt: undefined } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "NOT_FOUND") return NextResponse.json({ error: "Không tìm thấy yêu cầu." }, { status: 404 });
    if (message === "INVALID_STATUS") return NextResponse.json({ error: "Yêu cầu đã được xử lý hoặc không còn ở trạng thái phù hợp." }, { status: 409 });
    console.error("Admin process revenue withdrawal failed", error);
    return NextResponse.json({ error: "Không thể xử lý yêu cầu rút tiền." }, { status: 500 });
  }
}
