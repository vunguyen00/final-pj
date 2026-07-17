-- Refunds are handled outside FinnCenter. Reverse credits created by approved
-- refunds before switching the policy, without making a legacy wallet negative.
WITH "RefundCredits" AS (
  SELECT "studentId", SUM("amount")::INTEGER AS "amount"
  FROM "CourseRefundRequest"
  WHERE "status" = 'APPROVED' AND "refundMethod" = 'STORE_CREDIT'
  GROUP BY "studentId"
)
UPDATE "Wallet" AS wallet
SET "balance" = GREATEST(0, wallet."balance" - credits."amount")
FROM "RefundCredits" AS credits
WHERE wallet."userId" = credits."studentId";

UPDATE "CourseRefundRequest"
SET "refundMethod" = 'EXTERNAL_ACCOUNT';

ALTER TABLE "CourseRefundRequest"
ALTER COLUMN "refundMethod" SET DEFAULT 'EXTERNAL_ACCOUNT';

-- All test types can be attempted without a business limit.
UPDATE "Test" SET "maxAttempts" = 2147483647;
