import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AdminShell from "./AdminShell";
import { getDashboardAnalytics } from "@/lib/admin-analytics";
import { getTeacherEntranceSetting, getActiveLanguages } from "@/lib/teacher-onboarding";

export default async function AdminPage() {
  await requireRole("ADMIN");

  const setting = await getTeacherEntranceSetting();
  const languages = await getActiveLanguages();

  const users = await prisma.user.findMany({
    select: { id: true, username: true, email: true, role: true, isBanned: true },
    orderBy: { username: "asc" },
    take: 200,
  });

  const applicationsRaw = await prisma.teacherApplication.findMany({
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

  const attemptIds = applicationsRaw.map((a) => a.entranceAttemptId).filter(Boolean) as string[];
  const attempts = attemptIds.length
    ? await prisma.testAttempt.findMany({ where: { id: { in: attemptIds } }, select: { id: true, score: true, maxScore: true, isPassed: true, submittedAt: true } })
    : [];
  const attemptMap = new Map(attempts.map((at) => [at.id, { ...at, submittedAt: at.submittedAt?.toISOString() ?? null }] ))

  const applications = applicationsRaw.map((app) => ({
    ...app,
    submittedAt: app.submittedAt ? app.submittedAt.toISOString() : null,
    reviewedAt: app.reviewedAt ? app.reviewedAt.toISOString() : null,
    certificates: app.certificates.map((c) => ({ ...c, expiryDate: c.expiryDate ? c.expiryDate.toISOString() : null })),
    antiCheatLogs: app.antiCheatLogs.map((log) => ({ ...log, serverTimestamp: log.serverTimestamp ? log.serverTimestamp.toISOString() : null })),
    suspiciousEvents: app.suspiciousEvents.map((s) => ({ ...s, updatedAt: (s as any).updatedAt ? (s as any).updatedAt.toISOString() : null })),
    entranceAttempt: app.entranceAttemptId ? (attemptMap.get(app.entranceAttemptId) ?? null) : null,
  }));

  const analyticsInitialData = await getDashboardAnalytics({ preset: "LAST_30_DAYS" });

  return (
    <div className="mt-6">
      <AdminShell
        initialEnabled={Boolean(setting.enabled)}
        initialUsers={users}
        initialLanguages={languages}
        initialApplications={applications}
        analyticsInitialData={analyticsInitialData}
      />
    </div>
  );
}
