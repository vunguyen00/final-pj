import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function getAdminRefunds() {
  return prisma.courseRefundRequest.findMany({
    include: {
      student: { select: { id: true, username: true, email: true } },
      course: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

function serializeRefund(item: Awaited<ReturnType<typeof getAdminRefunds>>[number]) {
  return {
    id: item.id,
    amount: item.amount,
    reason: item.reason,
    status: item.status,
    refundMethod: item.refundMethod,
    adminNote: item.adminNote,
    processedAt: item.processedAt?.toISOString() ?? null,
    createdAt: item.createdAt.toISOString(),
    student: item.student,
    course: item.course,
  };
}

export async function GET() {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Bạn không có quyền xem yêu cầu hoàn tiền." }, { status: 403 });
  }

  const refunds = await getAdminRefunds();
  return NextResponse.json({ refunds: refunds.map(serializeRefund) });
}
