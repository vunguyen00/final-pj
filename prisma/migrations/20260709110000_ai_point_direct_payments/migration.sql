ALTER TABLE "Payment"
  ADD COLUMN "purpose" TEXT,
  ADD COLUMN "pointAmount" INTEGER;

CREATE INDEX "Payment_purpose_createdAt_idx" ON "Payment"("purpose", "createdAt");
