import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { AI_POINT_PRICE_VND, purchaseAiPointsWithWallet } from "@/lib/ai-points";

export async function POST(request: Request) {
  try {
    const user = await requireRole("STUDENT", "TEACHER", "ADMIN");
    if (user.role === "ADMIN") {
      return NextResponse.json({ error: "Admin không cần mua hạt đậu." }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const points = Number(body?.beans ?? body?.points);
    const result = await purchaseAiPointsWithWallet(user.id, points);
    return NextResponse.json({ ok: true, ...result, beans: result.points, beanPriceVnd: result.pricePerPoint });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_POINTS") {
      return NextResponse.json({ error: "Số hạt đậu không hợp lệ." }, { status: 400 });
    }

    if (error instanceof Error && error.message === "INSUFFICIENT_BALANCE") {
      return NextResponse.json(
        {
          error: "Số dư ví không đủ để mua hạt đậu.",
          requiresTopUp: true,
          pricePerPoint: AI_POINT_PRICE_VND,
        },
        { status: 400 },
      );
    }

    console.error("[AI_POINTS][BUY] unexpected error", error);
    return NextResponse.json({ error: "Loi he thong." }, { status: 500 });
  }
}
