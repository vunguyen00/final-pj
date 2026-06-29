import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type ComplaintAction = "RESOLVE" | "REJECT";

const actionCopy: Record<ComplaintAction, { status: "RESOLVED" | "REJECTED"; title: string; body: (note: string) => string }> = {
  RESOLVE: {
    status: "RESOLVED",
    title: "Khiếu nại rút doanh thu đã được đóng",
    body: (note) => note || "Admin đã kiểm tra và đóng khiếu nại rút doanh thu của bạn.",
  },
  REJECT: {
    status: "REJECTED",
    title: "Khiếu nại rút doanh thu bị từ chối",
    body: (note) => `Admin đã từ chối khiếu nại rút doanh thu. Lý do: ${note}`,
  },
};

function serializeComplaint(complaint: {
  id: string;
  reason: "NOT_RECEIVED" | "WRONG_AMOUNT" | "OTHER";
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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ withdrawalId: string; complaintId: string }> },
) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Bạn không có quyền xử lý khiếu nại này." }, { status: 403 });
  }

  const { withdrawalId, complaintId } = await params;
  const body = (await request.json().catch(() => null)) as { action?: unknown; note?: unknown } | null;
  const action = typeof body?.action === "string" ? body.action.toUpperCase() as ComplaintAction : null;
  const note = typeof body?.note === "string" ? body.note.trim().slice(0, 500) : "";

  if (!action || !(action in actionCopy) || (action === "REJECT" && !note)) {
    return NextResponse.json({ error: "Thao tác hoặc ghi chú xử lý không hợp lệ." }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.teacherRevenueWithdrawalComplaint.findUnique({
        where: { id: complaintId },
        include: { withdrawal: { select: { id: true, teacherId: true } } },
      });
      if (!current || current.withdrawalId !== withdrawalId) throw new Error("NOT_FOUND");
      if (current.status !== "OPEN") throw new Error("INVALID_STATUS");

      const copy = actionCopy[action];
      const complaint = await tx.teacherRevenueWithdrawalComplaint.update({
        where: { id: complaintId },
        data: {
          status: copy.status,
          adminNote: note || null,
          resolvedAt: new Date(),
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

      await tx.notification.create({
        data: {
          userId: current.withdrawal.teacherId,
          title: copy.title,
          body: copy.body(note),
        },
      });

      return complaint;
    });

    return NextResponse.json({ complaint: serializeComplaint(result) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "NOT_FOUND") {
      return NextResponse.json({ error: "Không tìm thấy khiếu nại rút doanh thu." }, { status: 404 });
    }
    if (message === "INVALID_STATUS") {
      return NextResponse.json({ error: "Khiếu nại đã được xử lý trước đó." }, { status: 409 });
    }
    console.error("Admin process withdrawal complaint failed", error);
    return NextResponse.json({ error: "Không thể xử lý khiếu nại rút doanh thu." }, { status: 500 });
  }
}
