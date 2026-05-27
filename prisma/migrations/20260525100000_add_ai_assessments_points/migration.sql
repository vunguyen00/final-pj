-- CreateTable
CREATE TABLE "AiAssessment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT,
    "prompt" TEXT,
    "submissionText" TEXT,
    "audioUrl" TEXT,
    "durationSeconds" INTEGER,
    "score" DOUBLE PRECISION NOT NULL,
    "maxScore" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "bandSystem" TEXT NOT NULL,
    "bandLevel" TEXT NOT NULL,
    "bandScore" DOUBLE PRECISION NOT NULL,
    "criteria" JSONB NOT NULL,
    "feedback" JSONB NOT NULL,
    "mistakes" JSONB,
    "improvements" JSONB,
    "sampleAnswer" TEXT,
    "startedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PointTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT,
    "type" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningActivity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT,
    "activityType" TEXT NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "activityDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LearningActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiAssessment_userId_submittedAt_idx" ON "AiAssessment"("userId", "submittedAt");

-- CreateIndex
CREATE INDEX "AiAssessment_courseId_submittedAt_idx" ON "AiAssessment"("courseId", "submittedAt");

-- CreateIndex
CREATE INDEX "AiAssessment_type_submittedAt_idx" ON "AiAssessment"("type", "submittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PointTransaction_sourceKey_key" ON "PointTransaction"("sourceKey");

-- CreateIndex
CREATE INDEX "PointTransaction_userId_createdAt_idx" ON "PointTransaction"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "PointTransaction_type_createdAt_idx" ON "PointTransaction"("type", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "LearningActivity_sourceKey_key" ON "LearningActivity"("sourceKey");

-- CreateIndex
CREATE INDEX "LearningActivity_userId_activityDate_idx" ON "LearningActivity"("userId", "activityDate");

-- CreateIndex
CREATE INDEX "LearningActivity_activityType_createdAt_idx" ON "LearningActivity"("activityType", "createdAt");

-- AddForeignKey
ALTER TABLE "AiAssessment" ADD CONSTRAINT "AiAssessment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiAssessment" ADD CONSTRAINT "AiAssessment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointTransaction" ADD CONSTRAINT "PointTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointTransaction" ADD CONSTRAINT "PointTransaction_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningActivity" ADD CONSTRAINT "LearningActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningActivity" ADD CONSTRAINT "LearningActivity_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;
