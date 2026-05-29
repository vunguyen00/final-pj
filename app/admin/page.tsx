import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveLanguages, getTeacherEntranceSetting } from "@/lib/teacher-onboarding";
import AdminDashboard from "./AdminDashboard";

export default async function AdminPage() {
  const user = await requireRole("ADMIN");
  const [setting, languages, users, applications] = await Promise.all([
    getTeacherEntranceSetting(),
    getActiveLanguages(),
    prisma.user.findMany({
      select: { id: true, username: true, email: true, role: true, isBanned: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.teacherApplication.findMany({
      include: {
        user: { select: { username: true, email: true, phoneNumber: true, role: true } },
        language: true,
        certificates: true,
        suspiciousEvents: true,
        antiCheatLogs: { orderBy: { serverTimestamp: "desc" }, take: 50 },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  const attemptIds = applications
    .map((application) => application.entranceAttemptId)
    .filter((id): id is string => Boolean(id));
  const attempts = await prisma.testAttempt.findMany({
    where: { id: { in: attemptIds } },
    select: { id: true, score: true, maxScore: true, isPassed: true },
  });
  const attemptMap = new Map(attempts.map((attempt) => [attempt.id, attempt]));

  return (
    <div className="mt-6">
      <AdminDashboard
        initialEnabled={setting.enabled}
        initialUsers={users}
        initialLanguages={languages.map((language) => ({
          id: language.id,
          name: language.name,
          code: language.code,
          isActive: language.isActive,
        }))}
        initialApplications={applications.map((application) => ({
          id: application.id,
          status: application.status,
          attemptNo: application.attemptNo,
          rejectionReason: application.rejectionReason,
          user: application.user,
          language: { name: application.language.name },
          certificates: application.certificates.map((certificate) => ({
            id: certificate.id,
            fileName: certificate.fileName,
            fileUrl: certificate.fileUrl,
            expiryDate: certificate.expiryDate.toISOString(),
          })),
          suspiciousEvents: application.suspiciousEvents.map((event) => ({
            eventType: event.eventType,
            count: event.count,
            totalDurationSeconds: event.totalDurationSeconds,
            severity: event.severity,
          })),
          antiCheatLogs: application.antiCheatLogs.map((log) => ({
            id: log.id,
            eventType: log.eventType,
            detail: log.detail,
            serverTimestamp: log.serverTimestamp.toISOString(),
          })),
          entranceAttempt: application.entranceAttemptId ? attemptMap.get(application.entranceAttemptId) ?? null : null,
        }))}
      />
    </div>
  );
}
