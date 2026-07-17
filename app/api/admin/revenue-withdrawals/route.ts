import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function serializeWithdrawal(item: Awaited<ReturnType<typeof getAdminWithdrawals>>[number]) {
  return {
    ...item,
    createdAt: item.createdAt.toISOString(),
    processedAt: item.processedAt?.toISOString() ?? null,
    complaint: item.complaint
      ? {
          ...item.complaint,
          createdAt: item.complaint.createdAt.toISOString(),
          resolvedAt: item.complaint.resolvedAt?.toISOString() ?? null,
        }
      : null,
  };
}

function getAdminWithdrawals() {
  return prisma.teacherRevenueWithdrawal.findMany({
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
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function GET() {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Bạn không có quyền xem yêu cầu rút doanh thu." }, { status: 403 });
  }

  const withdrawals = await getAdminWithdrawals();
  return NextResponse.json({ withdrawals: withdrawals.map(serializeWithdrawal) });
}
