import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth";
import { getAiPointsSummary } from "@/lib/ai-points";
import { getTeacherEntranceSetting } from "@/lib/teacher-onboarding";

export async function GET() {
  try {
    const user = await authenticate();

    if (!user) {
      return NextResponse.json({ user: null });
    }

    const [aiPoints, teacherEntranceSetting] = await Promise.all([
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
        aiPoints,
        teacherRegistrationEnabled: teacherEntranceSetting.enabled,
      },
    });
  } catch {
    return NextResponse.json({ user: null });
  }
}
