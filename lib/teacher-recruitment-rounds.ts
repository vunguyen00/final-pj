import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { TeacherExamLocation } from "@/lib/teacher-onboarding";

export const TEACHING_LANGUAGE_APPLICATION_STATUSES = ["APPROVED", "CONVERTED_TO_TEACHER"] as const;

export function hashRecruitmentGradingToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function parseRoundLocations(value: unknown): TeacherExamLocation[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const location = item as Partial<TeacherExamLocation>;
    if (typeof location.id !== "string" || typeof location.name !== "string" || typeof location.address !== "string") return [];
    return [{
      id: location.id,
      name: location.name,
      address: location.address,
      note: typeof location.note === "string" ? location.note : "",
    }];
  });
}

export async function getActiveRecruitmentRound() {
  return prisma.recruitmentRound.findFirst({
    where: { status: "OPEN" },
    orderBy: { registrationOpensAt: "desc" },
  });
}

export async function getRecruitmentRoundForGrading(token: string) {
  if (!token) return null;
  return prisma.recruitmentRound.findUnique({
    where: { gradingTokenHash: hashRecruitmentGradingToken(token) },
    include: {
      applications: {
        include: {
          user: { select: { username: true, email: true } },
          language: { select: { id: true, name: true, code: true } },
          certificates: { select: { id: true, fileName: true, fileUrl: true } },
          examResult: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export function serializeRecruitmentRound<T extends {
  registrationOpensAt: Date;
  registrationClosesAt: Date;
  examStartsAt: Date;
  examEndsAt: Date;
  gradingTokenIssuedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  locations: unknown;
}>(round: T) {
  return {
    ...round,
    locations: parseRoundLocations(round.locations),
    registrationOpensAt: round.registrationOpensAt.toISOString(),
    registrationClosesAt: round.registrationClosesAt.toISOString(),
    examStartsAt: round.examStartsAt.toISOString(),
    examEndsAt: round.examEndsAt.toISOString(),
    gradingTokenIssuedAt: round.gradingTokenIssuedAt?.toISOString() ?? null,
    createdAt: round.createdAt.toISOString(),
    updatedAt: round.updatedAt.toISOString(),
  };
}
