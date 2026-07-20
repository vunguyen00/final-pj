ALTER TABLE "Question"
ADD COLUMN "preparationTimeSeconds" INTEGER,
ADD COLUMN "answerTimeSeconds" INTEGER;

ALTER TABLE "TeacherApplication"
ADD COLUMN "questionRevealState" JSONB;

ALTER TABLE "AntiCheatLog"
ADD COLUMN "incidentId" TEXT;

CREATE UNIQUE INDEX "AntiCheatLog_applicationId_incidentId_key"
ON "AntiCheatLog"("applicationId", "incidentId");
