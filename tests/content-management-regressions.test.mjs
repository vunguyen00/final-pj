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
  assert.match(route, /data: \{ lessons: lessonCount \}/);
});

test("test AI grading has a bounded parallel request path", async () => {
  const [evaluation, service] = await Promise.all([
    source("lib/test-ai-evaluation.ts"),
    source("lib/ai/ollama-service.ts"),
  ]);

  assert.match(evaluation, /Promise\.all\(inputs\.map/);
  assert.match(evaluation, /Date\.now\(\) \+ 105_000/);
  assert.match(evaluation, /think: false/);
  assert.match(service, /Total budget for every retry/);
  assert.match(service, /Math\.min\(this\.config\.timeout, remainingTime\)/);
});
