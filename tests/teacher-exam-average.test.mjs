import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateTeacherExamAverage,
  normalizeTeacherExamScoreInput,
  TEACHER_EXAM_PASSING_AVERAGE,
} from "../lib/teacher-exam-skills.ts";

test("teacher recruitment requires an average of 80 across four skills", () => {
  assert.equal(TEACHER_EXAM_PASSING_AVERAGE, 80);
  assert.equal(calculateTeacherExamAverage({ writingScore: 80, speakingScore: 80, listeningScore: 80, readingScore: 80 }), 80);
  assert.equal(calculateTeacherExamAverage({ writingScore: 100, speakingScore: 90, listeningScore: 70, readingScore: 60 }), 80);
  assert.equal(calculateTeacherExamAverage({ writingScore: 79, speakingScore: 80, listeningScore: 80, readingScore: 80 }), 79.8);
  assert.equal(calculateTeacherExamAverage({ writingScore: null, speakingScore: 80, listeningScore: 80, readingScore: 80 }), null);
});

test("teacher recruitment score input stays between 0 and 100", () => {
  assert.equal(normalizeTeacherExamScoreInput("101"), "100");
  assert.equal(normalizeTeacherExamScoreInput("100.1"), "100");
  assert.equal(normalizeTeacherExamScoreInput("-1"), "0");
  assert.equal(normalizeTeacherExamScoreInput("99.9"), "99.9");
  assert.equal(normalizeTeacherExamScoreInput(""), "");
});
