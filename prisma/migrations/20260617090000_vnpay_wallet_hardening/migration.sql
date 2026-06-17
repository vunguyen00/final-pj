CREATE TABLE "Wallet" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "balance" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Wallet_userId_key" ON "Wallet"("userId");

ALTER TABLE "Wallet"
ADD CONSTRAINT "Wallet_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Payment"
ADD COLUMN "userId" TEXT,
ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'VNPAY',
ADD COLUMN "txnRef" TEXT,
ADD COLUMN "orderInfo" TEXT,
ADD COLUMN "bankCode" TEXT,
ADD COLUMN "transactionNo" TEXT,
ADD COLUMN "responseCode" TEXT,
ADD COLUMN "transactionStatus" TEXT,
ADD COLUMN "payDate" TEXT,
ADD COLUMN "rawResponse" JSONB,
ADD COLUMN "updatedAt" TIMESTAMP(3);

UPDATE "Payment" AS p
SET
  "userId" = o."userId",
  "txnRef" = o."id",
  "orderInfo" = CONCAT('Legacy VNPAY top-up ', o."id"),
  "updatedAt" = p."createdAt"
FROM "Order" AS o
WHERE p."orderId" = o."id";

UPDATE "Payment"
SET
  "txnRef" = "id",
  "updatedAt" = COALESCE("updatedAt", "createdAt")
WHERE "txnRef" IS NULL OR "updatedAt" IS NULL;

ALTER TABLE "Payment"
ALTER COLUMN "userId" SET NOT NULL,
ALTER COLUMN "txnRef" SET NOT NULL,
ALTER COLUMN "updatedAt" SET NOT NULL,
ALTER COLUMN "orderId" DROP NOT NULL,
ALTER COLUMN "amount" TYPE INTEGER USING ROUND("amount")::INTEGER;

CREATE UNIQUE INDEX "Payment_txnRef_key" ON "Payment"("txnRef");
CREATE INDEX "Payment_userId_createdAt_idx" ON "Payment"("userId", "createdAt");
CREATE INDEX "Payment_status_createdAt_idx" ON "Payment"("status", "createdAt");

ALTER TABLE "Payment"
ADD CONSTRAINT "Payment_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "Wallet" ("id", "userId", "balance", "createdAt", "updatedAt")
SELECT
  CONCAT('wallet_', u."id"),
  u."id",
  COALESCE(p."totalTopUp", 0) - COALESCE(oi."totalSpent", 0),
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "User" AS u
LEFT JOIN (
  SELECT "userId", SUM("amount")::INTEGER AS "totalTopUp"
  FROM "Payment"
  WHERE "status" = 'SUCCESS'
  GROUP BY "userId"
) AS p ON p."userId" = u."id"
LEFT JOIN (
  SELECT o."userId", ROUND(SUM(oi."price"))::INTEGER AS "totalSpent"
  FROM "OrderItem" AS oi
  INNER JOIN "Order" AS o ON o."id" = oi."orderId"
  GROUP BY o."userId"
) AS oi ON oi."userId" = u."id"
ON CONFLICT ("userId") DO NOTHING;
