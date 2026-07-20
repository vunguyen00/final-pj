import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("payment callbacks have a claim step and unique order item key", async () => {
  const [payment, schema] = await Promise.all([
    source("lib/course-payment.ts"),
    source("prisma/schema.prisma"),
  ]);
  assert.match(payment, /updateMany[\s\S]*status: COURSE_PAYMENT_STATUS\.PENDING/);
  assert.match(schema, /@@unique\(\[orderId, courseId\]\)/);
});

test("refund is external, never credited internally, and removes learning state", async () => {
  const [wallet, refund] = await Promise.all([
    source("app/api/wallet/route.ts"),
    source("app/api/admin/course-refunds/[refundId]/route.ts"),
  ]);
  assert.match(wallet, /status:\s*410/);
  assert.match(refund, /refundMethod: "EXTERNAL_ACCOUNT"/);
  assert.doesNotMatch(refund, /tx\.wallet\.(upsert|update)/);
  assert.match(refund, /testAttempt\.deleteMany/);
  assert.match(refund, /videoWatchProgress\.deleteMany/);
});

test("pending refunds suspend course access and rejection restores it", async () => {
  const [schema, createRefund, reviewRefund, learningPage] = await Promise.all([
    source("prisma/schema.prisma"),
    source("app/api/course-refunds/route.ts"),
    source("app/api/admin/course-refunds/[refundId]/route.ts"),
    source("app/student/hoc-bai/page.tsx"),
  ]);
  assert.match(schema, /enum EnrollmentAccessStatus[\s\S]*ACTIVE[\s\S]*REFUND_PENDING/);
  assert.match(createRefund, /accessStatus: "REFUND_PENDING"/);
  assert.match(reviewRefund, /accessStatus: "ACTIVE"/);
  assert.match(learningPage, /enrollment\?\.accessStatus === "ACTIVE"/);
});

test("all newly created tests and existing-test migration are unlimited", async () => {
  const [route, migration] = await Promise.all([
    source("app/api/teacher/tests/route.ts"),
    source("prisma/migrations/20260716213000_external_refunds_unlimited_tests/migration.sql"),
  ]);
  assert.match(route, /maxAttempts: UNLIMITED_TEST_ATTEMPTS/);
  assert.match(migration, /UPDATE "Test" SET "maxAttempts" = 2147483647/);
});

test("security-sensitive account changes revoke old auth tokens", async () => {
  const [auth, password, schema] = await Promise.all([
    source("lib/auth.ts"),
    source("app/api/profile/password/route.ts"),
    source("prisma/schema.prisma"),
  ]);
  assert.match(schema, /authVersion\s+Int\s+@default\(0\)/);
  assert.match(auth, /user\.authVersion !== payload\.ver/);
  assert.match(password, /authVersion: \{ increment: 1 \}/);
});

test("video completion and bank withdrawals are server verified", async () => {
  const [complete, bank, withdrawal] = await Promise.all([
    source("app/api/learning/lessons/[lessonId]/complete/route.ts"),
    source("app/api/teacher/bank-account/verify-otp/route.ts"),
    source("app/api/teacher/revenue-withdrawals/route.ts"),
  ]);
  assert.doesNotMatch(complete, /body\?\.watchedFull/);
  assert.match(complete, /videoWatchProgress/);
  assert.match(bank, /verificationStatus: "VERIFIED"/);
  assert.match(withdrawal, /verificationStatus !== "VERIFIED"/);
});

test("course publishing and private pages have server-side guards", async () => {
  const [courseRoute, studentLayout, teacherLayout] = await Promise.all([
    source("app/api/teacher/courses/[courseId]/route.ts"),
    source("app/student/layout.tsx"),
    source("app/teacher/courses/layout.tsx"),
  ]);
  assert.match(courseRoute, /getCourseReadiness/);
  assert.match(studentLayout, /requireUser/);
  assert.match(teacherLayout, /requireRole\("TEACHER", "ADMIN"\)/);
});

test("teacher entrance test counts each leave incident once and enforces timed question reveal", async () => {
  const [client, heartbeat, antiCheat, submit, reveal, autosave, schema, questionEditor, createQuestion] = await Promise.all([
    source("app/teacher-registration/TeacherRegistrationClient.tsx"),
    source("app/api/teacher-applications/[applicationId]/heartbeat/route.ts"),
    source("lib/teacher-anti-cheat.ts"),
    source("app/api/teacher-applications/[applicationId]/submit-test/route.ts"),
    source("app/api/teacher-applications/[applicationId]/questions/[questionId]/reveal/route.ts"),
    source("app/api/teacher-applications/[applicationId]/autosave/route.ts"),
    source("prisma/schema.prisma"),
    source("app/teacher/tests/[testId]/questions/components/QuestionModal.tsx"),
    source("app/api/teacher/tests/[testId]/questions/route.ts"),
  ]);

  assert.match(client, /markAway[\s\S]*record\([\s\S]*"TAB_HIDDEN"[\s\S]*"WINDOW_BLUR"/);
  assert.match(client, /setInterval\([\s\S]*sendProctorHeartbeat/);
  assert.match(client, /keyboardLock: "browser"/);
  assert.match(client, /event\.key === "Escape"/);
  assert.match(client, /proctoringActiveRef\.current = false;[\s\S]*setAntiCheatAccepted\(false\);[\s\S]*document\.exitFullscreen/);
  assert.match(client, /if \(!proctoringActiveRef\.current\) return;[\s\S]*const key = event\.key\.toLowerCase\(\)/);
  assert.match(heartbeat, /PROCTOR_HEARTBEAT_GAP/);
  assert.match(heartbeat, /MULTIPLE_EXAM_SESSIONS/);
  assert.match(heartbeat, /MULTIPLE_DISPLAYS/);
  assert.match(antiCheat, /case "TAB_HIDDEN":[\s\S]*case "WINDOW_BLUR":[\s\S]*return "VIOLATION"/);
  assert.match(client, /awayIncidentIdRef\.current = crypto\.randomUUID\(\)/);
  assert.match(antiCheat, /incidentId: input\.incidentId/);
  assert.doesNotMatch(antiCheat, /eventCooldownSeconds/);
  assert.match(submit, /proctorHeartbeatAt[\s\S]*heartbeatGapSeconds/);
  assert.match(reveal, /questionRevealState/);
  assert.match(autosave, /teacherQuestionAnswerStartsAt[\s\S]*teacherQuestionDeadline/);
  assert.match(schema, /preparationTimeSeconds\s+Int\?/);
  assert.match(schema, /answerTimeSeconds\s+Int\?/);
  assert.match(questionEditor, /answerMinutes/);
  assert.match(questionEditor, /Number\(event\.target\.value\) \* 60/);
  assert.match(createQuestion, /type === "SPEAKING" \? 120 : 3600/);
  assert.match(createQuestion, /type === "SPEAKING" \? 300 : 10800/);
});
