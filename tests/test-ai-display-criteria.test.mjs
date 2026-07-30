import assert from "node:assert/strict";
import test from "node:test";
import { getTestAiDisplayCriteria } from "../lib/test-ai-display-criteria.ts";

test("writing results prefer rubric scores and exclude speaking-only criteria", () => {
  const scores = getTestAiDisplayCriteria({
    mode: "WRITING",
    overallScore: 8,
    criteria: {
      task_response: 8,
      coherence: 8,
      vocabulary: 8.5,
      grammar: 8,
      fluency: 0,
      pronunciation: 0,
    },
    criteriaScores: {
      task_response: 80,
      content_development: 75,
      coherence: 80,
      vocabulary: 85,
      grammar: 80,
      orthography_style: 90,
    },
  });

  assert.deepEqual(scores, {
    task_response: 8,
    content_development: 7.5,
    coherence: 8,
    vocabulary: 8.5,
    grammar: 8,
    orthography_style: 9,
  });
  assert.equal("fluency" in scores, false);
  assert.equal("pronunciation" in scores, false);
});

test("legacy writing results hide speaking placeholders without regrading", () => {
  const scores = getTestAiDisplayCriteria({
    mode: "WRITING",
    overallScore: 7.5,
    criteria: {
      task_response: 8,
      coherence: 7.5,
      vocabulary: 8,
      grammar: 7,
      fluency: 0,
      pronunciation: 0,
    },
  });

  assert.deepEqual(scores, {
    task_response: 8,
    coherence: 7.5,
    vocabulary: 8,
    grammar: 7,
  });
});

test("speaking results exclude writing-only criteria", () => {
  const scores = getTestAiDisplayCriteria({
    mode: "SPEAKING",
    overallScore: 7,
    criteria: {
      task_response: 0,
      coherence: 0,
      fluency: 7,
      vocabulary: 7.5,
      grammar: 6.5,
      pronunciation: 7,
    },
  });

  assert.deepEqual(scores, {
    fluency: 7,
    vocabulary: 7.5,
    grammar: 6.5,
    pronunciation: 7,
  });
});
