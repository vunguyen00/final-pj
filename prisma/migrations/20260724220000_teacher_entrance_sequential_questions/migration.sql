CREATE TYPE "TeacherQuestionInstanceStatus" AS ENUM (
  'LOCKED',
  'REVEALED',
  'ANSWERING',
  'FINALIZING',
  'FINALIZED',
  'SKIPPED',
  'EXPIRED'
);

ALTER TABLE "TeacherApplication"
ADD COLUMN "currentQuestionInstanceId" TEXT,
ADD COLUMN "sequentialCompletedAt" TIMESTAMP(3),
ADD COLUMN "entrancePassingScore" DOUBLE PRECISION,
ADD COLUMN "entranceMaxScore" DOUBLE PRECISION,
ADD COLUMN "entranceTimeLimit" INTEGER;

CREATE TABLE "TeacherEntranceQuestionInstance" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "sourceQuestionId" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL,
  "type" "QuestionType" NOT NULL,
  "content" TEXT NOT NULL,
  "audioUrl" TEXT,
  "hint" TEXT,
  "score" DOUBLE PRECISION NOT NULL,
  "preparationTimeSeconds" INTEGER,
  "answerTimeSeconds" INTEGER,
  "answerOptions" JSONB,
  "scoringData" JSONB,
  "status" "TeacherQuestionInstanceStatus" NOT NULL DEFAULT 'LOCKED',
  "revealedAt" TIMESTAMP(3),
  "answerStartsAt" TIMESTAMP(3),
  "deadlineAt" TIMESTAMP(3),
  "answerState" TEXT,
  "answerRevision" INTEGER NOT NULL DEFAULT 0,
  "finalAnswer" TEXT,
  "finalizedAt" TIMESTAMP(3),
  "transitionTokenHash" TEXT,
  "transitionTokenExpiresAt" TIMESTAMP(3),
  "contentHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TeacherEntranceQuestionInstance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TeacherEntranceQuestionInstance_applicationId_sequence_key"
ON "TeacherEntranceQuestionInstance"("applicationId", "sequence");

CREATE INDEX "TeacherEntranceQuestionInstance_applicationId_status_idx"
ON "TeacherEntranceQuestionInstance"("applicationId", "status");

CREATE INDEX "TeacherEntranceQuestionInstance_applicationId_id_idx"
ON "TeacherEntranceQuestionInstance"("applicationId", "id");

ALTER TABLE "TeacherEntranceQuestionInstance"
ADD CONSTRAINT "TeacherEntranceQuestionInstance_applicationId_fkey"
FOREIGN KEY ("applicationId") REFERENCES "TeacherApplication"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
