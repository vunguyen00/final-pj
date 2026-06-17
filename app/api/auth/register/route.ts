import { NextResponse } from "next/server";
import {
  ROLE_HOME,
  createAuthToken,
  hashPassword,
  setAuthCookie,
  validateStrongPassword,
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
    return NextResponse.json({ error: "Du lieu gui len khong hop le." }, { status: 400 });
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
        { error: "Vui long nhap day du username, email, mat khau va xac nhan mat khau." },
        { status: 400 },
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: "Xac nhan mat khau khong khop." }, { status: 400 });
    }

    const passwordError = validateStrongPassword(password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email da ton tai." },
        { status: 409 },
      );
    }

    const passwordHash = hashPassword(password);
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: passwordHash,
        role: "STUDENT",
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

    const token = createAuthToken(user.id, user.role);
    await setAuthCookie(token);

    return NextResponse.json({
      ok: true,
      redirectTo: ROLE_HOME[user.role],
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json(
        { error: "Email da ton tai." },
        { status: 409 },
      );
    }

    console.error("[auth/register] failed", {
      database: getDatabaseUrlTarget(),
      error: getErrorDetails(error),
    });

    return NextResponse.json(
      { error: "Loi co so du lieu. Vui long thu lai." },
      { status: 500 },
    );
  }
}
