import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await params;
    if (userId === admin.id) {
      return NextResponse.json({ error: "Admin khong the tu khoa tai khoan cua minh." }, { status: 400 });
    }

    const body = await request.json();
    const data: { isBanned?: boolean; email?: string; role?: string } = {};
    if (typeof body.isBanned === "boolean") data.isBanned = body.isBanned;
    if (typeof body.email === "string" && body.email.trim()) data.email = body.email.trim().toLowerCase();
    if (typeof body.role === "string" && ["USER", "TEACHER", "ADMIN"].includes(body.role)) data.role = body.role;

    const updated = await prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, username: true, email: true, role: true, isBanned: true },
    });

    return NextResponse.json({ user: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Loi he thong.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
