-- Revoke stateless auth tokens after security-sensitive account changes.
ALTER TABLE "User" ADD COLUMN "authVersion" INTEGER NOT NULL DEFAULT 0;

-- Make course-payment confirmation idempotent even when VNPay IPN and return race.
CREATE UNIQUE INDEX "OrderItem_orderId_courseId_key" ON "OrderItem"("orderId", "courseId");

-- Record the explicit destination of an approved refund.
ALTER TABLE "CourseRefundRequest"
ADD COLUMN "refundMethod" TEXT NOT NULL DEFAULT 'STORE_CREDIT';

-- Server-side evidence for sequential video watching.
CREATE TABLE "VideoWatchProgress" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "lessonId" TEXT NOT NULL,
  "lastPositionSeconds" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "durationSeconds" DOUBLE PRECISION,
  "lastHeartbeatAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "seekViolation" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VideoWatchProgress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VideoWatchProgress_userId_lessonId_key"
ON "VideoWatchProgress"("userId", "lessonId");
CREATE INDEX "VideoWatchProgress_lessonId_updatedAt_idx"
ON "VideoWatchProgress"("lessonId", "updatedAt");
ALTER TABLE "VideoWatchProgress"
ADD CONSTRAINT "VideoWatchProgress_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VideoWatchProgress"
ADD CONSTRAINT "VideoWatchProgress_lessonId_fkey"
FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Apply the chosen attempt policy to existing tests.
UPDATE "Test" SET "maxAttempts" = CASE
  WHEN "kind" = 'COURSE' THEN 3
  WHEN "kind" = 'TEACHER_ENTRANCE' THEN 1
  ELSE 2147483647
END;
