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
        { error: "Vui long nhap day du email, OTP, mat khau moi va xac nhan." },
        { status: 400 },
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: "Xac nhan mat khau khong khop." },
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
        { error: "OTP khong hop le hoac da het han." },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: activeOtp.userId },
      select: { role: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Tai khoan khong ton tai." }, { status: 404 });
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

    if (activeOtp.attempts >= OTP_MAX_ATTEMPTS) {
      await prisma.passwordResetOtp.update({
        where: { id: activeOtp.id },
        data: { consumedAt: new Date() },
      });

      return NextResponse.json(
        { error: "OTP da vuot qua so lan thu. Vui long yeu cau ma moi." },
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
        { error: "OTP khong dung." },
        { status: 400 },
      );
    }

    const passwordHash = hashPassword(newPassword);
    const now = new Date();

    await prisma.$transaction([
      prisma.user.update({
        where: { id: activeOtp.userId },
        data: { password: passwordHash },
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
    ]);

    return NextResponse.json({
      ok: true,
      message: "Dat lai mat khau thanh cong. Ban co the dang nhap lai.",
    });
  } catch {
    return NextResponse.json({ error: "Loi he thong." }, { status: 500 });
  }
}
