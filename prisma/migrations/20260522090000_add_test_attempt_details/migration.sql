ALTER TABLE "TestAttempt"
ADD COLUMN "attemptNo" INTEGER,
ADD COLUMN "maxScore" DOUBLE PRECISION,
ADD COLUMN "answers" JSONB,
ADD COLUMN "results" JSONB;

WITH attempt_rank AS (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "testId", "userId" ORDER BY "submittedAt" ASC) AS rn
  FROM "TestAttempt"
)
UPDATE "TestAttempt" t
SET "attemptNo" = r.rn
FROM attempt_rank r
WHERE t."id" = r."id";

UPDATE "TestAttempt"
SET "maxScore" = "score"
WHERE "maxScore" IS NULL;

ALTER TABLE "TestAttempt"
ALTER COLUMN "attemptNo" SET NOT NULL,
ALTER COLUMN "maxScore" SET NOT NULL;

CREATE UNIQUE INDEX "TestAttempt_testId_userId_attemptNo_key"
ON "TestAttempt"("testId", "userId", "attemptNo");
