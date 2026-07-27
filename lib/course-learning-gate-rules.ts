export type LearningGateModule = {
  id: string;
  order: number;
  lessons: Array<{ id: string }>;
  tests: Array<{ id: string }>;
};

export type ModuleGateState = LearningGateModule & {
  isUnlocked: boolean;
  lessonsComplete: boolean;
  testsPassed: boolean;
  isComplete: boolean;
  pendingTestIds: string[];
};

export type CourseLearningGateState = {
  modules: ModuleGateState[];
  courseTestIds: string[];
  pendingCourseTestIds: string[];
  completedLessonIds: Set<string>;
  passedTestIds: Set<string>;
  modulesComplete: boolean;
  courseComplete: boolean;
};

export type CourseLearningAction =
  | { type: "LESSON"; lessonId: string }
  | { type: "TEST"; testId: string }
  | { type: "COMPLETE" };

export function calculateCourseLearningGateState({
  modules,
  courseTestIds,
  completedLessonIds,
  passedTestIds,
}: {
  modules: LearningGateModule[];
  courseTestIds: string[];
  completedLessonIds: Iterable<string>;
  passedTestIds: Iterable<string>;
}): CourseLearningGateState {
  const completedSet = new Set(completedLessonIds);
  const passedSet = new Set(passedTestIds);
  let previousModulesComplete = true;

  const moduleStates = [...modules]
    .sort((left, right) => left.order - right.order)
    .map((courseModule) => {
      const lessonsComplete = courseModule.lessons.every((lesson) => completedSet.has(lesson.id));
      const pendingTestIds = courseModule.tests
        .map((test) => test.id)
        .filter((testId) => !passedSet.has(testId));
      const testsPassed = pendingTestIds.length === 0;
      const isComplete = lessonsComplete && testsPassed;
      const state: ModuleGateState = {
        ...courseModule,
        isUnlocked: previousModulesComplete,
        lessonsComplete,
        testsPassed,
        isComplete,
        pendingTestIds,
      };
      previousModulesComplete = previousModulesComplete && isComplete;
      return state;
    });

  const modulesComplete = moduleStates.every((courseModule) => courseModule.isComplete);
  const pendingCourseTestIds = courseTestIds.filter((testId) => !passedSet.has(testId));

  return {
    modules: moduleStates,
    courseTestIds,
    pendingCourseTestIds,
    completedLessonIds: completedSet,
    passedTestIds: passedSet,
    modulesComplete,
    courseComplete: modulesComplete && pendingCourseTestIds.length === 0,
  };
}

export function getNextCourseLearningAction(
  state: CourseLearningGateState,
): CourseLearningAction {
  for (const courseModule of state.modules) {
    if (!courseModule.isUnlocked) break;

    const nextLesson = courseModule.lessons.find(
      (lesson) => !state.completedLessonIds.has(lesson.id),
    );
    if (nextLesson) return { type: "LESSON", lessonId: nextLesson.id };
    if (courseModule.pendingTestIds[0]) {
      return { type: "TEST", testId: courseModule.pendingTestIds[0] };
    }
  }

  if (state.pendingCourseTestIds[0]) {
    return { type: "TEST", testId: state.pendingCourseTestIds[0] };
  }

  return { type: "COMPLETE" };
}

export function isModuleUnlocked(
  state: CourseLearningGateState,
  moduleId: string,
) {
  return state.modules.some((courseModule) => courseModule.id === moduleId && courseModule.isUnlocked);
}

export function isCourseTestUnlocked(
  state: CourseLearningGateState,
  test: { moduleId: string | null },
) {
  if (!test.moduleId) return state.modulesComplete;
  const courseModule = state.modules.find((item) => item.id === test.moduleId);
  return Boolean(courseModule?.isUnlocked && courseModule.lessonsComplete);
}
