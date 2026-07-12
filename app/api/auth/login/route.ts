import { NextResponse } from "next/server";
import {
  ROLE_HOME,
  createAuthToken,
  setAuthCookie,
  verifyPassword,
} from "@/lib/auth";
import { getDatabaseUrlTarget } from "@/lib/database-url";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

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

export async function POST(request: Request) {
  let body: {
    email?: unknown;
    password?: unknown;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Du lieu gui len khong hop le." }, { status: 400 });
  }

  console.info("[auth/login] DATABASE_URL target:", getDatabaseUrlTarget());

  try {
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json(
        { error: "Vui lòng nhập đầy đủ email và password." },
        { status: 400 },
      );
    }

    const ip = getClientIp(request);
    const ipLimit = checkRateLimit({
      key: `login:ip:${ip}`,
      limit: 30,
      windowMs: 15 * 60 * 1000,
    });
    const emailLimit = checkRateLimit({
      key: `login:email:${email}`,
      limit: 8,
      windowMs: 15 * 60 * 1000,
    });
    if (!ipLimit.ok || !emailLimit.ok) {
      return NextResponse.json(
        {
          error: "Bạn đăng nhập sai quá nhiều lần. Vui lòng thử lại sau.",
          retryAfter: Math.max(ipLimit.retryAfter, emailLimit.retryAfter),
        },
        { status: 429 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        password: true,
        role: true,
        isBanned: true,
        accountStatus: true,
      },
    });

    if (!user || !verifyPassword(password, user.password)) {
      return NextResponse.json(
        { error: "Email hoac mat khau khong dung." },
        { status: 401 },
      );
    }

    if (user.isBanned) {
      return NextResponse.json(
        { error: "Tài khoản đang bị khóa. Vui lòng liên hệ admin." },
        { status: 403 },
      );
    }

    if (user.accountStatus !== "ACTIVE") {
      return NextResponse.json(
        {
          error: "Tai khoan chua duoc xac thuc OTP qua email.",
          requiresVerification: true,
          email,
        },
        { status: 403 },
      );
    }

    const token = createAuthToken(user.id, user.role);
    await setAuthCookie(token);

    return NextResponse.json({
      ok: true,
      redirectTo: ROLE_HOME[user.role],
    });
  } catch (error) {
    console.error("[auth/login] failed", {
      database: getDatabaseUrlTarget(),
      error: getErrorDetails(error),
    });

    return NextResponse.json(
      { error: "Lỗi cơ sở dữ liệu. Vui lòng thử lại." },
      { status: 500 },
    );
  }
}
