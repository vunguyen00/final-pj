import assert from "node:assert/strict";
import test from "node:test";
import { normalizeFeedbackTextItems } from "../lib/ai-feedback-normalization.ts";
import { parseAiJsonObject } from "../lib/ai-json-repair.ts";

test("formats structured multilingual corrections without object coercion", () => {
  const items = normalizeFeedbackTextItems([
    {
      original: "私は昨日学校に行く",
      improved: "私は昨日学校に行きました",
      reason: "過去形を使います",
    },
    { error: "我昨天去学校。", correction: "我昨天去了学校。", explanation: "补充动态助词。" },
    { before: "나는 어제 학교에 가요.", after: "나는 어제 학교에 갔어요.", detail: "과거형을 사용합니다." },
  ]);

  assert.deepEqual(items, [
    "私は昨日学校に行く → 私は昨日学校に行きました — 過去形を使います",
    "我昨天去学校。 → 我昨天去了学校。 — 补充动态助词。",
    "나는 어제 학교에 가요. → 나는 어제 학교에 갔어요. — 과거형을 사용합니다.",
  ]);
  assert.equal(items.some((item) => item.includes("[object Object]")), false);
});

test("flattens nested AI feedback values into safe text", () => {
  assert.deepEqual(
    normalizeFeedbackTextItems([
      "  concise feedback  ",
      { text: "structured feedback" },
      { nested: ["first", { message: "second" }] },
      "[object Object]",
    ]),
    ["concise feedback", "structured feedback", "first — second"],
  );
});

test("repairs an AI JSON response truncated inside its final string", () => {
  const parsed = parseAiJsonObject(
    '{"results":[{"questionId":"speaking","overallScore":7,"criteria":{"fluency":7},"sampleAnswer":"回答の途中',
  );

  assert.equal(parsed.repaired, true);
  assert.equal(parsed.value.results[0].questionId, "speaking");
  assert.equal(parsed.value.results[0].sampleAnswer, "回答の途中");
});
