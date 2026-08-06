import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseRoundLocations } from "@/lib/teacher-recruitment-rounds";

const roundInclude = {
  createdBy: { select: { id: true, username: true } },
  applications: {
    include: {
      user: { select: { username: true, email: true, phoneNumber: true, role: true } },
      language: { select: { id: true, name: true, code: true } },
      certificates: true,
      examResult: true,
    },
    orderBy: { createdAt: "desc" as const },
  },
};

function serializeRound(round: Awaited<ReturnType<typeof findRounds>>[number]) {
  const safeRound = { ...round, gradingTokenHash: undefined };
  return {
    ...safeRound,
    locations: parseRoundLocations(round.locations),
    registrationOpensAt: round.registrationOpensAt.toISOString(),
    registrationClosesAt: round.registrationClosesAt.toISOString(),
    examStartsAt: round.examStartsAt.toISOString(),
    examEndsAt: round.examEndsAt.toISOString(),
    gradingTokenIssuedAt: round.gradingTokenIssuedAt?.toISOString() ?? null,
    createdAt: round.createdAt.toISOString(),
    updatedAt: round.updatedAt.toISOString(),
    applications: round.applications.map((application) => ({
      ...application,
      createdAt: application.createdAt.toISOString(),
      submittedAt: application.submittedAt?.toISOString() ?? null,
      reviewedAt: application.reviewedAt?.toISOString() ?? null,
      certificates: application.certificates.map((certificate) => ({
        ...certificate,
        createdAt: certificate.createdAt.toISOString(),
        expiryDate: certificate.expiryDate.toISOString(),
      })),
      examResult: application.examResult ? {
        ...application.examResult,
        submittedAt: application.examResult.submittedAt?.toISOString() ?? null,
        createdAt: application.examResult.createdAt.toISOString(),
        updatedAt: application.examResult.updatedAt.toISOString(),
      } : null,
    })),
  };
}

function findRounds() {
  return prisma.recruitmentRound.findMany({
    include: roundInclude,
    orderBy: { createdAt: "desc" },
  });
}

export async function GET() {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rounds = await findRounds();
  return NextResponse.json({ rounds: rounds.map(serializeRound) });
}
