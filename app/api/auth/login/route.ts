import { NextResponse } from "next/server";
import {
  ROLE_HOME,
  createAuthToken,
  setAuthCookie,
  verifyPassword,
} from "@/lib/auth";
import { getDatabaseUrlTarget } from "@/lib/database-url";
import { prisma } from "@/lib/prisma";

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
        { error: "Vui long nhap day du email va password." },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        password: true,
        role: true,
        isBanned: true,
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
        { error: "Tai khoan dang bi khoa. Vui long lien he admin." },
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
      { error: "Loi co so du lieu. Vui long thu lai." },
      { status: 500 },
    );
  }
}
