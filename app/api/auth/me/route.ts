import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth";
import { getUserBalance } from "@/lib/wallet";
import { getAiPointsSummary } from "@/lib/ai-points";
import { getTeacherEntranceSetting } from "@/lib/teacher-onboarding";

export async function GET() {
  try {
    const user = await authenticate();

    if (!user) {
      return NextResponse.json({ user: null });
    }

    const [balance, aiPoints, teacherEntranceSetting] = await Promise.all([
      user.role === "ADMIN" ? Promise.resolve(0) : getUserBalance(user.id),
      getAiPointsSummary(user.id),
      user.role === "STUDENT" ? getTeacherEntranceSetting() : Promise.resolve({ enabled: false }),
    ]);

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
        teacherRegistrationEnabled: teacherEntranceSetting.enabled,
      },
    });
  } catch {
    return NextResponse.json({ user: null });
  }
}
