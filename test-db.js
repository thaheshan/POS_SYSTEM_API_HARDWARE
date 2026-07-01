const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  console.log("Checking the last 3 created products in the database...");
  const products = await prisma.product.findMany({
    orderBy: { createdAt: 'desc' },
    take: 3,
    select: { name: true, sellType: true, measurementUnit: true }
  });
  console.table(products);
}

check().then(() => process.exit(0));
