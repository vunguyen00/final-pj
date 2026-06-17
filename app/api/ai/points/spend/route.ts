import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { AI_POINT_PRICE_VND, spendAiPoints } from "@/lib/ai-points";
import { canUseAiForCourse, shouldChargeAiPoints } from "@/lib/ai-access";

export async function POST(request: Request) {
  try {
    const user = await requireRole("STUDENT", "TEACHER", "ADMIN");
    const body = await request.json().catch(() => ({}));

    const points = Number(body?.points);
    const feature = typeof body?.feature === "string" ? body.feature.trim() : "AI_FEATURE";
    const courseId = typeof body?.courseId === "string" ? body.courseId.trim() : "";
    const sourceId = typeof body?.sourceId === "string" ? body.sourceId.trim() : undefined;

    if (courseId) {
      const canUseCourse = await canUseAiForCourse(user, courseId);
      if (!canUseCourse) {
        return NextResponse.json({ error: "Bạn không có quyền trên khóa học này." }, { status: 403 });
      }
    }

    if (!shouldChargeAiPoints(user.role)) {
      return NextResponse.json({ ok: true, spent: 0, available: 0 });
    }

    const result = await spendAiPoints(user.id, courseId || null, points, feature, sourceId);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof Error && error.message === "INSUFFICIENT_POINTS") {
      return NextResponse.json(
        {
          error: "Không đủ hạt đậu. Vào Ví tiền để mua thêm hạt đậu.",
          requiresPointPurchase: true,
          pointPriceVnd: AI_POINT_PRICE_VND,
          beanPriceVnd: AI_POINT_PRICE_VND,
        },
        { status: 400 },
      );
    }

    if (error instanceof Error && error.message === "INVALID_POINTS") {
      return NextResponse.json({ error: "Số điểm không hợp lệ." }, { status: 400 });
    }

    return NextResponse.json({ error: "Lỗi hệ thống." }, { status: 500 });
  }
}
