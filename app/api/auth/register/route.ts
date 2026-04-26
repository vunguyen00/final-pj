import { NextResponse } from "next/server";
import {
  ROLE_HOME,
  createAuthToken,
  hashPassword,
  setAuthCookie,
  validateStrongPassword,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
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

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email hoac username da ton tai." },
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

    const token = createAuthToken(user.id, user.role);
    await setAuthCookie(token);

    return NextResponse.json({
      ok: true,
      redirectTo: ROLE_HOME[user.role],
    });
  } catch {
    return NextResponse.json({ error: "Loi he thong." }, { status: 500 });
  }
}
