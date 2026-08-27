import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("admins open courses directly without creating an enrollment or payment", async () => {
  const [coursePage, enrollCard, courseList, courseCard, managementHeader, accessRoute, enrollRoute] =
    await Promise.all([
      source("app/courses/[id]/page.tsx"),
      source("app/courses/[id]/components/EnrollCourseCard.tsx"),
      source("app/courses/page.tsx"),
      source("components/base/course-card.tsx"),
      source("app/teacher/courses/[courseId]/_components/CourseHeader.tsx"),
      source("app/api/courses/[id]/access/route.ts"),
      source("app/api/courses/[id]/enroll/route.ts"),
    ]);

  assert.match(coursePage, /user\?\.role === "ADMIN"[\s\S]*directAccessRole/);
  assert.match(enrollCard, /directAccessRole === "ADMIN" \? labels\.adminCanLearn/);
  assert.match(courseList, /canLearnDirectly=\{user\?\.role === "ADMIN"\}/);
  assert.match(courseCard, /canLearnDirectly \|\| \(isEnrolled && !isAccessSuspended\)/);
  assert.match(managementHeader, /href=\{`\/student\/hoc-bai\?courseId=\$\{course\.id\}`\}/);
  assert.match(accessRoute, /user\.role === "ADMIN"[\s\S]*reason: "ADMIN"/);

  const adminBypassIndex = enrollRoute.indexOf('if (user.role === "ADMIN")');
  const enrollmentCreateIndex = enrollRoute.indexOf("prisma.enrollment.create");
  assert.ok(adminBypassIndex >= 0);
  assert.ok(enrollmentCreateIndex >= 0);
  assert.ok(adminBypassIndex < enrollmentCreateIndex);
  assert.match(enrollRoute, /directAccess: true/);
});

test("admins bypass enrollment and progression gates throughout course inspection", async () => {
  const [learningPage, lessonStart, lessonHeartbeat, lessonComplete, testLoad, testSubmit, testList] =
    await Promise.all([
      source("app/student/hoc-bai/page.tsx"),
      source("app/api/learning/lessons/[lessonId]/start/route.ts"),
      source("app/api/learning/lessons/[lessonId]/heartbeat/route.ts"),
      source("app/api/learning/lessons/[lessonId]/complete/route.ts"),
      source("lib/student-test-data.ts"),
      source("app/api/student/tests/[testId]/submit/route.ts"),
      source("lib/student-tests-data.ts"),
    ]);

  assert.match(learningPage, /const canAccess = isAdmin \|\| isInstructor \|\| enrollment\?\.accessStatus === "ACTIVE"/);
  assert.match(learningPage, /bypassGates=\{isAdmin \|\| isInstructor\}/);
  assert.match(lessonStart, /const canAccess = isAdmin \|\| isInstructor \|\| enrollment\?\.accessStatus === "ACTIVE"/);
  assert.match(lessonHeartbeat, /user\.role !== "ADMIN"[\s\S]*enrollment\?\.accessStatus !== "ACTIVE"/);
  assert.match(lessonComplete, /const canAccess = isAdmin \|\| isInstructor \|\| enrollment\?\.accessStatus === "ACTIVE"/);
  assert.match(testLoad, /user\.role === "ADMIN" \|\|[\s\S]*user\.role === "TEACHER"/);
  assert.match(testSubmit, /user\.role === "ADMIN" \|\|[\s\S]*user\.role === "TEACHER"/);
  assert.match(testList, /user\.role === "ADMIN"[\s\S]*where: courseId \? \{ id: courseId \} : undefined/);
});
