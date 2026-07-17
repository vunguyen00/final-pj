CREATE TABLE "TeacherBankAccountChangeOtp" (
  "id" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TeacherBankAccountChangeOtp_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TeacherBankAccountChangeLog" (
  "id" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  "previousBankName" TEXT,
  "previousAccountNumberMasked" TEXT,
  "previousAccountName" TEXT,
  "previousBranch" TEXT,
  "nextBankName" TEXT NOT NULL,
  "nextAccountNumberMasked" TEXT NOT NULL,
  "nextAccountName" TEXT NOT NULL,
  "nextBranch" TEXT,
  "requestIp" TEXT,
  "deviceFingerprint" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TeacherBankAccountChangeLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TeacherBankAccountChangeOtp_teacherId_createdAt_idx" ON "TeacherBankAccountChangeOtp"("teacherId", "createdAt");
CREATE INDEX "TeacherBankAccountChangeOtp_email_createdAt_idx" ON "TeacherBankAccountChangeOtp"("email", "createdAt");
CREATE INDEX "TeacherBankAccountChangeLog_teacherId_createdAt_idx" ON "TeacherBankAccountChangeLog"("teacherId", "createdAt");

ALTER TABLE "TeacherBankAccountChangeOtp"
  ADD CONSTRAINT "TeacherBankAccountChangeOtp_teacherId_fkey"
  FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TeacherBankAccountChangeLog"
  ADD CONSTRAINT "TeacherBankAccountChangeLog_teacherId_fkey"
  FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
