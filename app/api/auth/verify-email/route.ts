import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { exists: false, error: "Email là bắt buộc" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    return NextResponse.json({ exists: !!user });
  } catch (error) {
    console.error("Verify email error:", error);
    return NextResponse.json(
      { exists: false, error: "Lỗi server" },
      { status: 500 }
    );
  }
}