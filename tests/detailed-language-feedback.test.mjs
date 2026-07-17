import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("multilingual AI contract requires detailed feedback for every rubric criterion", async () => {
  const evaluator = await source("lib/test-ai-evaluation.ts");

  assert.match(evaluator, /Return criteriaFeedback for every exact key in certificateRubric\.criteria/);
  assert.match(evaluator, /shortComment/);
  assert.match(evaluator, /detailedFeedback/);
  assert.match(evaluator, /improvementSuggestions/);
  assert.match(evaluator, /examplesFromAnswer/);
  assert.match(evaluator, /correctedExamples/);
});

test("writing, speaking, and saved results use the detailed multilingual layout", async () => {
  const [writingRoute, speakingRoute, writingClient, speakingClient, savedResult] = await Promise.all([
    source("app/api/ai/essay-evaluation/route.ts"),
    source("app/api/ai/speaking-evaluation/route.ts"),
    source("app/student/writing-ai/WritingAiClient.tsx"),
    source("app/student/speaking-ai/SpeakingAiClient.tsx"),
    source("app/student/results/[resultId]/page.tsx"),
  ]);

  assert.match(writingRoute, /criteriaFeedback: evaluation\.criteriaFeedback/);
  assert.match(speakingRoute, /criteriaFeedback: evaluation\.criteriaFeedback/);
  assert.match(writingClient, /<LanguageEvaluationResult/);
  assert.match(speakingClient, /<LanguageEvaluationResult/);
  assert.match(savedResult, /<LanguageEvaluationResult/);
});
