import { randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth";
import { sendPasswordResetOtpEmail } from "@/lib/mailer";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

const OTP_LENGTH = 6;
const OTP_EXPIRES_MINUTES = Number(
  process.env.PASSWORD_RESET_OTP_EXPIRES_MINUTES ??
    process.env.OTP_EXPIRES_MINUTES ??
    10,
);

function generateOtpCode(): string {
  const max = 10 ** OTP_LENGTH;
  return randomInt(0, max).toString().padStart(OTP_LENGTH, "0");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!email) {
      return NextResponse.json({ error: "Vui lòng nhập email." }, { status: 400 });
    }

    const ip = getClientIp(request);
    const ipLimit = checkRateLimit({
      key: `password-reset:ip:${ip}`,
      limit: 10,
      windowMs: 60 * 60 * 1000,
    });
    const emailLimit = checkRateLimit({
      key: `password-reset:email:${email}`,
      limit: 3,
      windowMs: 60 * 60 * 1000,
    });
    if (!ipLimit.ok || !emailLimit.ok) {
      return NextResponse.json(
        {
          error: "Bạn đã yêu cầu OTP quá nhiều lần. Vui lòng thử lại sau.",
          retryAfter: Math.max(ipLimit.retryAfter, emailLimit.retryAfter),
        },
        { status: 429 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, role: true },
    });

    // Trả lời chung để tránh để lộ email tồn tại hay không tồn tại.
    const genericResponse = NextResponse.json({
      ok: true,
      message: "Neu email ton tai, he thong da gui OTP dat lai mat khau.",
    });

    if (!user) {
      return genericResponse;
    }

    if (user.role === "ADMIN") {
      return NextResponse.json(
        {
          error:
            "Tài khoản admin không được đặt lại mật khẩu bằng OTP. Vui lòng liên hệ quản trị hệ thống để được cấp mật khẩu mới.",
        },
        { status: 403 },
      );
    }

    const otpCode = generateOtpCode();
    const codeHash = hashPassword(otpCode);
    const expiresAt = new Date(Date.now() + OTP_EXPIRES_MINUTES * 60 * 1000);

    const createdOtp = await prisma.passwordResetOtp.create({
      data: {
        userId: user.id,
        email: user.email,
        codeHash,
        expiresAt,
        attempts: 0,
      },
      select: { id: true },
    });

    try {
      await sendPasswordResetOtpEmail(user.email, otpCode, OTP_EXPIRES_MINUTES);
    } catch {
      await prisma.passwordResetOtp.delete({
        where: { id: createdOtp.id },
      });

      return NextResponse.json(
        { error: "Không gửi được OTP. Vui lòng kiểm tra cấu hình email trong .env." },
        { status: 500 },
      );
    }

    return genericResponse;
  } catch {
    return NextResponse.json({ error: "Lỗi hệ thống." }, { status: 500 });
  }
}
