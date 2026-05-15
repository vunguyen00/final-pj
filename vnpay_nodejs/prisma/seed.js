const prisma = require('../services/prisma');

async function seed() {
  const count = await prisma.order.count();
  if (count > 0) {
    console.log('Seed skipped: orders already exist');
    return;
  }

  await prisma.order.createMany({
    data: [
      {
        orderCode: 'FAKE-' + Date.now(),
        amount: 10000,
        description: 'Fake order for VNPAY sandbox test #1',
        status: 'PENDING',
        locale: 'vn'
      },
      {
        orderCode: 'FAKE-' + (Date.now() + 1),
        amount: 25000,
        description: 'Fake order for VNPAY sandbox test #2',
        status: 'PENDING',
        locale: 'vn'
      }
    ]
  });

  console.log('Seed completed: fake sandbox orders created');
}

seed()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
