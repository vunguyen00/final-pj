ALTER TABLE "TeacherApplication"
ADD COLUMN IF NOT EXISTS "examLocationId" TEXT,
ADD COLUMN IF NOT EXISTS "examLocationName" TEXT,
ADD COLUMN IF NOT EXISTS "examLocationAddress" TEXT,
ADD COLUMN IF NOT EXISTS "examLocationNote" TEXT;

CREATE INDEX IF NOT EXISTS "TeacherApplication_examLocationId_idx"
ON "TeacherApplication"("examLocationId");
