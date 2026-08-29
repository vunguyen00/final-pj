import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("AI grading uses bounded output and retry budgets", async () => {
  const [ollama, courseTests, ielts, scoring, speaking] = await Promise.all([
    source("lib/ai/ollama-service.ts"),
    source("lib/test-ai-evaluation.ts"),
    source("lib/ielts-grading.ts"),
    source("lib/ai/scoring-service.ts"),
    source("lib/ai/speaking-service.ts"),
  ]);

  assert.match(ollama, /OLLAMA_NUM_PREDICT \?\? 3200/);
  assert.match(ollama, /OLLAMA_MAX_RETRIES", 2/);
  assert.match(courseTests, /TEST_AI_TOTAL_OUTPUT_BUDGET/);
  assert.match(courseTests, /maxRetries: 1/);
  assert.match(courseTests, /think: false/);
  assert.match(ielts, /for \(let attempt = 1; attempt <= 2;/);
  assert.match(ielts, /maxOutputTokens,\s+maxRetries: 1,\s+think: false/);
  assert.match(scoring, /maxOutputTokens: 2800,\s+maxRetries: 1,\s+think: false/);
  assert.match(speaking, /maxOutputTokens: 2800, maxRetries: 1, think: false/);
});
