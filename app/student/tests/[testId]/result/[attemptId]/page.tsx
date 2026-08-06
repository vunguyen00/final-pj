import { notFound } from "next/navigation";
import StudentTestResultClient from "./StudentTestResultClient";
import StudentTestPreviewResultClient from "./StudentTestPreviewResultClient";
import { requireRole } from "@/lib/auth";
import { canReviewCourse, getUserCourseReview } from "@/lib/course-reviews";
import { prisma } from "@/lib/prisma";
import { getStudentTestAttemptResult } from "@/lib/student-test-attempt-result";

const PREVIEW_ATTEMPT_PATTERN = /^preview-\d{10,}$/;

export default async function StudentTestResultPage({
  params,
}: {
  params: Promise<{ testId: string; attemptId: string }>;
}) {
  const [{ testId, attemptId }, user] = await Promise.all([
    params,
    requireRole("STUDENT", "TEACHER", "ADMIN"),
  ]);

  if (attemptId.startsWith("preview-")) {
    if (!PREVIEW_ATTEMPT_PATTERN.test(attemptId)) notFound();
    const test = await prisma.test.findUnique({
      where: { id: testId },
      select: { course: { select: { instructorId: true } } },
    });
    const canPreview =
      user.role === "ADMIN" ||
      (user.role === "TEACHER" && test?.course?.instructorId === user.id);
    if (!test || !canPreview) notFound();
    return (
      <StudentTestPreviewResultClient
        testId={testId}
        attemptId={attemptId}
      />
    );
  }

  let result;
  try {
    result = await getStudentTestAttemptResult(user, testId, attemptId);
  } catch (error) {
    if (error instanceof Error && error.message === "Forbidden") notFound();
    throw error;
  }
  if (!result) notFound();

  const canReview =
    user.role === "STUDENT" && result.isPassed && result.courseId
      ? await Promise.all([
          canReviewCourse(user.id, result.courseId),
          getUserCourseReview(user.id, result.courseId),
        ]).then(([allowed, existing]) => allowed && !existing)
      : false;

  return (
    <StudentTestResultClient
      result={result}
      testId={testId}
      canReview={canReview}
    />
  );
}
