ALTER TABLE "TeacherApplication"
ADD COLUMN "proctorSessionId" TEXT,
ADD COLUMN "proctorHeartbeatAt" TIMESTAMP(3),
ADD COLUMN "proctorHeartbeatSequence" INTEGER NOT NULL DEFAULT 0;
