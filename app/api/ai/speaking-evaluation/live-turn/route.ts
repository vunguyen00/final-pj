import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ollamaService, speakingService } from "@/lib/ai";
import { getSpeakingAiSetting } from "@/lib/speaking-ai-setting";

type Turn = { role: "ai" | "student"; text: string };

function fallbackQuestion(examType: "IELTS" | "HSK", turnCount: number) {
  if (examType === "HSK") {
    return turnCount > 2
      ? "Please add one concrete detail in Chinese to support your point."
      : "Please continue your answer in Chinese and describe your experience.";
  }
  return turnCount > 2
    ? "Could you provide a concrete example to support that?"
    : "Can you continue and explain your idea in more detail?";
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      examType?: string;
      prompt?: string;
      history?: Turn[];
    };

    const speakingSetting = await getSpeakingAiSetting();
    const examType: "IELTS" | "HSK" = speakingSetting.examType;

    const history = Array.isArray(body.history)
      ? body.history
          .filter((item): item is Turn => Boolean(item && (item.role === "ai" || item.role === "student")))
          .map((item) => ({
            role: item.role,
            text: String(item.text || "").trim(),
          }))
          .filter((item) => item.text.length > 0)
      : [];

    const healthy = await ollamaService.healthCheck();
    if (!healthy) {
      return NextResponse.json({
        question: fallbackQuestion(examType, history.length),
        fallback: true,
      });
    }

    const question = await speakingService.generateFollowUpQuestion({
      examType,
      prompt: String(body.prompt || ""),
      history,
    });

    return NextResponse.json({ question, fallback: false });
  } catch (error) {
    console.error("Error generating speaking live turn:", error);
    return NextResponse.json({ error: "Khong tao duoc cau hoi tiep theo." }, { status: 500 });
  }
}
