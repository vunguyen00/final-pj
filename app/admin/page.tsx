import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AdminShell from "./AdminShell";
import { getDashboardAnalytics } from "@/lib/admin-analytics";
import { getTeacherEntranceSetting, getActiveLanguages } from "@/lib/teacher-onboarding";
import { getCourseAutoApprovalSetting } from "@/lib/course-approval";
import type { AdminManagedTest } from "./types";

export default async function AdminPage() {
  await requireRole("ADMIN");

  const setting = await getTeacherEntranceSetting();
  const courseApprovalSetting = await getCourseAutoApprovalSetting();
  const languages = await getActiveLanguages();

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
    suspiciousEvents: app.suspiciousEvents.map((s) => ({ ...s, updatedAt: s.updatedAt ? s.updatedAt.toISOString() : null })),
    entranceAttempt: app.entranceAttemptId ? (attemptMap.get(app.entranceAttemptId) ?? null) : null,
  }));

  const analyticsInitialData = await getDashboardAnalytics({ preset: "LAST_30_DAYS" });
  const courses = await prisma.course.findMany({
    include: {
      language: { select: { id: true, name: true, code: true } },
      instructor: {
        select: {
          id: true,
          username: true,
          email: true,
          teacherApplications: {
            where: { status: "APPROVED" },
            select: {
              language: { select: { id: true, name: true, code: true } },
            },
            orderBy: { reviewedAt: "desc" },
            take: 1,
          },
        },
      },
      _count: { select: { modules: true, tests: true, enrollments: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const adminManagedTests = await prisma.test.findMany({
    where: {
      kind: { in: ["TEACHER_ENTRANCE", "PUBLIC_PRACTICE"] },
    },
    select: {
      id: true,
      name: true,
      kind: true,
      assessmentMode: true,
      language: { select: { id: true, name: true, code: true } },
      createdAt: true,
      _count: { select: { questions: true, attempts: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="mt-6">
      <AdminShell
        initialEnabled={Boolean(setting.enabled)}
        initialCourseAutoApproval={Boolean(courseApprovalSetting.enabled)}
        initialLanguages={languages}
        initialApplications={applications}
        initialCourses={courses.map((course) => ({
          id: course.id,
          name: course.name,
          description: course.description,
          status: course.status,
          createdAt: course.createdAt.toISOString(),
          instructor: course.instructor
            ? {
                id: course.instructor.id,
                username: course.instructor.username,
                email: course.instructor.email,
              }
            : null,
          language: course.language,
          registeredLanguage: course.instructor?.teacherApplications[0]?.language ?? null,
          _count: course._count,
        }))}
        initialAdminManagedTests={adminManagedTests.map((test) => ({
          ...test,
          kind: test.kind as AdminManagedTest["kind"],
          createdAt: test.createdAt.toISOString(),
        }))}
        analyticsInitialData={analyticsInitialData}
      />
    </div>
  );
}
