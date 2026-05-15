import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id: courseId } = await params;

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, instructorId: true },
    });

    if (!course) {
      return NextResponse.json({ error: "Khong tim thay khoa hoc." }, { status: 404 });
    }

    const isOwner = course.instructorId === user.id;
    if (isOwner) {
      return NextResponse.json({ canAccess: true, reason: "OWNER" });
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: user.id, courseId } },
      select: { id: true, createdAt: true },
    });

    return NextResponse.json({
      canAccess: Boolean(enrollment),
      reason: enrollment ? "ENROLLED" : "NOT_PURCHASED",
      enrolledAt: enrollment?.createdAt ?? null,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
