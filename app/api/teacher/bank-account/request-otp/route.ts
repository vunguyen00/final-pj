import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sendTeacherBankAccountOtpEmail } from "@/lib/mailer";
import { prisma } from "@/lib/prisma";
import { getRequestSecurityContext } from "@/lib/registration-otp";
import {
  generateTeacherBankAccountOtp,
  hashTeacherBankAccountOtp,
  normalizeTeacherBankAccountPayload,
  TEACHER_BANK_ACCOUNT_OTP_EXPIRES_MINUTES,
  validateTeacherBankAccountPayload,
} from "@/lib/teacher-bank-account";

const OTP_RESEND_SECONDS = 60;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "TEACHER") {
    return NextResponse.json({ error: "Chỉ giảng viên mới có thể cập nhật tài khoản rút tiền." }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Dữ liệu yêu cầu không hợp lệ." }, { status: 400 });
  }

  const payload = normalizeTeacherBankAccountPayload(body);
  const validationError = validateTeacherBankAccountPayload(payload);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const currentAccount = await prisma.teacherBankAccount.findUnique({ where: { teacherId: user.id } });
  if (currentAccount &&
    currentAccount.bankName === payload.bankName &&
    currentAccount.accountNumber === payload.accountNumber &&
    currentAccount.accountName === payload.accountName &&
    (currentAccount.branch ?? "") === payload.bankBranch) {
    return NextResponse.json({ error: "Tài khoản nhận tiền chưa có thay đổi." }, { status: 400 });
  }

  const { requestIp, deviceFingerprint } = getRequestSecurityContext(request);
  const now = new Date();
  const latestOtp = await prisma.teacherBankAccountChangeOtp.findFirst({
    where: { teacherId: user.id, consumedAt: null },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  if (latestOtp && latestOtp.createdAt.getTime() + OTP_RESEND_SECONDS * 1000 > now.getTime()) {
    const retryAfter = Math.ceil((latestOtp.createdAt.getTime() + OTP_RESEND_SECONDS * 1000 - now.getTime()) / 1000);
    return NextResponse.json({ error: `Vui lòng đợi ${retryAfter} giây trước khi gửi lại OTP.`, retryAfter }, { status: 429 });
  }

  const otpCode = generateTeacherBankAccountOtp();
  const expiresAt = new Date(now.getTime() + TEACHER_BANK_ACCOUNT_OTP_EXPIRES_MINUTES * 60 * 1000);

  const createdOtp = await prisma.teacherBankAccountChangeOtp.create({
    data: {
      teacherId: user.id,
      email: user.email,
      codeHash: hashTeacherBankAccountOtp(otpCode),
      payload: {
        ...payload,
        requestIp,
        deviceFingerprint,
      },
      expiresAt,
    },
  });

  try {
    await sendTeacherBankAccountOtpEmail(user.email, otpCode, TEACHER_BANK_ACCOUNT_OTP_EXPIRES_MINUTES);
    await prisma.emailLog.create({
      data: {
        userId: user.id,
        to: user.email,
        subject: "Ma OTP xac nhan thay doi tai khoan rut tien",
        status: "SENT",
        sentAt: new Date(),
      },
    });
  } catch (error) {
    await prisma.teacherBankAccountChangeOtp.delete({ where: { id: createdOtp.id } });
    await prisma.emailLog.create({
      data: {
        userId: user.id,
        to: user.email,
        subject: "Ma OTP xac nhan thay doi tai khoan rut tien",
        status: "FAILED",
        error: error instanceof Error ? error.message : String(error),
      },
    });
    return NextResponse.json({ error: "Không gửi được OTP. Vui lòng kiểm tra email hoặc thử lại sau." }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    expiresAt: expiresAt.toISOString(),
    resendAvailableAt: new Date(now.getTime() + OTP_RESEND_SECONDS * 1000).toISOString(),
  });
}
