import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RefundAction = "APPROVE" | "REJECT";

function serializeRefund(refund: {
  id: string;
  amount: number;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  adminNote: string | null;
  processedAt: Date | null;
  createdAt: Date;
  student: { id: string; username: string; email: string };
  course: { id: string; name: string };
}) {
  return {
    ...refund,
    processedAt: refund.processedAt?.toISOString() ?? null,
    createdAt: refund.createdAt.toISOString(),
  };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ refundId: string }> },
) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Bạn không có quyền xử lý yêu cầu hoàn tiền." }, { status: 403 });
  }

  const { refundId } = await params;
  const body = (await request.json().catch(() => null)) as { action?: unknown; note?: unknown } | null;
  const action = typeof body?.action === "string" ? (body.action.toUpperCase() as RefundAction) : null;
  const note = typeof body?.note === "string" ? body.note.trim().slice(0, 500) : "";

  if (!action || !["APPROVE", "REJECT"].includes(action) || (action === "REJECT" && !note)) {
    return NextResponse.json({ error: "Thao tác hoặc ghi chú không hợp lệ." }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.courseRefundRequest.findUnique({
        where: { id: refundId },
        include: {
          student: { select: { id: true, username: true, email: true } },
          course: { select: { id: true, name: true } },
        },
      });

      if (!current) throw new Error("NOT_FOUND");
      if (current.status !== "PENDING") throw new Error("INVALID_STATUS");

      if (action === "APPROVE") {
        await tx.enrollment.deleteMany({
          where: {
            userId: current.studentId,
            courseId: current.courseId,
          },
        });
        await Promise.all([
          tx.feedback.deleteMany({
            where: { userId: current.studentId, courseId: current.courseId },
          }),
          tx.testAttempt.deleteMany({
            where: { userId: current.studentId, test: { courseId: current.courseId } },
          }),
          tx.aiAssessment.deleteMany({
            where: { userId: current.studentId, courseId: current.courseId },
          }),
          tx.learningActivity.deleteMany({
            where: { userId: current.studentId, courseId: current.courseId },
          }),
          tx.pointTransaction.deleteMany({
            where: { userId: current.studentId, courseId: current.courseId },
          }),
          tx.videoWatchProgress.deleteMany({
            where: {
              userId: current.studentId,
              lesson: { module: { courseId: current.courseId } },
            },
          }),
        ]);
      }

      const refund = await tx.courseRefundRequest.update({
        where: { id: refundId },
        data: {
          status: action === "APPROVE" ? "APPROVED" : "REJECTED",
          adminNote: note || null,
          reviewedById: admin.id,
          processedAt: new Date(),
          refundMethod: "EXTERNAL_ACCOUNT",
        },
        include: {
          student: { select: { id: true, username: true, email: true } },
          course: { select: { id: true, name: true } },
        },
      });

      await tx.notification.create({
        data: {
          userId: current.studentId,
          title: action === "APPROVE" ? "Yêu cầu hoàn tiền đã được duyệt" : "Yêu cầu hoàn tiền bị từ chối",
          body:
            action === "APPROVE"
              ? `Yêu cầu hoàn ${current.amount.toLocaleString("vi-VN")}đ cho khóa học "${current.course.name}" đã được duyệt. Khoản tiền sẽ được xử lý bên ngoài hệ thống và hoàn vào tài khoản của bạn.`
              : `Yêu cầu hoàn tiền khóa học "${current.course.name}" bị từ chối. Lý do: ${note}`,
        },
      });

      return refund;
    });

    return NextResponse.json({ refund: serializeRefund(result) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "NOT_FOUND") {
      return NextResponse.json({ error: "Không tìm thấy yêu cầu hoàn tiền." }, { status: 404 });
    }
    if (message === "INVALID_STATUS") {
      return NextResponse.json({ error: "Yêu cầu hoàn tiền đã được xử lý trước đó." }, { status: 409 });
    }
    console.error("Admin process course refund failed", error);
    return NextResponse.json({ error: "Không thể xử lý yêu cầu hoàn tiền." }, { status: 500 });
  }
}
