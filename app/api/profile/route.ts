import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const phoneNumber = typeof body.phoneNumber === "string" ? body.phoneNumber.trim() : "";
    const learningLanguageId =
      typeof body.learningLanguageId === "string" && body.learningLanguageId.trim()
        ? body.learningLanguageId.trim()
        : null;

    if (!username) {
      return NextResponse.json({ error: "Tên hiển thị không được để trống." }, { status: 400 });
    }

    if (learningLanguageId) {
      const language = await prisma.learningLanguage.findFirst({
        where: { id: learningLanguageId, isActive: true },
        select: { id: true },
      });
      if (!language) {
        return NextResponse.json({ error: "Ngôn ngữ không hợp lệ." }, { status: 400 });
      }
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        username,
        phoneNumber: phoneNumber || null,
        learningLanguageId,
      },
      select: {
        id: true,
        username: true,
        email: true,
        phoneNumber: true,
        learningLanguageId: true,
      },
    });

    return NextResponse.json({ user: updated });
  } catch {
    return NextResponse.json({ error: "Lỗi hệ thống." }, { status: 500 });
  }
}
