CREATE TYPE "CourseRefundRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "CourseRefundRequest" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "CourseRefundRequestStatus" NOT NULL DEFAULT 'PENDING',
    "adminNote" TEXT,
    "reviewedById" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseRefundRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CourseRefundRequest_orderItemId_key" ON "CourseRefundRequest"("orderItemId");
CREATE INDEX "CourseRefundRequest_studentId_createdAt_idx" ON "CourseRefundRequest"("studentId", "createdAt");
CREATE INDEX "CourseRefundRequest_courseId_createdAt_idx" ON "CourseRefundRequest"("courseId", "createdAt");
CREATE INDEX "CourseRefundRequest_status_createdAt_idx" ON "CourseRefundRequest"("status", "createdAt");

ALTER TABLE "CourseRefundRequest"
ADD CONSTRAINT "CourseRefundRequest_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CourseRefundRequest"
ADD CONSTRAINT "CourseRefundRequest_courseId_fkey"
FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CourseRefundRequest"
ADD CONSTRAINT "CourseRefundRequest_orderItemId_fkey"
FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CourseRefundRequest"
ADD CONSTRAINT "CourseRefundRequest_reviewedById_fkey"
FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
