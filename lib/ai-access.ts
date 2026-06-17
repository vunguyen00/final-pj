import { prisma } from "@/lib/prisma";

export function shouldChargeAiPoints(role: string) {
  return role === "STUDENT" || role === "TEACHER";
}

export async function canUseAiForCourse(user: { id: string; role: string }, courseId: string) {
  if (user.role === "ADMIN") return true;

  if (user.role === "TEACHER") {
    const ownedCourse = await prisma.course.findFirst({
      where: { id: courseId, instructorId: user.id },
      select: { id: true },
    });
    if (ownedCourse) return true;
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: user.id, courseId } },
    select: { id: true },
  });

  return Boolean(enrollment);
}
