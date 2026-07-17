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
