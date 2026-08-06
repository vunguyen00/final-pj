import { prisma } from "@/lib/prisma";
import {
  getActiveLanguages,
  getTeacherRecruitmentSetting,
  isTeacherRegistrationOpen,
} from "@/lib/teacher-onboarding";
import { getActiveRecruitmentRound, parseRoundLocations } from "@/lib/teacher-recruitment-rounds";

export async function getTeacherRegistrationData(userId?: string) {
  const [setting, activeRound, languages, applications] = await Promise.all([
    getTeacherRecruitmentSetting(),
    getActiveRecruitmentRound(),
    getActiveLanguages(),
    userId
      ? prisma.teacherApplication.findMany({
          where: { userId },
          select: {
            id: true,
            status: true,
            attemptNo: true,
            createdAt: true,
            submittedAt: true,
            rejectionReason: true,
            examLocationId: true,
            examLocationName: true,
            examLocationAddress: true,
            examLocationNote: true,
            recruitmentRound: { select: { id: true, name: true } },
            language: { select: { id: true, name: true, code: true } },
          },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
  ]);

  const roundLocations = activeRound ? parseRoundLocations(activeRound.locations) : [];
  const publicSetting = activeRound ? {
    ...setting,
    activeRoundId: activeRound.id,
    title: activeRound.name,
    description: activeRound.description,
    locations: roundLocations,
    locationIds: roundLocations.map((location) => location.id),
    location: roundLocations.map((location) => `${location.name}: ${location.address}`).join(" | "),
    registrationOpensAt: activeRound.registrationOpensAt.toISOString(),
    registrationClosesAt: activeRound.registrationClosesAt.toISOString(),
    examStartsAt: activeRound.examStartsAt.toISOString(),
    examEndsAt: activeRound.examEndsAt.toISOString(),
  } : setting;

  return {
    generatedAt: new Date().toISOString(),
    setting: publicSetting,
    activeRound: activeRound ? { id: activeRound.id, name: activeRound.name } : null,
    registrationOpen: Boolean(activeRound && setting.enabled && setting.activeRoundId === activeRound.id && isTeacherRegistrationOpen(publicSetting)),
    languages,
    applications: applications.map((application) => ({
      ...application,
      createdAt: application.createdAt.toISOString(),
      submittedAt: application.submittedAt?.toISOString() ?? null,
    })),
  };
}
