export const TEACHER_REVENUE_PERCENT = 70;
export const ADMIN_REVENUE_PERCENT = 30;
export const TEACHER_REVENUE_SPLIT = "TEACHER_70_ADMIN_30";
export const ADMIN_ONLY_REVENUE_SPLIT = "ADMIN_ONLY";

export function calculateCourseRevenueSplit(price: number, instructorRole?: string | null) {
  const gross = Math.max(0, Math.round(price));
  const isTeacherCourse = instructorRole === "TEACHER";

  if (!isTeacherCourse) {
    return {
      gross,
      adminRevenue: gross,
      teacherRevenue: 0,
      revenueSplit: ADMIN_ONLY_REVENUE_SPLIT,
    };
  }

  const teacherRevenue = Math.round((gross * TEACHER_REVENUE_PERCENT) / 100);
  return {
    gross,
    adminRevenue: gross - teacherRevenue,
    teacherRevenue,
    revenueSplit: TEACHER_REVENUE_SPLIT,
  };
}
