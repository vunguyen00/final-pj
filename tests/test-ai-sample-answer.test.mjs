import assert from "node:assert/strict";
import test from "node:test";
import {
  getSampleAnswerCompletenessError,
  getWritingSampleAnswerWordRange,
} from "../lib/test-ai-sample-answer.ts";

test("writing model answers inherit explicit word ranges from the question", () => {
  assert.deepEqual(
    getWritingSampleAnswerWordRange("Write 180-220 words comparing two approaches."),
    { min: 180, max: 220, source: "prompt" },
  );
  assert.deepEqual(
    getWritingSampleAnswerWordRange("Write at least 250 words."),
    { min: 250, max: null, source: "prompt" },
  );
  assert.deepEqual(getWritingSampleAnswerWordRange("Describe your hometown."), {
    min: 100,
    max: 140,
    source: "default",
  });
});

test("short or abruptly truncated model answers are rejected for regeneration", () => {
  const input = {
    questionId: "writing",
    mode: "WRITING",
    answer: "Student response",
    prompt: "Write 180-220 words comparing two approaches.",
    languageCode: "en",
  };
  const shortAnswer = `${Array.from({ length: 104 }, (_, index) => `word${index}`).join(" ")}.`;
  const completeAnswer = `${Array.from({ length: 180 }, (_, index) => `word${index}`).join(" ")}.`;

  assert.match(
    getSampleAnswerCompletenessError(input, shortAnswer),
    /104 words; expected at least 180/,
  );
  assert.equal(getSampleAnswerCompletenessError(input, completeAnswer), null);
  const nearTargetAnswer = `${Array.from({ length: 175 }, (_, index) => `word${index}`).join(" ")}.`;
  assert.equal(getSampleAnswerCompletenessError(input, nearTargetAnswer), null);
  assert.match(
    getSampleAnswerCompletenessError(
      { ...input, prompt: "Write about 100 words." },
      Array.from({ length: 100 }, (_, index) => `word${index}`).join(" "),
    ),
    /end mid-sentence/,
  );
});
