import { prisma } from "@/lib/prisma";

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
