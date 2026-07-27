-- Progress created in a later module before every earlier module gate was
-- completed is not valid under the sequential course-learning rules.
CREATE TEMP TABLE "_InvalidModuleLearningAccess" AS
SELECT DISTINCT
  feedback."userId",
  module."courseId",
  module."id" AS "moduleId"
FROM "Feedback" AS feedback
JOIN "Lesson" AS lesson
  ON feedback."content" = 'PROGRESS:' || lesson."id"
JOIN "Module" AS module
  ON module."id" = lesson."moduleId"
WHERE feedback."courseId" = module."courseId"
  AND EXISTS (
    SELECT 1
    FROM "Module" AS previous_module
    WHERE previous_module."courseId" = module."courseId"
      AND previous_module."order" < module."order"
      AND (
        EXISTS (
          SELECT 1
          FROM "Lesson" AS previous_lesson
          WHERE previous_lesson."moduleId" = previous_module."id"
            AND NOT EXISTS (
              SELECT 1
              FROM "Feedback" AS previous_progress
              WHERE previous_progress."userId" = feedback."userId"
                AND previous_progress."courseId" = module."courseId"
                AND previous_progress."content" = 'PROGRESS:' || previous_lesson."id"
            )
        )
        OR EXISTS (
          SELECT 1
          FROM "Test" AS previous_test
          WHERE previous_test."moduleId" = previous_module."id"
            AND previous_test."kind" = 'COURSE'
            AND NOT EXISTS (
              SELECT 1
              FROM "TestAttempt" AS passed_attempt
              WHERE passed_attempt."testId" = previous_test."id"
                AND passed_attempt."userId" = feedback."userId"
                AND passed_attempt."isPassed" = TRUE
            )
        )
      )
  );

DELETE FROM "VideoWatchProgress" AS watch_progress
USING "Lesson" AS lesson, "_InvalidModuleLearningAccess" AS invalid_access
WHERE watch_progress."lessonId" = lesson."id"
  AND lesson."moduleId" = invalid_access."moduleId"
  AND watch_progress."userId" = invalid_access."userId";

DELETE FROM "LearningActivity" AS activity
USING "Lesson" AS lesson, "_InvalidModuleLearningAccess" AS invalid_access
WHERE activity."sourceKey" = 'ACTIVITY:' || invalid_access."userId" || ':LESSON:' || lesson."id"
  AND lesson."moduleId" = invalid_access."moduleId"
  AND activity."userId" = invalid_access."userId"
  AND activity."courseId" = invalid_access."courseId"
  AND activity."activityType" = 'LESSON';

DELETE FROM "Feedback" AS feedback
USING "Lesson" AS lesson, "_InvalidModuleLearningAccess" AS invalid_access
WHERE lesson."moduleId" = invalid_access."moduleId"
  AND feedback."userId" = invalid_access."userId"
  AND feedback."courseId" = invalid_access."courseId"
  AND feedback."content" IN (
    'PROGRESS:' || lesson."id",
    'LESSON_START:' || lesson."id"
  );

DROP TABLE "_InvalidModuleLearningAccess";
