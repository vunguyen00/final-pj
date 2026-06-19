import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  calculateAvailableTeacherRevenue,
  RESERVED_WITHDRAWAL_STATUSES,
} from "@/lib/teacher-revenue";

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "TEACHER") {
    return NextResponse.json({ error: "Chỉ giảng viên mới có thể rút doanh thu." }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Dữ liệu yêu cầu không hợp lệ." }, { status: 400 });
  }

  const amount = Number(body.amount);
  const bankName = cleanText(body.bankName, 100);
  const accountNumber = cleanText(body.accountNumber, 30).replace(/\s/g, "");
  const accountName = cleanText(body.accountName, 100).toUpperCase();

  if (!Number.isSafeInteger(amount) || amount <= 0) {
    return NextResponse.json({ error: "Số tiền rút phải là số nguyên lớn hơn 0." }, { status: 400 });
  }
  if (!bankName || !accountName || !/^[0-9]{6,30}$/.test(accountNumber)) {
    return NextResponse.json(
      { error: "Vui lòng nhập đúng ngân hàng, chủ tài khoản và số tài khoản." },
      { status: 400 },
    );
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const [earned, reserved] = await Promise.all([
        tx.orderItem.aggregate({
          where: { course: { instructorId: user.id } },
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
        data: { teacherId: user.id, amount, bankName, accountNumber, accountName },
      });
      return { withdrawal, available: available - amount };
    }, { isolationLevel: "Serializable" });

    return NextResponse.json({ success: true, ...result }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "INSUFFICIENT_REVENUE") {
      return NextResponse.json({ error: "Số tiền rút vượt quá doanh thu khả dụng." }, { status: 400 });
    }
    console.error("Create teacher revenue withdrawal failed", error);
    return NextResponse.json({ error: "Chưa thể tạo yêu cầu rút tiền. Vui lòng thử lại." }, { status: 500 });
  }
}
