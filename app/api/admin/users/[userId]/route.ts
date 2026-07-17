import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/app/generated/prisma/enums";

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
      return NextResponse.json({ error: "Admin không thể tự khóa tài khoản của mình." }, { status: 400 });
    }

    const body = await request.json();
    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, isBanned: true },
    });
    if (!target) return NextResponse.json({ error: "Không tìm thấy tài khoản." }, { status: 404 });

    const data: {
      isBanned?: boolean;
      email?: string;
      role?: Role;
      authVersion?: { increment: number };
    } = {};
    if (typeof body.isBanned === "boolean") data.isBanned = body.isBanned;
    if (typeof body.email === "string" && body.email.trim()) data.email = body.email.trim().toLowerCase();
    if (body.role === "STUDENT" || body.role === "TEACHER" || body.role === "ADMIN") {
      data.role = body.role;
    }
    const disablesAdmin =
      target.role === "ADMIN" &&
      (data.isBanned === true || (data.role && data.role !== "ADMIN"));
    if (disablesAdmin) {
      const otherActiveAdmins = await prisma.user.count({
        where: { id: { not: userId }, role: "ADMIN", isBanned: false, accountStatus: "ACTIVE" },
      });
      if (otherActiveAdmins === 0) {
        return NextResponse.json(
          { error: "Không thể khóa hoặc hạ quyền quản trị viên hoạt động cuối cùng." },
          { status: 409 },
        );
      }
    }

    const securityChanged =
      data.isBanned === true || (data.role !== undefined && data.role !== target.role);
    if (securityChanged) data.authVersion = { increment: 1 };

    const updated = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data,
        select: { id: true, username: true, email: true, role: true, isBanned: true },
      });
      if (securityChanged) await tx.session.deleteMany({ where: { userId } });
      if (
        target.role === "TEACHER" &&
        (data.isBanned === true || (data.role && data.role !== "TEACHER"))
      ) {
        await tx.course.updateMany({
          where: { instructorId: userId, status: "ACTIVE" },
          data: { status: "LOCKED" },
        });
      }
      return user;
    });

    return NextResponse.json({ user: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi hệ thống.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
