import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateCourseLearningGateState,
  getNextCourseLearningAction,
  isCourseTestUnlocked,
} from "../lib/course-learning-gate-rules.ts";

const modules = [
  {
    id: "module-1",
    order: 1,
    lessons: [{ id: "lesson-1" }, { id: "lesson-2" }],
    tests: [{ id: "test-1a" }, { id: "test-1b" }],
  },
  {
    id: "module-2",
    order: 2,
    lessons: [{ id: "lesson-3" }],
    tests: [],
  },
];

function state(completedLessonIds = [], passedTestIds = []) {
  return calculateCourseLearningGateState({
    modules,
    courseTestIds: ["final-test"],
    completedLessonIds,
    passedTestIds,
  });
}

test("the next module stays locked until every test in the previous module is passed", () => {
  const beforeTests = state(["lesson-1", "lesson-2"]);
  assert.equal(beforeTests.modules[0].lessonsComplete, true);
  assert.equal(beforeTests.modules[1].isUnlocked, false);
  assert.deepEqual(getNextCourseLearningAction(beforeTests), { type: "TEST", testId: "test-1a" });

  const afterOneTest = state(["lesson-1", "lesson-2"], ["test-1a"]);
  assert.equal(afterOneTest.modules[1].isUnlocked, false);
  assert.deepEqual(getNextCourseLearningAction(afterOneTest), { type: "TEST", testId: "test-1b" });

  const afterEveryTest = state(["lesson-1", "lesson-2"], ["test-1a", "test-1b"]);
  assert.equal(afterEveryTest.modules[1].isUnlocked, true);
  assert.deepEqual(getNextCourseLearningAction(afterEveryTest), { type: "LESSON", lessonId: "lesson-3" });
});

test("a module without tests opens the next step as soon as its lessons are complete", () => {
  const completedModules = state(
    ["lesson-1", "lesson-2", "lesson-3"],
    ["test-1a", "test-1b"],
  );

  assert.equal(completedModules.modules[1].isComplete, true);
  assert.equal(completedModules.modulesComplete, true);
  assert.deepEqual(getNextCourseLearningAction(completedModules), { type: "TEST", testId: "final-test" });
});

test("a module test unlocks after that module's lessons, while the final test waits for every module gate", () => {
  const firstModuleReady = state(["lesson-1", "lesson-2"]);

  assert.equal(isCourseTestUnlocked(firstModuleReady, { moduleId: "module-1" }), true);
  assert.equal(isCourseTestUnlocked(firstModuleReady, { moduleId: "module-2" }), false);
  assert.equal(isCourseTestUnlocked(firstModuleReady, { moduleId: null }), false);

  const allModulesReady = state(
    ["lesson-1", "lesson-2", "lesson-3"],
    ["test-1a", "test-1b"],
  );
  assert.equal(isCourseTestUnlocked(allModulesReady, { moduleId: null }), true);
  assert.equal(allModulesReady.courseComplete, false);

  const courseComplete = state(
    ["lesson-1", "lesson-2", "lesson-3"],
    ["test-1a", "test-1b", "final-test"],
  );
  assert.equal(courseComplete.courseComplete, true);
  assert.deepEqual(getNextCourseLearningAction(courseComplete), { type: "COMPLETE" });
});
