require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

let prisma;
let pool;
try {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  const adapter = new PrismaPg(pool);
  prisma = new PrismaClient({ adapter });
} catch (e) {
  prisma = new PrismaClient();
}

async function rollbackBatch2() {
  console.log(`Starting rollback for Batch 2 products...`);

  const shops = await prisma.shop.findMany();
  let shop = shops.find(s => s.id.toLowerCase().includes('3924fc6c'));
  if (!shop && shops.length > 0) shop = shops[0];

  const batch2Names = [
    'Robbialac Exterior Paint Willow Grey 4L',
    'Robbialac Exterior Paint Bamboo 4L',
    'Robbialac Exterior Paint Off White 4L',
    'Nippon Paint Brush 4"',
    'LED & Solar Street Light',
    'Manual Tile Cutter 20"',
    'Havells Ventilator Fan 250mm',
    'Concrete Nail 4.0 x 65mm Patta (500g Pack)',
    'S-lon Thread Seal Tape 12mm x 0.075mm x 10m',
    'S-lon Thread Seal Tape 25mm x 0.075mm x 10m',
    'Rapsel Sanitaryware Wash Basin',
    'Switch Box 4-Way Enclosure',
    'Premium Handmade Kitchen Sink',
    'Waterproof Bathroom Door (PVC/Composite)',
  ];

  const productsToDelete = await prisma.product.findMany({
    where: {
      tenantId: shop.id,
      OR: [
        { name: { in: batch2Names } },
        { name: { startsWith: 'Robbialac Interior Paint' } },
        { name: { startsWith: 'Robbialac Wallmaster' } },
        { name: { startsWith: 'Berlux' } },
        { name: { startsWith: 'Berlex' } },
      ],
    },
  });

  const productIds = productsToDelete.map(p => p.id);
  console.log(`Found ${productIds.length} Batch 2 products to delete.`);

  if (productIds.length === 0) {
    console.log('No Batch 2 products found.');
    return;
  }

  await prisma.stock.deleteMany({ where: { productId: { in: productIds } } });
  await prisma.product.deleteMany({ where: { id: { in: productIds } } });

  console.log(`✅ Successfully reverted Batch 2 products.`);
}

rollbackBatch2()
  .catch(console.error)
  .finally(() => {
    prisma.$disconnect();
    if (pool) pool.end();
  });
