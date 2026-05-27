import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function estimateLevel(score: number, maxScore: number, bandLevel?: string) {
  if (bandLevel) return bandLevel;
  const percent = maxScore > 0 ? (score / maxScore) * 100 : 0;
  if (percent >= 85) return "Advanced";
  if (percent >= 70) return "Upper Intermediate";
  if (percent >= 55) return "Intermediate";
  if (percent >= 40) return "Elementary";
  return "Beginner";
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "all";

    const [testAttempts, aiAssessments] = await Promise.all([
      type === "all" || type === "TEST"
        ? prisma.testAttempt.findMany({
            where: { userId: user.id },
            include: {
              test: {
                select: {
                  id: true,
                  name: true,
                  course: { select: { id: true, name: true } },
                },
              },
            },
            orderBy: { submittedAt: "desc" },
          })
        : Promise.resolve([]),
      type === "all" || type === "SPEAKING" || type === "WRITING"
        ? prisma.aiAssessment.findMany({
            where: {
              userId: user.id,
              ...(type === "SPEAKING" || type === "WRITING" ? { type } : {}),
            },
            include: { course: { select: { id: true, name: true } } },
            orderBy: { submittedAt: "desc" },
          })
        : Promise.resolve([]),
    ]);

    const testItems = testAttempts.map((attempt) => {
      const stored = (attempt.results ?? {}) as Record<string, unknown>;
      return {
        id: attempt.id,
        type: "TEST",
        title: attempt.test.name,
        course: attempt.test.course,
        score: attempt.score,
        maxScore: attempt.maxScore,
        bandSystem: "GENERAL",
        bandLevel: estimateLevel(attempt.score, attempt.maxScore),
        bandScore: attempt.score,
        submittedAt: attempt.submittedAt,
        durationSeconds: Math.max(0, Math.round((attempt.submittedAt.getTime() - attempt.startedAt.getTime()) / 1000)),
        summary: `${Number(stored.correctAnswers ?? 0)}/${Number(stored.totalQuestions ?? 0)} cau dung`,
      };
    });

    const aiItems = aiAssessments.map((item) => ({
      id: item.id,
      type: item.type,
      title: item.title || (item.type === "SPEAKING" ? "Speaking AI" : "Writing AI"),
      course: item.course,
      score: item.score,
      maxScore: item.maxScore,
      bandSystem: item.bandSystem,
      bandLevel: item.bandLevel,
      bandScore: item.bandScore,
      submittedAt: item.submittedAt,
      durationSeconds: item.durationSeconds,
      summary: typeof (item.feedback as Record<string, unknown>)?.evaluation === "object"
        ? String(((item.feedback as Record<string, unknown>).evaluation as Record<string, unknown>)?.summary || "")
        : "",
    }));

    const results = [...testItems, ...aiItems].sort(
      (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
    );

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Error fetching result history:", error);
    return NextResponse.json({ error: "Failed to fetch result history" }, { status: 500 });
  }
}
