CREATE TYPE "TeacherSpeakingMediaStatus" AS ENUM (
  'NONE',
  'UPLOADED',
  'PROCESSING',
  'READY',
  'FAILED'
);

ALTER TABLE "TeacherEntranceQuestionInstance"
ADD COLUMN "speakingAudioUrl" TEXT,
ADD COLUMN "speakingAudioHash" TEXT,
ADD COLUMN "speakingAudioMime" TEXT,
ADD COLUMN "speakingAudioBytes" INTEGER,
ADD COLUMN "speakingMediaStatus" "TeacherSpeakingMediaStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN "speakingTranscript" TEXT,
ADD COLUMN "speakingProcessingTokenHash" TEXT,
ADD COLUMN "speakingProcessingTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN "speakingProcessingError" TEXT,
ADD COLUMN "speakingProcessingAttempts" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "TeacherEntranceQuestionInstance_applicationId_speakingMediaStatus_idx"
ON "TeacherEntranceQuestionInstance"("applicationId", "speakingMediaStatus");
