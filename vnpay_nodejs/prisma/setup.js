const prisma = require('../services/prisma');

async function setup() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Order" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "orderCode" TEXT NOT NULL,
      "amount" INTEGER NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'PENDING',
      "description" TEXT,
      "bankCode" TEXT,
      "locale" TEXT NOT NULL DEFAULT 'vn',
      "vnpTransactionNo" TEXT,
      "responseCode" TEXT,
      "ipAddress" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "Order_orderCode_key" ON "Order"("orderCode");');

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "PaymentTransaction" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "orderId" INTEGER NOT NULL,
      "txnRef" TEXT NOT NULL,
      "amount" INTEGER NOT NULL,
      "responseCode" TEXT,
      "vnpTransactionNo" TEXT,
      "bankCode" TEXT,
      "status" TEXT NOT NULL DEFAULT 'PENDING',
      "rawPayload" TEXT,
      "source" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "PaymentTransaction_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
    );
  `);

  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "PaymentTransaction_txnRef_idx" ON "PaymentTransaction"("txnRef");');
  console.log('SQLite tables created/verified successfully');
}

setup()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
