import { prisma } from "@/lib/prisma";
import { getCourseReadiness } from "@/lib/course-readiness";

export const COURSE_AUTO_APPROVAL_SETTING_KEY = "course_auto_approval";

type CourseAutoApprovalSetting = {
  enabled: boolean;
};

export async function getCourseAutoApprovalSetting(): Promise<CourseAutoApprovalSetting> {
  const row = await prisma.systemSetting.findUnique({
    where: { key: COURSE_AUTO_APPROVAL_SETTING_KEY },
  });
  const value = row?.value as Partial<CourseAutoApprovalSetting> | null | undefined;

  return { enabled: Boolean(value?.enabled) };
}

export async function setCourseAutoApprovalSetting(enabled: boolean) {
  return prisma.systemSetting.upsert({
    where: { key: COURSE_AUTO_APPROVAL_SETTING_KEY },
    update: { value: { enabled } },
    create: { key: COURSE_AUTO_APPROVAL_SETTING_KEY, value: { enabled } },
  });
}

export type CourseAutoApprovalScanResult = {
  scanned: number;
  approved: number;
  rejected: number;
  skipped: number;
  failed: number;
  outcomes: Array<{
    courseId: string;
    status: "ACTIVE" | "REJECTED";
    reasons: string[];
  }>;
};

export async function scanPendingCoursesForAutoApproval(): Promise<CourseAutoApprovalScanResult> {
  const pendingCourses = await prisma.course.findMany({
    where: { status: "PENDING_APPROVAL" },
    select: {
      id: true,
      name: true,
      instructorId: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const result: CourseAutoApprovalScanResult = {
    scanned: pendingCourses.length,
    approved: 0,
    rejected: 0,
    skipped: 0,
    failed: 0,
    outcomes: [],
  };

  for (const course of pendingCourses) {
    try {
      const readiness = await getCourseReadiness(course.id);
      const nextStatus = readiness.ready ? "ACTIVE" : "REJECTED";
      const reasons = readiness.ready ? [] : readiness.errors;

      const processed = await prisma.$transaction(async (tx) => {
        const update = await tx.course.updateMany({
          where: { id: course.id, status: "PENDING_APPROVAL" },
          data: {
            status: nextStatus,
            deleteRequestedFromStatus: null,
          },
        });

        if (update.count === 0) return false;

        if (course.instructorId) {
          await tx.notification.create({
            data: {
              userId: course.instructorId,
              title: readiness.ready
                ? "Khóa học đã được tự động duyệt"
                : "Khóa học chưa đủ điều kiện duyệt",
              body: readiness.ready
                ? `Khóa học "${course.name}" đã được tự động duyệt và hiển thị công khai.`
                : `Khóa học "${course.name}" bị từ chối khi tự động kiểm tra. Lý do: ${reasons.join(" ")}`,
            },
          });
        }

        return true;
      });

      if (!processed) {
        result.skipped += 1;
        continue;
      }

      if (readiness.ready) result.approved += 1;
      else result.rejected += 1;
      result.outcomes.push({ courseId: course.id, status: nextStatus, reasons });
    } catch (error) {
      result.failed += 1;
      console.error(`Không thể tự động kiểm tra khóa học ${course.id}:`, error);
    }
  }

  return result;
}
