CREATE TYPE "UserAccountStatus" AS ENUM ('PENDING_VERIFICATION', 'ACTIVE');

CREATE TYPE "TeacherBankAccountVerificationStatus" AS ENUM ('UNVERIFIED', 'VERIFIED', 'REJECTED');

ALTER TYPE "TeacherRevenueWithdrawalStatus" ADD VALUE IF NOT EXISTS 'COMPLETED';

ALTER TABLE "User"
  ADD COLUMN "accountStatus" "UserAccountStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);

CREATE TABLE "EmailVerificationOtp" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "resendAvailableAt" TIMESTAMP(3) NOT NULL,
  "requestIp" TEXT,
  "deviceFingerprint" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EmailVerificationOtp_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RegistrationSecurityEvent" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "email" TEXT NOT NULL,
  "requestIp" TEXT,
  "deviceFingerprint" TEXT,
  "eventType" TEXT NOT NULL,
  "detail" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RegistrationSecurityEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TeacherBankAccount" (
  "id" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  "bankName" TEXT NOT NULL,
  "accountNumber" TEXT NOT NULL,
  "accountName" TEXT NOT NULL,
  "branch" TEXT,
  "verificationStatus" "TeacherBankAccountVerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TeacherBankAccount_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "TeacherRevenueWithdrawal"
  ADD COLUMN "bankBranch" TEXT,
  ADD COLUMN "bankVerificationStatus" "TeacherBankAccountVerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
  ADD COLUMN "systemBankName" TEXT,
  ADD COLUMN "transferTransactionCode" TEXT,
  ADD COLUMN "processedById" TEXT;

ALTER TABLE "Payment"
  ADD COLUMN "courseId" TEXT,
  ADD COLUMN "expiresAt" TIMESTAMP(3);

CREATE INDEX "EmailVerificationOtp_userId_createdAt_idx" ON "EmailVerificationOtp"("userId", "createdAt");
CREATE INDEX "EmailVerificationOtp_email_createdAt_idx" ON "EmailVerificationOtp"("email", "createdAt");
CREATE INDEX "EmailVerificationOtp_requestIp_createdAt_idx" ON "EmailVerificationOtp"("requestIp", "createdAt");
CREATE INDEX "EmailVerificationOtp_deviceFingerprint_createdAt_idx" ON "EmailVerificationOtp"("deviceFingerprint", "createdAt");

CREATE INDEX "RegistrationSecurityEvent_email_createdAt_idx" ON "RegistrationSecurityEvent"("email", "createdAt");
CREATE INDEX "RegistrationSecurityEvent_requestIp_createdAt_idx" ON "RegistrationSecurityEvent"("requestIp", "createdAt");
CREATE INDEX "RegistrationSecurityEvent_eventType_createdAt_idx" ON "RegistrationSecurityEvent"("eventType", "createdAt");

CREATE UNIQUE INDEX "TeacherBankAccount_teacherId_key" ON "TeacherBankAccount"("teacherId");
CREATE INDEX "Payment_courseId_createdAt_idx" ON "Payment"("courseId", "createdAt");

ALTER TABLE "EmailVerificationOtp" ADD CONSTRAINT "EmailVerificationOtp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RegistrationSecurityEvent" ADD CONSTRAINT "RegistrationSecurityEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TeacherBankAccount" ADD CONSTRAINT "TeacherBankAccount_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeacherRevenueWithdrawal" ADD CONSTRAINT "TeacherRevenueWithdrawal_processedById_fkey" FOREIGN KEY ("processedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;
