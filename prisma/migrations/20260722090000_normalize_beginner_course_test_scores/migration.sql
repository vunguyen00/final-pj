-- The beginner-course seed uses relative question weights totaling 18,
-- while the application requires every test's question weights to total 100.
-- Scale only the known seeded courses; leave user-authored tests untouched.
WITH seeded_test_totals AS (
  SELECT test."id" AS "testId", SUM(question."score") AS "totalScore"
  FROM "Test" test
  JOIN "Question" question ON question."testId" = test."id"
  WHERE test."courseId" IN (
    'course-english-beginner',
    'course-chinese-beginner',
    'course-japanese-beginner',
    'course-korean-beginner'
  )
    AND test."kind" = 'COURSE'
  GROUP BY test."id"
  HAVING SUM(question."score") > 0
    AND ABS(SUM(question."score") - 100) > 0.001
)
UPDATE "Question" question
SET "score" = question."score" * (100.0 / totals."totalScore")
FROM seeded_test_totals totals
WHERE question."testId" = totals."testId";
