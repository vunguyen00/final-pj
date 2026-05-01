import { randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth";
import { sendPasswordResetOtpEmail } from "@/lib/mailer";
import { prisma } from "@/lib/prisma";

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
      return NextResponse.json({ error: "Vui long nhap email." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, role: true },
    });

    // Tra loi chung de tranh de lo email ton tai hay khong ton tai.
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
            "Tai khoan admin khong duoc dat lai mat khau bang OTP. Vui long lien he quan tri he thong de duoc cap mat khau moi.",
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
        { error: "Khong gui duoc OTP. Vui long kiem tra cau hinh email trong .env." },
        { status: 500 },
      );
    }

    return genericResponse;
  } catch {
    return NextResponse.json({ error: "Loi he thong." }, { status: 500 });
  }
}
