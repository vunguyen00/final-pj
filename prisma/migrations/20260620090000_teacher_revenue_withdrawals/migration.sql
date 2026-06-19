CREATE TYPE "TeacherRevenueWithdrawalStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID', 'REJECTED');

CREATE TABLE "TeacherRevenueWithdrawal" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "status" "TeacherRevenueWithdrawalStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherRevenueWithdrawal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TeacherRevenueWithdrawal_teacherId_createdAt_idx" ON "TeacherRevenueWithdrawal"("teacherId", "createdAt");
CREATE INDEX "TeacherRevenueWithdrawal_status_createdAt_idx" ON "TeacherRevenueWithdrawal"("status", "createdAt");

ALTER TABLE "TeacherRevenueWithdrawal"
ADD CONSTRAINT "TeacherRevenueWithdrawal_teacherId_fkey"
FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
