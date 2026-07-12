import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  calculateAvailableTeacherRevenue,
  REVENUE_ELIGIBLE_ORDER_ITEM_WHERE,
  RESERVED_WITHDRAWAL_STATUSES,
} from "@/lib/teacher-revenue";

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
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
  const bankName = cleanText(body.bankName, 100);
  const bankBranch = cleanText(body.bankBranch, 100);
  const accountNumber = cleanText(body.accountNumber, 30).replace(/\s/g, "");
  const accountName = cleanText(body.accountName, 100).toUpperCase();

  if (!Number.isSafeInteger(amount) || amount <= 0) {
    return NextResponse.json({ error: "So tien rut phai la so nguyen lon hon 0." }, { status: 400 });
  }

  const savedBankAccount = await prisma.teacherBankAccount.findUnique({
    where: { teacherId: user.id },
  });
  const finalBankName = bankName || savedBankAccount?.bankName || "";
  const finalBankBranch = bankBranch || savedBankAccount?.branch || "";
  const finalAccountNumber = accountNumber || savedBankAccount?.accountNumber || "";
  const finalAccountName = accountName || savedBankAccount?.accountName || "";

  if (!finalBankName || !finalAccountName || !/^[0-9]{6,30}$/.test(finalAccountNumber)) {
    return NextResponse.json(
      { error: "Vui long nhap thong tin tai khoan ngan hang truoc khi rut tien." },
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

      const shouldResetVerification =
        savedBankAccount &&
        (savedBankAccount.bankName !== finalBankName ||
          savedBankAccount.accountNumber !== finalAccountNumber ||
          savedBankAccount.accountName !== finalAccountName ||
          (savedBankAccount.branch || "") !== finalBankBranch);

      const bankAccount = await tx.teacherBankAccount.upsert({
        where: { teacherId: user.id },
        create: {
          teacherId: user.id,
          bankName: finalBankName,
          accountNumber: finalAccountNumber,
          accountName: finalAccountName,
          branch: finalBankBranch || null,
        },
        update: {
          bankName: finalBankName,
          accountNumber: finalAccountNumber,
          accountName: finalAccountName,
          branch: finalBankBranch || null,
          verificationStatus: shouldResetVerification
            ? "UNVERIFIED"
            : savedBankAccount?.verificationStatus ?? "UNVERIFIED",
        },
      });

      const withdrawal = await tx.teacherRevenueWithdrawal.create({
        data: {
          teacherId: user.id,
          amount,
          bankName: finalBankName,
          accountNumber: finalAccountNumber,
          accountName: finalAccountName,
          bankBranch: finalBankBranch || null,
          bankVerificationStatus: bankAccount.verificationStatus,
        },
      });

      return { withdrawal, bankAccount, available: available - amount };
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
