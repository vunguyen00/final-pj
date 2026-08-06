import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateTeacherExamAverage,
  TEACHER_EXAM_PASSING_AVERAGE,
} from "../lib/teacher-exam-skills.ts";

test("teacher recruitment requires an average of 80 across four skills", () => {
  assert.equal(TEACHER_EXAM_PASSING_AVERAGE, 80);
  assert.equal(calculateTeacherExamAverage({ writingScore: 80, speakingScore: 80, listeningScore: 80, readingScore: 80 }), 80);
  assert.equal(calculateTeacherExamAverage({ writingScore: 100, speakingScore: 90, listeningScore: 70, readingScore: 60 }), 80);
  assert.equal(calculateTeacherExamAverage({ writingScore: 79, speakingScore: 80, listeningScore: 80, readingScore: 80 }), 79.8);
  assert.equal(calculateTeacherExamAverage({ writingScore: null, speakingScore: 80, listeningScore: 80, readingScore: 80 }), null);
});
