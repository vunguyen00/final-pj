import { NextResponse } from "next/server";
import {
  hashPassword,
  validateStrongPassword,
  verifyPassword,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const OTP_MAX_ATTEMPTS = Number(process.env.PASSWORD_RESET_OTP_MAX_ATTEMPTS ?? 5);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const otp = typeof body.otp === "string" ? body.otp.trim() : "";
    const newPassword =
      typeof body.newPassword === "string" ? body.newPassword : "";
    const confirmPassword =
      typeof body.confirmPassword === "string" ? body.confirmPassword : "";

    if (!email || !otp || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { error: "Vui lòng nhập đầy đủ email, OTP, mật khẩu mới và xác nhận." },
        { status: 400 },
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: "Xác nhận mật khẩu không khớp." },
        { status: 400 },
      );
    }

    const passwordError = validateStrongPassword(newPassword);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    const activeOtp = await prisma.passwordResetOtp.findFirst({
      where: {
        email,
        consumedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        userId: true,
        codeHash: true,
        attempts: true,
      },
    });

    if (!activeOtp) {
      return NextResponse.json(
        { error: "OTP không hợp lệ hoặc đã hết hạn." },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({ where: { id: activeOtp.userId } });

    if (!user) {
      return NextResponse.json({ error: "Tài khoản không tồn tại." }, { status: 404 });
    }

    if (activeOtp.attempts >= OTP_MAX_ATTEMPTS) {
      await prisma.passwordResetOtp.update({
        where: { id: activeOtp.id },
        data: { consumedAt: new Date() },
      });

      return NextResponse.json(
        { error: "OTP đã vượt quá số lần thử. Vui lòng yêu cầu mã mới." },
        { status: 429 },
      );
    }

    const isOtpValid = verifyPassword(otp, activeOtp.codeHash);
    if (!isOtpValid) {
      const nextAttempts = activeOtp.attempts + 1;
      await prisma.passwordResetOtp.update({
        where: { id: activeOtp.id },
        data: {
          attempts: nextAttempts,
          consumedAt: nextAttempts >= OTP_MAX_ATTEMPTS ? new Date() : null,
        },
      });

      return NextResponse.json(
        { error: "OTP không đúng." },
        { status: 400 },
      );
    }

    const passwordHash = hashPassword(newPassword);
    const now = new Date();

    await prisma.$transaction([
      prisma.user.update({
        where: { id: activeOtp.userId },
        data: {
          password: passwordHash,
          authVersion: { increment: 1 },
        },
      }),
      prisma.passwordResetOtp.updateMany({
        where: {
          email,
          consumedAt: null,
        },
        data: {
          consumedAt: now,
        },
      }),
      prisma.session.deleteMany({ where: { userId: activeOtp.userId } }),
    ]);

    return NextResponse.json({
      ok: true,
      message: "Đặt lại mật khẩu thành công. Bạn có thể đăng nhập lại.",
    });
  } catch {
    return NextResponse.json({ error: "Lỗi hệ thống." }, { status: 500 });
  }
}
