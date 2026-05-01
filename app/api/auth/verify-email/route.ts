import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { exists: false, error: "Email la bat buoc" },
        { status: 400 },
      );
    }

    const normalizedEmail =
      typeof email === "string" ? email.trim().toLowerCase() : "";

    if (!normalizedEmail) {
      return NextResponse.json(
        { exists: false, error: "Email la bat buoc" },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, role: true },
    });

    return NextResponse.json({ exists: !!user, role: user?.role ?? null });
  } catch (error) {
    console.error("Verify email error:", error);
    return NextResponse.json(
      { exists: false, error: "Loi server" },
      { status: 500 },
    );
  }
}
