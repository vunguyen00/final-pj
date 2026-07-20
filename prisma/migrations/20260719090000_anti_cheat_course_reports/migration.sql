ALTER TYPE "TeacherApplicationStatus" ADD VALUE IF NOT EXISTS 'FAILED_CHEATING';

ALTER TABLE "TeacherApplication"
ADD COLUMN "violationCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "failureReason" TEXT,
ADD COLUMN "antiCheatAcknowledgedAt" TIMESTAMP(3);

ALTER TABLE "AntiCheatLog"
ADD COLUMN "durationSeconds" INTEGER,
ADD COLUMN "confidence" DOUBLE PRECISION,
ADD COLUMN "counted" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "AntiCheatLog_applicationId_eventType_serverTimestamp_idx"
ON "AntiCheatLog"("applicationId", "eventType", "serverTimestamp");
CREATE INDEX "AntiCheatLog_applicationId_counted_idx"
ON "AntiCheatLog"("applicationId", "counted");

CREATE TYPE "CourseReportCategory" AS ENUM (
  'INACCURATE_CONTENT',
  'BROKEN_RESOURCE',
  'ACCESS_PROBLEM',
  'INAPPROPRIATE_CONTENT',
  'QUALITY_MISMATCH',
  'INSTRUCTOR_PROBLEM',
  'OTHER'
);

CREATE TYPE "CourseReportStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'RESOLVED', 'REJECTED');

CREATE TABLE "CourseReport" (
  "id" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "reporterId" TEXT NOT NULL,
  "lessonId" TEXT,
  "category" "CourseReportCategory" NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "truthfulConfirmed" BOOLEAN NOT NULL DEFAULT false,
  "status" "CourseReportStatus" NOT NULL DEFAULT 'PENDING',
  "response" TEXT,
  "respondedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CourseReport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CourseReport_courseId_createdAt_idx" ON "CourseReport"("courseId", "createdAt");
CREATE INDEX "CourseReport_reporterId_createdAt_idx" ON "CourseReport"("reporterId", "createdAt");
CREATE INDEX "CourseReport_status_createdAt_idx" ON "CourseReport"("status", "createdAt");
CREATE INDEX "CourseReport_lessonId_idx" ON "CourseReport"("lessonId");

ALTER TABLE "CourseReport" ADD CONSTRAINT "CourseReport_courseId_fkey"
FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourseReport" ADD CONSTRAINT "CourseReport_reporterId_fkey"
FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourseReport" ADD CONSTRAINT "CourseReport_lessonId_fkey"
FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CourseReport" ADD CONSTRAINT "CourseReport_respondedById_fkey"
FOREIGN KEY ("respondedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
