import { prisma } from "@/lib/prisma";

export type PublicTeacher = {
  id: string;
  name: string;
  email: string;
  avatar: string;
  title: string;
  summary: string;
  badges: string[];
  coursesCount: number;
  studentsCount: number;
};

function formatCount(value: number) {
  return value.toLocaleString("vi-VN");
}

function getInitials(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  return initials || "GV";
}

function uniqueNonEmpty(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((value) => value?.trim()).filter(Boolean) as string[]));
}

export async function getPublicTeachers(): Promise<PublicTeacher[]> {
  try {
    const teachers = await prisma.user.findMany({
      where: { role: "TEACHER" },
      select: {
        id: true,
        username: true,
        email: true,
        courses: {
          where: { status: "ACTIVE" },
          select: {
            category: true,
            language: { select: { name: true } },
            _count: { select: { enrollments: true } },
          },
        },
        teacherApplications: {
          where: { status: "APPROVED" },
          select: { language: { select: { name: true } } },
          orderBy: [{ reviewedAt: "desc" }, { createdAt: "desc" }],
          take: 1,
        },
      },
      orderBy: { username: "asc" },
    });

    return teachers
      .map((teacher) => {
        const coursesCount = teacher.courses.length;
        const studentsCount = teacher.courses.reduce((total, course) => total + course._count.enrollments, 0);
        const approvedLanguage = teacher.teacherApplications[0]?.language?.name;
        const courseLanguages = teacher.courses.map((course) => course.language?.name);
        const courseCategories = teacher.courses.map((course) => course.category);
        const badges = uniqueNonEmpty([approvedLanguage, ...courseLanguages, ...courseCategories]).slice(0, 3);
        const primaryLanguage = approvedLanguage ?? badges[0];

        return {
          id: teacher.id,
          name: teacher.username,
          email: teacher.email,
          avatar: getInitials(teacher.username),
          title: primaryLanguage ? `Giảng viên ${primaryLanguage}` : "Giảng viên FinnCenter",
          summary:
            coursesCount > 0
              ? `Đang phụ trách ${formatCount(coursesCount)} khóa học với ${formatCount(studentsCount)} học viên.`
              : "Hồ sơ giảng viên đã được cập nhật trong hệ thống.",
          badges,
          coursesCount,
          studentsCount,
        };
      })
      .sort((a, b) => {
        if (b.studentsCount !== a.studentsCount) return b.studentsCount - a.studentsCount;
        if (b.coursesCount !== a.coursesCount) return b.coursesCount - a.coursesCount;
        return a.name.localeCompare(b.name, "vi");
      });
  } catch {
    return [];
  }
}

export { formatCount };
