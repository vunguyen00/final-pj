import { prisma } from "@/lib/prisma";

const PROGRESS_PREFIX = "PROGRESS:";
const LESSON_START_PREFIX = "LESSON_START:";
const COURSE_COMPLETED_PREFIX = "COURSE_COMPLETED:";
const CERT_SENT_PREFIX = "CERT_SENT:";

export function progressContent(lessonId: string) {
  return `${PROGRESS_PREFIX}${lessonId}`;
}

export function lessonStartContent(lessonId: string) {
  return `${LESSON_START_PREFIX}${lessonId}`;
}

export function courseCompletedContent(courseId: string) {
  return `${COURSE_COMPLETED_PREFIX}${courseId}`;
}

export function certSentContent(courseId: string) {
  return `${CERT_SENT_PREFIX}${courseId}`;
}

export async function getCompletedLessonIds(userId: string, courseId?: string) {
  const rows = await prisma.feedback.findMany({
    where: {
      userId,
      ...(courseId ? { courseId } : {}),
      content: { startsWith: PROGRESS_PREFIX },
    },
    select: { content: true },
  });

  return rows.map((row) => row.content.replace(PROGRESS_PREFIX, ""));
}

export async function getCourseProgressPercent(userId: string, courseId: string) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      modules: {
        include: { lessons: { select: { id: true } } },
      },
    },
  });

  if (!course) {
    return 0;
  }

  const lessons = course.modules.flatMap((module) => module.lessons);
  if (lessons.length === 0) {
    return 100;
  }

  const completedIds = await getCompletedLessonIds(userId, courseId);
  const completedSet = new Set(completedIds);
  const done = lessons.filter((lesson) => completedSet.has(lesson.id)).length;

  return Math.round((done / lessons.length) * 100);
}

export async function getLessonStart(userId: string, courseId: string, lessonId: string) {
  return prisma.feedback.findFirst({
    where: {
      userId,
      courseId,
      content: lessonStartContent(lessonId),
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function ensureLessonStart(userId: string, courseId: string, lessonId: string) {
  const existing = await getLessonStart(userId, courseId, lessonId);
  if (existing) {
    return existing;
  }

  return prisma.feedback.create({
    data: {
      userId,
      courseId,
      content: lessonStartContent(lessonId),
    },
  });
}

export async function markLessonCompleted(userId: string, courseId: string, lessonId: string) {
  const content = progressContent(lessonId);
  const existing = await prisma.feedback.findFirst({
    where: {
      userId,
      courseId,
      content,
    },
  });

  if (existing) {
    return existing;
  }

  return prisma.feedback.create({
    data: {
      userId,
      courseId,
      content,
    },
  });
}

export async function markCourseCompleted(userId: string, courseId: string) {
  const content = courseCompletedContent(courseId);
  const existing = await prisma.feedback.findFirst({ where: { userId, courseId, content } });
  if (existing) {
    return existing;
  }

  return prisma.feedback.create({
    data: {
      userId,
      courseId,
      content,
    },
  });
}

export async function isCourseMarkedCompleted(
  userId: string,
  courseId: string,
) {
  const existing = await prisma.feedback.findFirst({
    where: {
      userId,
      courseId,
      content: courseCompletedContent(courseId),
    },
    select: { id: true },
  });

  return Boolean(existing);
}

export async function hasCertificateSent(userId: string, courseId: string) {
  const existing = await prisma.feedback.findFirst({
    where: {
      userId,
      courseId,
      content: certSentContent(courseId),
    },
  });

  return Boolean(existing);
}

export async function markCertificateSent(userId: string, courseId: string) {
  const content = certSentContent(courseId);
  const existing = await prisma.feedback.findFirst({ where: { userId, courseId, content } });
  if (existing) {
    return existing;
  }

  return prisma.feedback.create({
    data: {
      userId,
      courseId,
      content,
    },
  });
}
