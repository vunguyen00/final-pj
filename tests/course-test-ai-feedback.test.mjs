import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("course tests combine scoring and full AI feedback without charging points", async () => {
  const [payload, client, submitRoute] = await Promise.all([
    source("lib/student-test-data.ts"),
    source("app/student/tests/[testId]/StudentTakeTestClient.tsx"),
    source("app/api/student/tests/[testId]/submit/route.ts"),
  ]);

  assert.match(
    payload,
    /test\.kind !== "COURSE" && shouldChargeAiPoints\(user\.role\)/,
  );
  assert.match(client, /includesFreeCourseAiFeedback = test\?\.kind === "COURSE"/);
  assert.match(client, /hasAiQuestions && !includesFreeCourseAiFeedback/);
  assert.match(client, /includesFreeCourseAiFeedback \|\| includeAiFeedback/);
  assert.match(
    submitRoute,
    /includeAiFeedback = test\.kind === "COURSE" \|\| requestedAiFeedback/,
  );
  assert.match(
    submitRoute,
    /includeAiFeedback &&\s+test\.kind !== "COURSE" &&\s+feedbackCost > 0/,
  );
});
