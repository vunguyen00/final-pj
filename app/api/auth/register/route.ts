import { NextResponse } from "next/server";
import {
  hashPassword,
  validateStrongPassword,
} from "@/lib/auth";
import { getDatabaseUrlTarget } from "@/lib/database-url";
import { prisma } from "@/lib/prisma";
import {
  createAndSendRegistrationOtp,
  getRequestSecurityContext,
} from "@/lib/registration-otp";

function getErrorDetails(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      code: "code" in error ? String(error.code) : undefined,
    };
  }

  return {
    name: "UnknownError",
    message: "Unknown error.",
  };
}

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

export async function POST(request: Request) {
  let body: {
    username?: unknown;
    email?: unknown;
    password?: unknown;
    confirmPassword?: unknown;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dữ liệu gửi lên không hợp lệ." }, { status: 400 });
  }

  console.info("[auth/register] DATABASE_URL target:", getDatabaseUrlTarget());

  try {
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const confirmPassword =
      typeof body.confirmPassword === "string" ? body.confirmPassword : "";

    if (!username || !email || !password || !confirmPassword) {
      return NextResponse.json(
        { error: "Vui lòng nhập đầy đủ tên hiển thị, email, mật khẩu và xác nhận mật khẩu." },
        { status: 400 },
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: "Xác nhận mật khẩu không khớp." }, { status: 400 });
    }

    const passwordError = validateStrongPassword(password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
      select: { id: true, accountStatus: true },
    });

    if (existingUser?.accountStatus === "ACTIVE") {
      return NextResponse.json(
        { error: "Email đã tồn tại." },
        { status: 409 },
      );
    }

    const passwordHash = hashPassword(password);
    const user = existingUser
      ? await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            username,
            password: passwordHash,
            role: "STUDENT",
            accountStatus: "PENDING_VERIFICATION",
          },
          select: {
            id: true,
            role: true,
          },
        })
      : await prisma.user.create({
          data: {
            username,
            email,
            password: passwordHash,
            role: "STUDENT",
            accountStatus: "PENDING_VERIFICATION",
          },
          select: {
            id: true,
            role: true,
          },
        });

    const persistedUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
      },
    });

    if (!persistedUser || persistedUser.email !== email) {
      throw new Error("User create succeeded but record was not found after write.");
    }

    const securityContext = getRequestSecurityContext(request);
    const otpResult = await createAndSendRegistrationOtp({
      userId: user.id,
      email,
      requestIp: securityContext.requestIp,
      deviceFingerprint: securityContext.deviceFingerprint,
    });

    if (!otpResult.ok) {
      return NextResponse.json(
        {
          error:
            otpResult.reason === "COOLDOWN"
              ? `Vui lòng đợi ${otpResult.retryAfter} giây trước khi gửi lại OTP.`
              : "Bạn đã yêu cầu OTP quá nhiều lần. Vui lòng thử lại sau.",
          retryAfter: otpResult.retryAfter,
        },
        { status: 429 },
      );
    }

    return NextResponse.json({
      ok: true,
      requiresOtp: true,
      email,
      expiresAt: otpResult.expiresAt.toISOString(),
      resendAvailableAt: otpResult.resendAvailableAt.toISOString(),
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json(
        { error: "Email đã tồn tại." },
        { status: 409 },
      );
    }

    console.error("[auth/register] failed", {
      database: getDatabaseUrlTarget(),
      error: getErrorDetails(error),
    });

    return NextResponse.json(
      { error: "Lỗi cơ sở dữ liệu. Vui lòng thử lại." },
      { status: 500 },
    );
  }
}
