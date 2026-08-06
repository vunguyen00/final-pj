ALTER TYPE "TeacherApplicationStatus" ADD VALUE IF NOT EXISTS 'PENDING';
ALTER TYPE "TeacherApplicationStatus" ADD VALUE IF NOT EXISTS 'INVITED_TO_EXAM';
ALTER TYPE "TeacherApplicationStatus" ADD VALUE IF NOT EXISTS 'CHECKED_IN';
ALTER TYPE "TeacherApplicationStatus" ADD VALUE IF NOT EXISTS 'EXAM_COMPLETED';
ALTER TYPE "TeacherApplicationStatus" ADD VALUE IF NOT EXISTS 'PASSED';
ALTER TYPE "TeacherApplicationStatus" ADD VALUE IF NOT EXISTS 'CONVERTED_TO_TEACHER';

CREATE TYPE "RecruitmentRoundStatus" AS ENUM ('DRAFT', 'OPEN', 'CLOSED', 'ARCHIVED');

CREATE TABLE "RecruitmentRound" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "status" "RecruitmentRoundStatus" NOT NULL DEFAULT 'DRAFT',
  "registrationOpensAt" TIMESTAMP(3) NOT NULL,
  "registrationClosesAt" TIMESTAMP(3) NOT NULL,
  "examStartsAt" TIMESTAMP(3) NOT NULL,
  "examEndsAt" TIMESTAMP(3) NOT NULL,
  "locations" JSONB NOT NULL,
  "gradingTokenHash" TEXT,
  "gradingTokenIssuedAt" TIMESTAMP(3),
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RecruitmentRound_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TeacherExamResult" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "checkedIn" BOOLEAN NOT NULL DEFAULT false,
  "completed" BOOLEAN NOT NULL DEFAULT false,
  "writingScore" DOUBLE PRECISION,
  "speakingScore" DOUBLE PRECISION,
  "listeningScore" DOUBLE PRECISION,
  "readingScore" DOUBLE PRECISION,
  "failed" BOOLEAN NOT NULL DEFAULT false,
  "submittedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TeacherExamResult_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "TeacherApplication" ADD COLUMN "recruitmentRoundId" TEXT;

CREATE UNIQUE INDEX "RecruitmentRound_gradingTokenHash_key" ON "RecruitmentRound"("gradingTokenHash");
CREATE INDEX "RecruitmentRound_status_registrationOpensAt_idx" ON "RecruitmentRound"("status", "registrationOpensAt");
CREATE INDEX "RecruitmentRound_createdAt_idx" ON "RecruitmentRound"("createdAt");
CREATE UNIQUE INDEX "TeacherExamResult_applicationId_key" ON "TeacherExamResult"("applicationId");
CREATE INDEX "TeacherExamResult_submittedAt_idx" ON "TeacherExamResult"("submittedAt");
CREATE INDEX "TeacherApplication_recruitmentRoundId_createdAt_idx" ON "TeacherApplication"("recruitmentRoundId", "createdAt");

ALTER TABLE "RecruitmentRound" ADD CONSTRAINT "RecruitmentRound_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TeacherExamResult" ADD CONSTRAINT "TeacherExamResult_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "TeacherApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeacherApplication" ADD CONSTRAINT "TeacherApplication_recruitmentRoundId_fkey" FOREIGN KEY ("recruitmentRoundId") REFERENCES "RecruitmentRound"("id") ON DELETE SET NULL ON UPDATE CASCADE;
