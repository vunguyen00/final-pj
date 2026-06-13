ALTER TABLE "AiAssessment"
ADD COLUMN "taskType" TEXT,
ADD COLUMN "createdAt" TIMESTAMP(3),
ADD COLUMN "updatedAt" TIMESTAMP(3);

UPDATE "AiAssessment"
SET
  "createdAt" = "submittedAt",
  "updatedAt" = "submittedAt"
WHERE "createdAt" IS NULL OR "updatedAt" IS NULL;

ALTER TABLE "AiAssessment"
ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "createdAt" SET NOT NULL,
ALTER COLUMN "updatedAt" SET NOT NULL;
