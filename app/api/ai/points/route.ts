import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getAiPointsSummary } from "@/lib/ai-points";

export async function GET() {
  try {
    const user = await requireRole("STUDENT", "TEACHER", "ADMIN");
    const summary = await getAiPointsSummary(user.id);
    return NextResponse.json(summary);
  } catch {
    return NextResponse.json({ error: "Bạn chưa đăng nhập." }, { status: 401 });
  }
}
