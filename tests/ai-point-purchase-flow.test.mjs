import assert from "node:assert/strict";
import test from "node:test";
import {
  createAiPointPurchaseContext,
  isSafeLocalReturnPath,
} from "../lib/ai-point-purchase-flow.ts";

test("AI-point purchases only return to safe pages inside this application", () => {
  assert.equal(isSafeLocalReturnPath("/student/tests/test-1?attempt=active"), true);
  assert.equal(isSafeLocalReturnPath("//attacker.example/path"), false);
  assert.equal(isSafeLocalReturnPath("https://attacker.example/path"), false);
  assert.equal(isSafeLocalReturnPath("student/tests/test-1"), false);
  assert.equal(isSafeLocalReturnPath(null), false);
});

test("AI-point purchase context preserves the test route and popup mode", () => {
  assert.deepEqual(
    createAiPointPurchaseContext("/student/tests/test-1", true),
    { returnTo: "/student/tests/test-1", popup: true },
  );
  assert.deepEqual(
    createAiPointPurchaseContext("https://attacker.example", true),
    { returnTo: "", popup: true },
  );
});

