import type { AppRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type TeacherCourseViewer = {
  id: string;
  role: AppRole;
};

export async function getTeacherCourseData(
  user: TeacherCourseViewer,
  courseId: string,
) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      instructor: {
        select: { id: true, username: true, email: true },
      },
      language: {
        select: { id: true, name: true, code: true },
      },
      modules: {
        include: {
          lessons: { select: { id: true, title: true } },
        },
        orderBy: { order: "asc" },
      },
      tests: {
        select: {
          id: true,
          name: true,
          maxScore: true,
          passingScore: true,
          timeLimit: true,
          module: { select: { id: true, name: true } },
          lesson: { select: { id: true, title: true } },
          _count: { select: { questions: true, attempts: true } },
        },
      },
      _count: {
        select: {
          enrollments: true,
          modules: true,
          tests: true,
          feedbacks: true,
        },
      },
    },
  });

  if (!course) return { kind: "not_found" as const };
  if (user.role !== "ADMIN" && course.instructorId !== user.id) {
    return { kind: "forbidden" as const };
  }

  const fixedTeacherLanguage =
    user.role === "TEACHER" && !course.language
      ? await prisma.teacherApplication.findFirst({
          where: { userId: user.id, status: "APPROVED" },
          select: {
            language: { select: { id: true, name: true, code: true } },
          },
          orderBy: { reviewedAt: "desc" },
        })
      : null;
  const languages =
    user.role === "ADMIN"
      ? await prisma.learningLanguage.findMany({
          where: { isActive: true },
          select: { id: true, name: true, code: true },
          orderBy: { name: "asc" },
        })
      : course.language || fixedTeacherLanguage?.language
        ? [course.language ?? fixedTeacherLanguage!.language]
        : [];

  return {
    kind: "success" as const,
    course: {
      ...course,
      price: Number(course.price),
      createdAt: course.createdAt.toISOString(),
    },
    languages,
    viewerRole: user.role,
  };
}
