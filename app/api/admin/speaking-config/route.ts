import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  getSpeakingAiSetting,
  setSpeakingAiSetting,
  type SpeakingAiExamType,
} from "@/lib/speaking-ai-setting";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const setting = await getSpeakingAiSetting();
  return NextResponse.json(setting);
}

export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as { examType?: string; durationSeconds?: number };
    const examType = String(body.examType || "").toUpperCase();
    if (examType !== "IELTS" && examType !== "HSK") {
      return NextResponse.json({ error: "Exam type khong hop le." }, { status: 400 });
    }

    const setting = await setSpeakingAiSetting({
      examType: examType as SpeakingAiExamType,
      durationSeconds: Number(body.durationSeconds),
    });

    return NextResponse.json(setting);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Loi he thong.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
