import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  getGeneralWritingEvidenceCap,
} from "../lib/ai-score-calibration.ts";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("short classroom writing prompts are not capped at a failing score", () => {
  const cap = getGeneralWritingEvidenceCap(
    "このコースが終わった後も、日本語の勉強を続けたいと思います。毎日30分ぐらい日本語を勉強して、ニュースや動画を見たり、本を読んだりするつもりです。また、日本人の友達と話して、会話の練習もしたいです。そして、JLPTに合格できるように頑張ります。",
    "Write a short paragraph about your plan to keep improving Japanese after this course.",
  );

  assert.ok(cap >= 8.5);
});

test("non-IELTS classroom scoring uses rubric-aligned calibration", async () => {
  const evaluator = await source("lib/test-ai-evaluation.ts");

  assert.match(evaluator, /scoringProfile: rubric\.system === "IELTS" \? "strict" : "classroom"/);
  assert.match(evaluator, /hasCertificateScore && input\.relevance >= 80/);
  assert.match(evaluator, /do not default to 5 when the rubric criteria are high/);
});

test("AI question points are converted from rubric total percentage", async () => {
  const [studentSubmitRoute, teacherSubmitRoute, evaluator] = await Promise.all([
    source("app/api/student/tests/[testId]/submit/route.ts"),
    source("app/api/teacher-applications/[applicationId]/submit-test/route.ts"),
    source("lib/test-ai-evaluation.ts"),
  ]);

  assert.match(evaluator, /export function getTestAiScoreRatio/);
  assert.match(evaluator, /totalScore\)\) \/ 100/);
  assert.match(studentSubmitRoute, /getTestAiScoreRatio\(aiResult\)/);
  assert.doesNotMatch(studentSubmitRoute, /normalizedScore \/ 10/);
  assert.match(teacherSubmitRoute, /getTestAiScoreRatio\(aiResult\)/);
  assert.doesNotMatch(teacherSubmitRoute, /normalizedScore \/ 10/);
});
