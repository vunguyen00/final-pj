import { prisma } from "@/lib/prisma";
import { getCourseReviews } from "@/lib/course-reviews";

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

export type PublicTeacherCourse = {
  id: string;
  name: string;
  description: string;
  thumbnail: string | null;
  category: string | null;
  language: string | null;
  price: number;
  studentsCount: number;
  reviewsCount: number;
  averageRating: number;
};

export type PublicTeacherDetail = PublicTeacher & {
  topCourses: PublicTeacherCourse[];
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
        const badges = uniqueNonEmpty([approvedLanguage, ...courseLanguages]).slice(0, 3);
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

export async function getPublicTeacherDetail(id: string): Promise<PublicTeacherDetail | null> {
  try {
    const teacher = await prisma.user.findFirst({
      where: { id, role: "TEACHER" },
      select: {
        id: true,
        username: true,
        email: true,
        courses: {
          where: { status: "ACTIVE" },
          select: {
            id: true,
            name: true,
            description: true,
            thumbnail: true,
            category: true,
            price: true,
            language: { select: { name: true } },
            _count: { select: { enrollments: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        teacherApplications: {
          where: { status: "APPROVED" },
          select: { language: { select: { name: true } } },
          orderBy: [{ reviewedAt: "desc" }, { createdAt: "desc" }],
          take: 1,
        },
      },
    });

    if (!teacher) return null;

    const approvedLanguage = teacher.teacherApplications[0]?.language?.name;
    const badges = uniqueNonEmpty([approvedLanguage, ...teacher.courses.map((course) => course.language?.name)]).slice(0, 3);
    const primaryLanguage = approvedLanguage ?? badges[0];
    const courses = await Promise.all(
      teacher.courses.map(async (course) => {
        const reviews = await getCourseReviews(course.id);
        const averageRating = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0;

        return {
          id: course.id,
          name: course.name,
          description: course.description,
          thumbnail: course.thumbnail,
          category: course.category,
          language: course.language?.name ?? primaryLanguage ?? null,
          price: course.price,
          studentsCount: course._count.enrollments,
          reviewsCount: reviews.length,
          averageRating,
        };
      }),
    );

    courses.sort((a, b) => {
      if (b.averageRating !== a.averageRating) return b.averageRating - a.averageRating;
      if (b.reviewsCount !== a.reviewsCount) return b.reviewsCount - a.reviewsCount;
      if (b.studentsCount !== a.studentsCount) return b.studentsCount - a.studentsCount;
      return a.name.localeCompare(b.name, "vi");
    });

    const coursesCount = teacher.courses.length;
    const studentsCount = teacher.courses.reduce((total, course) => total + course._count.enrollments, 0);

    return {
      id: teacher.id,
      name: teacher.username,
      email: teacher.email,
      avatar: getInitials(teacher.username),
      title: primaryLanguage ? `Giảng viên ${primaryLanguage}` : "Giảng viên FinnCenter",
      summary:
        coursesCount > 0
          ? `Đang phụ trách ${formatCount(coursesCount)} khóa học với ${formatCount(studentsCount)} lượt đăng ký.`
          : "Hồ sơ giảng viên đã được duyệt trong hệ thống.",
      badges,
      coursesCount,
      studentsCount,
      topCourses: courses.slice(0, 3),
    };
  } catch {
    return null;
  }
}

export { formatCount };
