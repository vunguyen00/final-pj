import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");

test("students and teachers can review completed courses, but instructors cannot review their own course", async () => {
  const [reviewService, reviewRoute, coursePage, resultPage] = await Promise.all([
    source("lib/course-reviews.ts"),
    source("app/api/courses/[id]/reviews/route.ts"),
    source("app/courses/[id]/page.tsx"),
    source("app/student/tests/[testId]/result/[attemptId]/page.tsx"),
  ]);

  assert.match(reviewService, /role === "STUDENT" \|\| role === "TEACHER"/);
  assert.match(reviewService, /course\.instructorId !== userId/);
  assert.match(reviewService, /gateState\?\.courseComplete/);
  assert.match(reviewRoute, /!isCourseReviewRole\(user\.role\)/);
  assert.match(coursePage, /user && isCourseReviewRole\(user\.role\)/);
  assert.match(resultPage, /isCourseReviewRole\(user\.role\) && result\.isPassed/);
});
