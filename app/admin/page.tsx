import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AdminShell from "./AdminShell";
import { getDashboardAnalytics } from "@/lib/admin-analytics";
import { getTeacherEntranceSetting, getActiveLanguages } from "@/lib/teacher-onboarding";
import { getCourseAutoApprovalSetting } from "@/lib/course-approval";
import type { AdminManagedTest } from "./types";
import type { AdminWithdrawal } from "./AdminRevenueWithdrawals";

export default async function AdminPage() {
  await requireRole("ADMIN");

  const [
    setting,
    courseApprovalSetting,
    languages,
    applicationsRaw,
    analyticsInitialData,
    courses,
    adminManagedTests,
    withdrawals,
  ] = await Promise.all([
    getTeacherEntranceSetting(),
    getCourseAutoApprovalSetting(),
    getActiveLanguages(),
    prisma.teacherApplication.findMany({
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
    }),
    getDashboardAnalytics({ preset: "LAST_30_DAYS" }),
    prisma.course.findMany({
      include: {
        language: { select: { id: true, name: true, code: true } },
        instructor: {
          select: {
            id: true,
            username: true,
            email: true,
            teacherApplications: {
              where: { status: "APPROVED" },
              select: { language: { select: { id: true, name: true, code: true } } },
              orderBy: { reviewedAt: "desc" },
              take: 1,
            },
          },
        },
        _count: { select: { modules: true, tests: true, enrollments: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.test.findMany({
      where: { kind: { in: ["TEACHER_ENTRANCE", "PUBLIC_PRACTICE"] } },
      select: {
        id: true,
        name: true,
        kind: true,
        assessmentMode: true,
        timeLimit: true,
        language: { select: { id: true, name: true, code: true } },
        createdAt: true,
        _count: { select: { questions: true, attempts: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.teacherRevenueWithdrawal.findMany({
      include: {
        teacher: { select: { id: true, username: true, email: true } },
        complaint: {
          select: {
            id: true,
            reason: true,
            reportedAmount: true,
            message: true,
            status: true,
            adminNote: true,
            resolvedAt: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);

  const attemptIds = applicationsRaw.flatMap((application) => application.entranceAttemptId ? [application.entranceAttemptId] : []);
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
        initialWithdrawals={withdrawals.map((item) => ({
          ...item,
          status: item.status as AdminWithdrawal["status"],
          createdAt: item.createdAt.toISOString(),
          processedAt: item.processedAt?.toISOString() ?? null,
          complaint: item.complaint
            ? {
                ...item.complaint,
                status: item.complaint.status as NonNullable<AdminWithdrawal["complaint"]>["status"],
                reason: item.complaint.reason as NonNullable<AdminWithdrawal["complaint"]>["reason"],
                createdAt: item.complaint.createdAt.toISOString(),
                resolvedAt: item.complaint.resolvedAt?.toISOString() ?? null,
              }
            : null,
        }))}
      />
    </div>
  );
}
