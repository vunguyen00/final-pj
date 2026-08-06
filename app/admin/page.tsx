import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Suspense } from "react";
import AdminShell from "./AdminShell";
import { getDashboardAnalytics } from "@/lib/admin-analytics";
import { getTeacherRecruitmentSetting, getTeacherExamLocations, getActiveLanguages } from "@/lib/teacher-onboarding";
import { getCourseAutoApprovalSetting } from "@/lib/course-approval";
import type { AdminCourseRefund } from "./types";
import type { AdminWithdrawal } from "./AdminRevenueWithdrawals";
import { getAdminManagedTestsPage } from "@/lib/admin-managed-tests";
import { parseRoundLocations } from "@/lib/teacher-recruitment-rounds";

export default async function AdminPage() {
  await requireRole("ADMIN");

  const [
    setting,
    examLocations,
    courseApprovalSetting,
    languages,
    applicationsRaw,
    recruitmentRoundsRaw,
    analyticsInitialData,
    courses,
    adminManagedTestsPage,
    withdrawals,
    refunds,
  ] = await Promise.all([
    getTeacherRecruitmentSetting(),
    getTeacherExamLocations(),
    getCourseAutoApprovalSetting(),
    getActiveLanguages(),
    prisma.teacherApplication.findMany({
      include: {
        user: { select: { id: true, username: true, email: true, phoneNumber: true, role: true } },
        language: true,
        certificates: true,
        recruitmentRound: { select: { id: true, name: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.recruitmentRound.findMany({
      include: {
        createdBy: { select: { id: true, username: true } },
        applications: {
          include: {
            user: { select: { username: true, email: true, phoneNumber: true, role: true } },
            language: { select: { id: true, name: true, code: true } },
            certificates: true,
            examResult: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
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
              where: { status: { in: ["APPROVED", "CONVERTED_TO_TEACHER"] } },
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
    getAdminManagedTestsPage(),
    prisma.teacherRevenueWithdrawal.findMany({
      include: {
        teacher: { select: { id: true, username: true, email: true } },
        complaint: {
          select: {
            id: true,
            reason: true,
            reportedAmount: true,
            message: true,
            evidenceImageUrl: true,
            evidenceImageName: true,
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
    prisma.courseRefundRequest.findMany({
      include: {
        student: { select: { id: true, username: true, email: true } },
        course: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);

  const applications = applicationsRaw.map((app) => ({
    ...app,
    submittedAt: app.submittedAt ? app.submittedAt.toISOString() : null,
    reviewedAt: app.reviewedAt ? app.reviewedAt.toISOString() : null,
    certificates: app.certificates.map((c) => ({ ...c, expiryDate: c.expiryDate ? c.expiryDate.toISOString() : null })),
  }));
  const recruitmentRounds = recruitmentRoundsRaw.map((round) => ({
    ...round,
    gradingTokenHash: undefined,
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
      updatedAt: application.updatedAt.toISOString(),
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
  }));

  return (
    <div>
      <Suspense fallback={<div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">Đang tải trang quản trị...</div>}>
        <AdminShell
          initialEnabled={Boolean(setting.enabled)}
          initialTeacherRecruitmentSetting={setting}
          initialTeacherExamLocations={examLocations}
          initialRecruitmentRounds={recruitmentRounds}
          initialCourseAutoApproval={Boolean(courseApprovalSetting.enabled)}
          initialLanguages={languages}
          initialApplications={applications}
          initialCourses={courses.map((course) => ({
            id: course.id,
            name: course.name,
            description: course.description,
            status: course.status,
            deleteRequestedFromStatus: course.deleteRequestedFromStatus,
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
          initialAdminManagedTests={adminManagedTestsPage.tests}
          initialAdminManagedTestTotal={adminManagedTestsPage.total}
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
          initialRefunds={refunds.map((item) => ({
            id: item.id,
            amount: item.amount,
            reason: item.reason,
            status: item.status as AdminCourseRefund["status"],
            adminNote: item.adminNote,
            processedAt: item.processedAt?.toISOString() ?? null,
            createdAt: item.createdAt.toISOString(),
            student: item.student,
            course: item.course,
          }))}
        />
      </Suspense>
    </div>
  );
}
