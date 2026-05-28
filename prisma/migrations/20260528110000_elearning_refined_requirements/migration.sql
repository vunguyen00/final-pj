-- CreateEnum
CREATE TYPE "TestKind" AS ENUM ('COURSE', 'PUBLIC_PRACTICE', 'TEACHER_ENTRANCE');

-- CreateEnum
CREATE TYPE "TeacherApplicationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'EXPIRED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "phoneNumber" TEXT;
ALTER TABLE "User" ADD COLUMN "isBanned" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "learningLanguageId" TEXT;
DROP INDEX IF EXISTS "User_username_key";

-- AlterTable
ALTER TABLE "Course" ADD COLUMN "languageId" TEXT;

-- AlterTable
ALTER TABLE "Test" ADD COLUMN "languageId" TEXT;
ALTER TABLE "Test" ADD COLUMN "kind" "TestKind" NOT NULL DEFAULT 'COURSE';
ALTER TABLE "Test" ALTER COLUMN "courseId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "LearningLanguage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningLanguage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "TeacherApplication" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "languageId" TEXT NOT NULL,
    "status" "TeacherApplicationStatus" NOT NULL DEFAULT 'DRAFT',
    "attemptNo" INTEGER NOT NULL,
    "entranceTestId" TEXT,
    "entranceAttemptId" TEXT,
    "answerState" JSONB,
    "startedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherCertificate" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeacherCertificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherApplicationLog" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "status" "TeacherApplicationStatus" NOT NULL,
    "message" TEXT NOT NULL,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeacherApplicationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AntiCheatLog" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "testAttemptId" TEXT,
    "eventType" TEXT NOT NULL,
    "detail" TEXT,
    "severity" INTEGER NOT NULL DEFAULT 1,
    "clientTimestamp" TIMESTAMP(3),
    "serverTimestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "AntiCheatLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuspiciousEvent" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "totalDurationSeconds" INTEGER NOT NULL DEFAULT 0,
    "severity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SuspiciousEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LearningLanguage_name_key" ON "LearningLanguage"("name");
CREATE UNIQUE INDEX "LearningLanguage_code_key" ON "LearningLanguage"("code");
CREATE INDEX "TeacherApplication_userId_createdAt_idx" ON "TeacherApplication"("userId", "createdAt");
CREATE INDEX "TeacherApplication_status_createdAt_idx" ON "TeacherApplication"("status", "createdAt");
CREATE INDEX "AntiCheatLog_applicationId_serverTimestamp_idx" ON "AntiCheatLog"("applicationId", "serverTimestamp");
CREATE UNIQUE INDEX "SuspiciousEvent_applicationId_eventType_key" ON "SuspiciousEvent"("applicationId", "eventType");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_learningLanguageId_fkey" FOREIGN KEY ("learningLanguageId") REFERENCES "LearningLanguage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Course" ADD CONSTRAINT "Course_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "LearningLanguage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Test" ADD CONSTRAINT "Test_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "LearningLanguage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TeacherApplication" ADD CONSTRAINT "TeacherApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeacherApplication" ADD CONSTRAINT "TeacherApplication_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "LearningLanguage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TeacherApplication" ADD CONSTRAINT "TeacherApplication_entranceTestId_fkey" FOREIGN KEY ("entranceTestId") REFERENCES "Test"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TeacherApplication" ADD CONSTRAINT "TeacherApplication_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TeacherCertificate" ADD CONSTRAINT "TeacherCertificate_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "TeacherApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeacherApplicationLog" ADD CONSTRAINT "TeacherApplicationLog_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "TeacherApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AntiCheatLog" ADD CONSTRAINT "AntiCheatLog_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "TeacherApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AntiCheatLog" ADD CONSTRAINT "AntiCheatLog_testAttemptId_fkey" FOREIGN KEY ("testAttemptId") REFERENCES "TestAttempt"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SuspiciousEvent" ADD CONSTRAINT "SuspiciousEvent_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "TeacherApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
