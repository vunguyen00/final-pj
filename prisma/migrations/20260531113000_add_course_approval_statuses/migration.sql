-- Add values for course approval workflow
ALTER TYPE "CourseStatus" ADD VALUE IF NOT EXISTS 'PENDING_APPROVAL';
ALTER TYPE "CourseStatus" ADD VALUE IF NOT EXISTS 'REJECTED';
