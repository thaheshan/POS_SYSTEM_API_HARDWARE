import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  const products = await prisma.product.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      name: true,
      sellType: true,
      measurementUnit: true
    }
  });
  console.log(JSON.stringify(products, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => process.exit(0));
