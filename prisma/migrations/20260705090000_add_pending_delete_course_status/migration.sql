ALTER TYPE "CourseStatus" ADD VALUE IF NOT EXISTS 'PENDING_DELETE';

ALTER TABLE "Course" ADD COLUMN "deleteRequestedFromStatus" "CourseStatus";
