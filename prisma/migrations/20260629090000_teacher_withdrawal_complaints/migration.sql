CREATE TYPE "TeacherRevenueWithdrawalComplaintReason" AS ENUM ('NOT_RECEIVED', 'WRONG_AMOUNT', 'OTHER');

CREATE TYPE "TeacherRevenueWithdrawalComplaintStatus" AS ENUM ('OPEN', 'RESOLVED', 'REJECTED');

CREATE TABLE "TeacherRevenueWithdrawalComplaint" (
    "id" TEXT NOT NULL,
    "withdrawalId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "reason" "TeacherRevenueWithdrawalComplaintReason" NOT NULL,
    "reportedAmount" INTEGER,
    "message" TEXT NOT NULL,
    "status" "TeacherRevenueWithdrawalComplaintStatus" NOT NULL DEFAULT 'OPEN',
    "adminNote" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherRevenueWithdrawalComplaint_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TeacherRevenueWithdrawalComplaint_withdrawalId_key" ON "TeacherRevenueWithdrawalComplaint"("withdrawalId");
CREATE INDEX "TeacherRevenueWithdrawalComplaint_teacherId_createdAt_idx" ON "TeacherRevenueWithdrawalComplaint"("teacherId", "createdAt");
CREATE INDEX "TeacherRevenueWithdrawalComplaint_status_createdAt_idx" ON "TeacherRevenueWithdrawalComplaint"("status", "createdAt");

ALTER TABLE "TeacherRevenueWithdrawalComplaint"
ADD CONSTRAINT "TeacherRevenueWithdrawalComplaint_withdrawalId_fkey"
FOREIGN KEY ("withdrawalId") REFERENCES "TeacherRevenueWithdrawal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TeacherRevenueWithdrawalComplaint"
ADD CONSTRAINT "TeacherRevenueWithdrawalComplaint_teacherId_fkey"
FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
