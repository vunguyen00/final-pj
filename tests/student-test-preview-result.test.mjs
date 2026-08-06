import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("owner Speaking AI previews render from session storage instead of querying a fake attempt", async () => {
  const [submitRoute, takeTest, resultPage, previewResult] = await Promise.all([
    source("app/api/student/tests/[testId]/submit/route.ts"),
    source("app/student/tests/[testId]/StudentTakeTestClient.tsx"),
    source("app/student/tests/[testId]/result/[attemptId]/page.tsx"),
    source("app/student/tests/[testId]/result/[attemptId]/StudentTestPreviewResultClient.tsx"),
  ]);

  assert.match(submitRoute, /previewAttemptId = `preview-\$\{Date\.now\(\)\}`/);
  assert.match(submitRoute, /previewMode: true/);
  assert.match(submitRoute, /courseComplete: false/);
  assert.match(takeTest, /sessionStorage\.setItem\([\s\S]*`test-result-\$\{data\.attemptId\}`/);
  assert.match(resultPage, /attemptId\.startsWith\("preview-"\)/);
  assert.match(resultPage, /test\?\.course\?\.instructorId === user\.id/);
  assert.match(resultPage, /<StudentTestPreviewResultClient/);
  assert.match(previewResult, /sessionStorage\.getItem\(`test-result-\$\{attemptId\}`\)/);
  assert.match(previewResult, /parsed\.previewMode !== true/);
  assert.match(previewResult, /<StudentTestResultClient/);
});
