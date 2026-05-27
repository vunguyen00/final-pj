import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { spendAiPoints } from "@/lib/ai-points";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const user = await requireRole("STUDENT");
    const body = await request.json().catch(() => ({}));

    const points = Number(body?.points);
    const feature = typeof body?.feature === "string" ? body.feature.trim() : "AI_FEATURE";
    const courseId = typeof body?.courseId === "string" ? body.courseId.trim() : "";
    const sourceId = typeof body?.sourceId === "string" ? body.sourceId.trim() : undefined;

    if (courseId) {
      const enrollment = await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId: user.id, courseId } },
      });

      if (!enrollment) {
        return NextResponse.json({ error: "Ban khong co quyen tren khoa hoc nay." }, { status: 403 });
      }
    }

    const result = await spendAiPoints(user.id, courseId || null, points, feature, sourceId);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof Error && error.message === "INSUFFICIENT_POINTS") {
      return NextResponse.json({ error: "Khong du diem AI." }, { status: 400 });
    }

    if (error instanceof Error && error.message === "INVALID_POINTS") {
      return NextResponse.json({ error: "So diem khong hop le." }, { status: 400 });
    }

    return NextResponse.json({ error: "Loi he thong." }, { status: 500 });
  }
}
