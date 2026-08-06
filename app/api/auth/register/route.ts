import { NextResponse } from "next/server";
import { validateStrongPassword } from "@/lib/auth";
import { getDatabaseUrlTarget } from "@/lib/database-url";
import { prisma } from "@/lib/prisma";
import {
  createAndSendRegistrationOtp,
  getRegistrationOtpCookieOptions,
  getRequestSecurityContext,
  REGISTRATION_OTP_COOKIE_NAME,
  reserveRegistrationOtpCapacity,
} from "@/lib/registration-otp";

function getErrorDetails(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      code: "code" in error ? String(error.code) : undefined,
    };
  }
  return { name: "UnknownError", message: "Unknown error." };
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
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const confirmPassword = typeof body.confirmPassword === "string" ? body.confirmPassword : "";

    if (!username || !email || !password || !confirmPassword) {
      return NextResponse.json(
        { error: "Vui lòng nhập đầy đủ tên hiển thị, email, mật khẩu và xác nhận mật khẩu." },
        { status: 400 },
      );
    }
    if (
      username.length > 100 ||
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return NextResponse.json(
        { error: "Tên hiển thị hoặc email không hợp lệ." },
        { status: 400 },
      );
    }
    if (password !== confirmPassword) {
      return NextResponse.json({ error: "Xác nhận mật khẩu không khớp." }, { status: 400 });
    }
    if (password.length > 128) {
      return NextResponse.json(
        { error: "Mật khẩu không được vượt quá 128 ký tự." },
        { status: 400 },
      );
    }
    const passwordError = validateStrongPassword(password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    const securityContext = getRequestSecurityContext(request);
    const capacity = reserveRegistrationOtpCapacity({
      email,
      requestIp: securityContext.requestIp,
      deviceFingerprint: securityContext.deviceFingerprint,
    });
    if (!capacity.ok) {
      return NextResponse.json(
        {
          error:
            capacity.reason === "COOLDOWN"
              ? `Vui lòng đợi ${capacity.retryAfter} giây trước khi gửi lại OTP.`
              : "Bạn đã yêu cầu OTP quá nhiều lần. Vui lòng thử lại sau.",
          retryAfter: capacity.retryAfter,
        },
        { status: 429 },
      );
    }

    // The only pre-verification database operation is this read-only duplicate check.
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existingUser) {
      return NextResponse.json({ error: "Email đã tồn tại." }, { status: 409 });
    }

    const otpResult = await createAndSendRegistrationOtp({
      username,
      email,
      password,
      requestIp: securityContext.requestIp,
      deviceFingerprint: securityContext.deviceFingerprint,
      rateLimitReserved: true,
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

    const response = NextResponse.json({
      ok: true,
      requiresOtp: true,
      email,
      expiresAt: otpResult.expiresAt.toISOString(),
      resendAvailableAt: otpResult.resendAvailableAt.toISOString(),
    });
    response.cookies.set(
      REGISTRATION_OTP_COOKIE_NAME,
      otpResult.challengeToken,
      getRegistrationOtpCookieOptions(),
    );
    return response;
  } catch (error) {
    console.error("[auth/register] failed", {
      database: getDatabaseUrlTarget(),
      error: getErrorDetails(error),
    });
    return NextResponse.json(
      { error: "Không thể gửi OTP lúc này. Vui lòng thử lại." },
      { status: 500 },
    );
  }
}
