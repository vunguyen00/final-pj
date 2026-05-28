import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth";
import { getUserBalance } from "@/lib/wallet";
import { getAiPointsSummary } from "@/lib/ai-points";

export async function GET() {
  try {
    const user = await authenticate();

    if (!user) {
      return NextResponse.json({ user: null });
    }

    const [balance, aiPoints] =
      user.role === "STUDENT" || user.role === "TEACHER"
        ? await Promise.all([getUserBalance(user.id), getAiPointsSummary(user.id)])
        : [0, { earned: 0, spent: 0, available: 0 }];

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        phoneNumber: user.phoneNumber,
        learningLanguageId: user.learningLanguageId,
        balance,
        aiPoints,
      },
    });
  } catch {
    return NextResponse.json({ user: null });
  }
}
