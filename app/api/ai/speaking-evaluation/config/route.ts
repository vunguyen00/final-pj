import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getSpeakingAiSetting } from "@/lib/speaking-ai-setting";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "STUDENT" && user.role !== "TEACHER" && user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const setting = await getSpeakingAiSetting();
  return NextResponse.json(setting);
}
