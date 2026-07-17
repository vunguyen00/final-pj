import type { Prisma } from "@/app/generated/prisma/client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  maskAccountNumber,
  TEACHER_BANK_ACCOUNT_OTP_MAX_ATTEMPTS,
  type TeacherBankAccountPayload,
  validateTeacherBankAccountPayload,
  verifyTeacherBankAccountOtp,
} from "@/lib/teacher-bank-account";

type StoredPayload = TeacherBankAccountPayload & {
  requestIp?: string | null;
  deviceFingerprint?: string | null;
};

async function upsertVerifiedBankAccount(
  tx: Prisma.TransactionClient,
  teacherId: string,
  payload: StoredPayload,
) {
  // Capture the previous account before writing so the audit log records the real old values.
  const previous = await tx.teacherBankAccount.findUnique({
    where: { teacherId },
  });

  return tx.teacherBankAccount
    .upsert({
      where: { teacherId },
      create: {
        teacherId,
        bankName: payload.bankName,
        accountNumber: payload.accountNumber,
        accountName: payload.accountName,
        branch: payload.bankBranch || null,
        verificationStatus: "VERIFIED",
      },
      update: {
        bankName: payload.bankName,
        accountNumber: payload.accountNumber,
        accountName: payload.accountName,
        branch: payload.bankBranch || null,
        verificationStatus: "VERIFIED",
      },
    })
    .then((bankAccount) => ({ previous, bankAccount }));
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "TEACHER") {
    return NextResponse.json({ error: "Chỉ giảng viên mới có thể xác nhận tài khoản rút tiền." }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Dữ liệu yêu cầu không hợp lệ." }, { status: 400 });
  }

  const otpCode = typeof body.otp === "string" ? body.otp.trim() : "";
  if (!/^[0-9]{6}$/.test(otpCode)) {
    return NextResponse.json({ error: "Vui lòng nhập OTP gồm 6 chữ số." }, { status: 400 });
  }

  const otp = await prisma.teacherBankAccountChangeOtp.findFirst({
    where: { teacherId: user.id, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!otp) {
    return NextResponse.json({ error: "OTP không tồn tại hoặc đã được sử dụng." }, { status: 400 });
  }
  if (otp.expiresAt < new Date()) {
    return NextResponse.json({ error: "OTP đã hết hạn. Vui lòng gửi lại mã mới." }, { status: 400 });
  }
  if (otp.attempts >= TEACHER_BANK_ACCOUNT_OTP_MAX_ATTEMPTS) {
    return NextResponse.json({ error: "OTP đã vượt quá số lần thử. Vui lòng gửi lại mã mới." }, { status: 429 });
  }

  if (!verifyTeacherBankAccountOtp(otpCode, otp.codeHash)) {
    const updated = await prisma.teacherBankAccountChangeOtp.update({
      where: { id: otp.id },
      data: {
        attempts: { increment: 1 },
        consumedAt: otp.attempts + 1 >= TEACHER_BANK_ACCOUNT_OTP_MAX_ATTEMPTS ? new Date() : null,
      },
      select: { attempts: true },
    });
    return NextResponse.json(
      {
        error: "OTP không đúng.",
        attemptsRemaining: Math.max(0, TEACHER_BANK_ACCOUNT_OTP_MAX_ATTEMPTS - updated.attempts),
      },
      { status: updated.attempts >= TEACHER_BANK_ACCOUNT_OTP_MAX_ATTEMPTS ? 429 : 400 },
    );
  }

  const payload = otp.payload as Prisma.JsonObject as StoredPayload;
  const validationError = validateTeacherBankAccountPayload(payload);
  if (validationError) {
    return NextResponse.json({ error: "Yêu cầu thay đổi tài khoản không hợp lệ. Vui lòng gửi lại OTP." }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const { previous, bankAccount } = await upsertVerifiedBankAccount(tx, user.id, payload);

    await tx.teacherBankAccountChangeLog.create({
      data: {
        teacherId: user.id,
        previousBankName: previous?.bankName ?? null,
        previousAccountNumberMasked: previous ? maskAccountNumber(previous.accountNumber) : null,
        previousAccountName: previous?.accountName ?? null,
        previousBranch: previous?.branch ?? null,
        nextBankName: bankAccount.bankName,
        nextAccountNumberMasked: maskAccountNumber(bankAccount.accountNumber),
        nextAccountName: bankAccount.accountName,
        nextBranch: bankAccount.branch,
        requestIp: payload.requestIp ?? null,
        deviceFingerprint: payload.deviceFingerprint ?? null,
      },
    });

    await tx.teacherBankAccountChangeOtp.update({
      where: { id: otp.id },
      data: { consumedAt: new Date() },
    });

    return bankAccount;
  });

  return NextResponse.json({
    success: true,
    bankAccount: {
      bankName: result.bankName,
      accountNumber: result.accountNumber,
      accountName: result.accountName,
      branch: result.branch,
      verificationStatus: result.verificationStatus,
      updatedAt: result.updatedAt.toISOString(),
    },
  });
}
