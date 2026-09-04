import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  getRemainingQuestionScore,
  isTestReady,
  normalizeTestScore,
} from "../lib/test-rules.ts";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("question totals tolerate normal floating-point accumulation", () => {
  assert.equal(normalizeTestScore(100.00000000000001), 100);
  assert.equal(getRemainingQuestionScore(90.00000000000001), 10);
  assert.equal(isTestReady(100.00000000000001), true);
});

test("module deletion removes child lessons before the parent module", async () => {
  const route = await source(
    "app/api/teacher/courses/[courseId]/modules/[moduleId]/route.ts",
  );
  const lessonDelete = route.indexOf("tx.lesson.deleteMany({ where: { moduleId } })");
  const moduleDelete = route.indexOf("tx.module.delete({ where: { id: moduleId } })");

  assert.ok(lessonDelete >= 0);
  assert.ok(moduleDelete > lessonDelete);
  assert.match(route, /tx\.test\.updateMany/);
  assert.match(route, /tx\.courseReport\.updateMany/);
  assert.match(route, /tx\.videoWatchProgress\.deleteMany/);
  assert.match(route, /data: \{ lessons: lessonCount \}/);
});

test("course deletion clears dependent learning records and updates the list", async () => {
  const [route, page] = await Promise.all([
    source("app/api/teacher/courses/[courseId]/route.ts"),
    source("app/teacher/courses/page.tsx"),
  ]);

  assert.match(route, /tx\.courseReport\.deleteMany\(\{ where: \{ courseId \} \}\)/);
  assert.match(route, /tx\.videoWatchProgress\.deleteMany/);
  assert.match(page, /data\?\.deleted/);
  assert.match(page, /status: "PENDING_DELETE"/);
  assert.match(page, /status: "LOCKED"/);
});

test("lesson and question management expose edit and delete paths", async () => {
  const [lessonController, lessonRoute, questionPage, questionRoute, adminTests] =
    await Promise.all([
      source("app/teacher/courses/[courseId]/modules/[moduleId]/useTeacherModulePage.ts"),
      source("app/api/teacher/courses/[courseId]/modules/[moduleId]/lessons/[lessonId]/route.ts"),
      source("app/teacher/tests/[testId]/questions/page.tsx"),
      source("app/api/teacher/tests/[testId]/questions/[questionId]/route.ts"),
      source("app/admin/AdminTestsManagement.tsx"),
    ]);

  assert.match(lessonController, /method: "PUT"/);
  assert.match(lessonController, /method: "DELETE"/);
  assert.match(lessonController, /lessons: current\.lessons\.map/);
  assert.match(lessonController, /current\.lessons\.filter/);
  assert.match(lessonRoute, /export async function PUT/);
  assert.match(lessonRoute, /export async function DELETE/);

  assert.match(questionPage, /editingQuestion \? "PUT" : "POST"/);
  assert.match(questionPage, /method: "DELETE"/);
  assert.match(questionPage, /current\.map\(\(question\) => question\.id === savedQuestion\.id/);
  assert.match(questionPage, /current\.filter\(\(question\) => question\.id !== questionId\)/);
  assert.match(questionRoute, /export async function PUT/);
  assert.match(questionRoute, /export async function DELETE/);
  assert.match(questionRoute, /prisma\.\$transaction\(async \(tx\)/);

  assert.match(adminTests, /href=\{`\/teacher\/tests\/\$\{test\.id\}\/questions`\}/);
  assert.match(adminTests, /href=\{`\/teacher\/tests\/\$\{test\.id\}`\}/);
  assert.match(adminTests, /void deleteTest\(test\.id\)/);
});

test("test AI grading has a bounded parallel request path", async () => {
  const [evaluation, service] = await Promise.all([
    source("lib/test-ai-evaluation.ts"),
    source("lib/ai/gemini-service.ts"),
  ]);

  assert.match(evaluation, /Promise\.all\(inputs\.map/);
  assert.match(evaluation, /Date\.now\(\) \+ 105_000/);
  assert.match(evaluation, /think: false/);
  assert.match(service, /Total budget for every retry/);
  assert.match(service, /Math\.min\(this\.config\.timeout, remainingTime\)/);
});
