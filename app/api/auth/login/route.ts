import { NextResponse } from "next/server";
import {
  ROLE_HOME,
  createAuthToken,
  setAuthCookie,
  verifyPassword,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
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
      },
    });

    if (!user || !verifyPassword(password, user.password)) {
      return NextResponse.json(
        { error: "Email hoac mat khau khong dung." },
        { status: 401 },
      );
    }

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
