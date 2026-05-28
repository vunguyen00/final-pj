import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const applications = await prisma.teacherApplication.findMany({
    include: {
      user: { select: { id: true, username: true, email: true, phoneNumber: true, role: true } },
      language: true,
      certificates: true,
      antiCheatLogs: { orderBy: { serverTimestamp: "desc" }, take: 50 },
      suspiciousEvents: true,
      entranceTest: { select: { id: true, name: true, passingScore: true, maxScore: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const attemptIds = applications
    .map((application) => application.entranceAttemptId)
    .filter((id): id is string => Boolean(id));
  const attempts = await prisma.testAttempt.findMany({
    where: { id: { in: attemptIds } },
    select: { id: true, score: true, maxScore: true, isPassed: true, submittedAt: true },
  });
  const attemptMap = new Map(attempts.map((attempt) => [attempt.id, attempt]));

  return NextResponse.json({
    applications: applications.map((application) => ({
      ...application,
      entranceAttempt: application.entranceAttemptId ? attemptMap.get(application.entranceAttemptId) ?? null : null,
    })),
  });
}
