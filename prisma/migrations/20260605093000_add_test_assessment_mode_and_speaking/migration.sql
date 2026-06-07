CREATE TYPE "TestAssessmentMode" AS ENUM ('STANDARD', 'WRITING', 'SPEAKING');

ALTER TABLE "Test"
ADD COLUMN "assessmentMode" "TestAssessmentMode" NOT NULL DEFAULT 'STANDARD';
