import { prisma } from "@/lib/prisma";

const REVIEW_PREFIX = "COURSE_REVIEW:";

export type CourseReview = {
  id: string;
  userId: string;
  username: string;
  courseId: string;
  rating: number;
  comment: string;
  createdAt: Date;
};

function reviewContent(rating: number, comment: string) {
  return `${REVIEW_PREFIX}${JSON.stringify({ rating, comment })}`;
}

function parseReviewContent(content: string) {
  if (!content.startsWith(REVIEW_PREFIX)) return null;

  try {
    const parsed = JSON.parse(content.slice(REVIEW_PREFIX.length)) as {
      rating?: unknown;
      comment?: unknown;
    };
    const rating = Number(parsed.rating);
    const comment = String(parsed.comment || "").trim();
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) return null;
    return { rating, comment };
  } catch {
    return null;
  }
}

type ReviewRow = {
  id: string;
  userId: string;
  courseId: string;
  content: string;
  createdAt: Date;
  user: { username: string };
};

function toCourseReview(row: ReviewRow): CourseReview | null {
  const parsed = parseReviewContent(row.content);
  if (!parsed) return null;

  return {
    id: row.id,
    userId: row.userId,
    username: row.user.username,
    courseId: row.courseId,
    rating: parsed.rating,
    comment: parsed.comment,
    createdAt: row.createdAt,
  };
}

export async function getCourseReviews(courseId: string) {
  const rows = await prisma.feedback.findMany({
    where: { courseId, content: { startsWith: REVIEW_PREFIX } },
    include: { user: { select: { username: true } } },
    orderBy: { createdAt: "desc" },
  });

  const latestByUser = new Map<string, CourseReview>();
  for (const row of rows) {
    const review = toCourseReview(row);
    if (review && !latestByUser.has(review.userId)) {
      latestByUser.set(review.userId, review);
    }
  }

  return Array.from(latestByUser.values());
}

export async function getUserCourseReview(userId: string, courseId: string) {
  const row = await prisma.feedback.findFirst({
    where: { userId, courseId, content: { startsWith: REVIEW_PREFIX } },
    include: { user: { select: { username: true } } },
    orderBy: { createdAt: "desc" },
  });

  return row ? toCourseReview(row) : null;
}

export async function canReviewCourse(userId: string, courseId: string) {
  const passedAttempt = await prisma.testAttempt.findFirst({
    where: {
      userId,
      isPassed: true,
      test: { courseId },
    },
    select: { id: true },
  });

  return Boolean(passedAttempt);
}

export async function upsertCourseReview({
  userId,
  courseId,
  rating,
  comment,
}: {
  userId: string;
  courseId: string;
  rating: number;
  comment: string;
}) {
  const normalizedRating = Math.round(Number(rating) * 2) / 2;
  const normalizedComment = String(comment || "").trim();

  if (!Number.isFinite(normalizedRating) || normalizedRating < 1 || normalizedRating > 5) {
    throw new Error("INVALID_RATING");
  }
  if (normalizedComment.length > 1000) {
    throw new Error("INVALID_COMMENT");
  }

  const existing = await prisma.feedback.findFirst({
    where: { userId, courseId, content: { startsWith: REVIEW_PREFIX } },
    select: { id: true },
  });

  if (existing) {
    return prisma.feedback.update({
      where: { id: existing.id },
      data: { content: reviewContent(normalizedRating, normalizedComment) },
    });
  }

  return prisma.feedback.create({
    data: {
      userId,
      courseId,
      content: reviewContent(normalizedRating, normalizedComment),
    },
  });
}
