import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { saveWithdrawalComplaintEvidence } from "@/lib/withdrawal-complaint-evidence";

type ComplaintReason = "NOT_RECEIVED" | "WRONG_AMOUNT" | "OTHER";
type ComplaintBody = {
  reason?: unknown;
  reportedAmount?: unknown;
  message?: unknown;
  evidenceImage?: File | null;
};

const moneyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

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

function getFileField(value: FormDataEntryValue | null) {
  return value instanceof File && value.size > 0 ? value : null;
}

async function readComplaintBody(request: Request): Promise<ComplaintBody | null> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    return {
      reason: formData.get("reason"),
      reportedAmount: formData.get("reportedAmount"),
      message: formData.get("message"),
      evidenceImage: getFileField(formData.get("evidenceImage")),
    };
  }

  return (await request.json().catch(() => null)) as ComplaintBody | null;
}

function serializeComplaint(complaint: {
  id: string;
  reason: ComplaintReason;
  reportedAmount: number | null;
  message: string;
  evidenceImageUrl: string | null;
  evidenceImageName: string | null;
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
  const [user, { withdrawalId }, body] = await Promise.all([
    getCurrentUser(),
    params,
    readComplaintBody(request),
  ]);
  if (!user || user.role !== "TEACHER") {
    return NextResponse.json({ error: "Chỉ giảng viên mới có thể gửi khiếu nại rút doanh thu." }, { status: 403 });
  }

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
    const evidence = await saveWithdrawalComplaintEvidence(body?.evidenceImage ?? null);
    const complaint = await prisma.$transaction(async (tx) => {
      const withdrawal = await tx.teacherRevenueWithdrawal.findUnique({
        where: { id: withdrawalId },
        include: { complaint: true },
      });
      if (!withdrawal || withdrawal.teacherId !== user.id) throw new Error("NOT_FOUND");
      if (withdrawal.status !== "PAID" && withdrawal.status !== "COMPLETED") throw new Error("INVALID_STATUS");
      if (withdrawal.complaint) throw new Error("DUPLICATE");

      const [createdComplaint, admins] = await Promise.all([
        tx.teacherRevenueWithdrawalComplaint.create({
          data: {
            withdrawalId: withdrawal.id,
            teacherId: user.id,
            reason,
            reportedAmount,
            message,
            evidenceImageUrl: evidence?.evidenceImageUrl ?? null,
            evidenceImageName: evidence?.evidenceImageName ?? null,
          },
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
        }),
        tx.user.findMany({
          where: { role: "ADMIN" },
          select: { id: true },
        }),
      ]);
      if (admins.length > 0) {
        const amount = moneyFormatter.format(withdrawal.amount);
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
    if (messageText.startsWith("INVALID_EVIDENCE:")) {
      return NextResponse.json({ error: messageText.replace("INVALID_EVIDENCE:", "") }, { status: 400 });
    }
    console.error("Create teacher withdrawal complaint failed", error);
    return NextResponse.json({ error: "Chưa thể gửi khiếu nại. Vui lòng thử lại." }, { status: 500 });
  }
}
