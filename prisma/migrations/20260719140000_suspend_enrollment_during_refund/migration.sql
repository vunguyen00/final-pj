CREATE TYPE "EnrollmentAccessStatus" AS ENUM ('ACTIVE', 'REFUND_PENDING');

ALTER TABLE "Enrollment"
ADD COLUMN "accessStatus" "EnrollmentAccessStatus" NOT NULL DEFAULT 'ACTIVE';
