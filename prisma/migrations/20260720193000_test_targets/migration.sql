ALTER TABLE "Test" ADD COLUMN "moduleId" TEXT;
ALTER TABLE "Test" ADD COLUMN "lessonId" TEXT;

ALTER TABLE "Test"
ADD CONSTRAINT "Test_moduleId_fkey"
FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Test"
ADD CONSTRAINT "Test_lessonId_fkey"
FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Test_moduleId_idx" ON "Test"("moduleId");
CREATE INDEX "Test_lessonId_idx" ON "Test"("lessonId");
