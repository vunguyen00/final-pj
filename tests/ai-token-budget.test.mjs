import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("AI grading uses bounded output and retry budgets", async () => {
  const [gemini, courseTests, ielts, scoring, speaking, writingPrompt] = await Promise.all([
    source("lib/ai/gemini-service.ts"),
    source("lib/test-ai-evaluation.ts"),
    source("lib/ielts-grading.ts"),
    source("lib/ai/scoring-service.ts"),
    source("lib/ai/speaking-service.ts"),
    source("app/api/ai/writing-prompt/route.ts"),
  ]);

  assert.match(gemini, /GEMINI_MAX_OUTPUT_TOKENS \?\? 3200/);
  assert.match(gemini, /GEMINI_MAX_RETRIES", 2/);
  assert.match(gemini, /"x-goog-api-key": this\.config\.apiKey/);
  assert.match(gemini, /systemInstruction/);
  assert.match(gemini, /responseMimeType: "application\/json"/);
  assert.match(gemini, /thinkingLevel: "minimal"/);
  assert.match(gemini, /gemini-3\.6-flash/);
  assert.doesNotMatch(gemini, /thinkingBudget/);
  assert.doesNotMatch(gemini, /OLLAMA_|127\.0\.0\.1:11434/);
  assert.match(courseTests, /TEST_AI_TOTAL_OUTPUT_BUDGET/);
  assert.match(courseTests, /maxRetries: 1/);
  assert.match(courseTests, /think: false/);
  assert.match(ielts, /for \(let attempt = 1; attempt <= 2;/);
  assert.match(ielts, /maxOutputTokens,\s+maxRetries: 1,\s+think: false/);
  assert.match(scoring, /maxOutputTokens: 2800,\s+maxRetries: 1,\s+think: false/);
  assert.match(speaking, /maxOutputTokens: 2800, maxRetries: 1, think: false/);
  assert.match(speaking, /maxOutputTokens: 700, think: false/);
  assert.match(writingPrompt, /maxOutputTokens: 1100, maxRetries: 1, think: false/);
});
