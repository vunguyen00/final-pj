import { prisma } from "@/lib/prisma";

const COURSE_POINT_PREFIX = "AI_POINTS:COURSE_COMPLETED:";
const SPENT_POINT_PREFIX = "AI_POINTS:SPENT:";
export const COURSE_COMPLETION_POINTS = 100;

function earnedContent(courseId: string) {
  return `${COURSE_POINT_PREFIX}${courseId}`;
}

function spentContent(points: number, feature: string) {
  const normalizedFeature = feature.trim().toUpperCase().replace(/[^A-Z0-9_\-]/g, "_");
  return `${SPENT_POINT_PREFIX}${points}:${normalizedFeature}:${Date.now()}`;
}

export async function grantCourseCompletionPoints(userId: string, courseId: string) {
  const content = earnedContent(courseId);
  const existing = await prisma.feedback.findFirst({
    where: {
      userId,
      courseId,
      content,
    },
  });

  if (existing) {
    return { awarded: false, points: 0 };
  }

  await prisma.feedback.create({
    data: {
      userId,
      courseId,
      content,
    },
  });

  return { awarded: true, points: COURSE_COMPLETION_POINTS };
}

export async function getAiPointsSummary(userId: string) {
  const rows = await prisma.feedback.findMany({
    where: {
      userId,
      OR: [{ content: { startsWith: COURSE_POINT_PREFIX } }, { content: { startsWith: SPENT_POINT_PREFIX } }],
    },
    select: { content: true },
  });

  let earned = 0;
  let spent = 0;

  for (const row of rows) {
    if (row.content.startsWith(COURSE_POINT_PREFIX)) {
      earned += COURSE_COMPLETION_POINTS;
      continue;
    }

    if (row.content.startsWith(SPENT_POINT_PREFIX)) {
      const payload = row.content.replace(SPENT_POINT_PREFIX, "");
      const [rawPoints] = payload.split(":");
      const value = Number(rawPoints);
      if (Number.isFinite(value) && value > 0) {
        spent += value;
      }
    }
  }

  return {
    earned,
    spent,
    available: Math.max(0, earned - spent),
  };
}

export async function spendAiPoints(
  userId: string,
  courseId: string,
  points: number,
  feature: string,
) {
  if (!Number.isFinite(points) || points <= 0) {
    throw new Error("INVALID_POINTS");
  }

  const summary = await getAiPointsSummary(userId);
  if (summary.available < points) {
    throw new Error("INSUFFICIENT_POINTS");
  }

  await prisma.feedback.create({
    data: {
      userId,
      courseId,
      content: spentContent(points, feature),
    },
  });

  return {
    spent: points,
    available: summary.available - points,
  };
}
