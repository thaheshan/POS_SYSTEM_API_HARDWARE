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

async function rollbackBatch3() {
  console.log(`Starting rollback for Batch 3 products...`);

  const shops = await prisma.shop.findMany();
  let shop = shops.find(s => s.id.toLowerCase().includes('3924fc6c'));
  if (!shop && shops.length > 0) shop = shops[0];

  const batch3Names = [
    'LED Ice Cube 12W Square / Round Warm White',
    'ECO LED 7W Warm White',
    'ECO LED 7W Daylight',
    'Stick LED 9W Warm White',
    'Stick LED 7W Daylight',
    'LED Candle Bulb 5W Warm White',
    'LED Candle Bulb 5W Daylight',
    'Sunco Decorative Flower Ceiling Rose',
    'LED Colouring Panel Light 18W + 6W',
    'LED Bubble Panel Surface Round 18W + 6W',
    'LED Ultra Down Light 18W',
    'ABC Enclosure Type 1019',
    'ABC Enclosure Surface Mount 15-Way',
    'ABC Enclosure 12-Way',
    'ABC Enclosure Surface Mount 12-Way',
    'ABC Enclosure 15-Way',
    'ABC Enclosure Type 900',
    'ABC Enclosure 10-Way Surface Mount',
    'ABC Enclosure 36-Way Surface Mount',
    'ABC Enclosure 36-Way Flush Mount',
    'Heavy Duty Joint Pins (Package)',
    'Branca Velvet Water Paper 100G',
    'Nippon Sanding Sealer T 4L',
  ];

  const productsToDelete = await prisma.product.findMany({
    where: {
      tenantId: shop.id,
      OR: [
        { name: { in: batch3Names } },
        { name: { startsWith: 'Berlux Enamel Paint' } },
        { name: { startsWith: 'Berlux 3-in-1 Wood' } },
        { name: { startsWith: 'Berlux Wood Stainer' } },
        { name: { startsWith: 'Berlux Floor Guard' } },
        { name: { startsWith: 'Berlux Weather Guard' } },
        { name: { startsWith: 'Berlux G.L.S. Enamel' } },
        { name: { startsWith: 'Berlex' } },
      ],
    },
  });

  const productIds = productsToDelete.map(p => p.id);
  console.log(`Found ${productIds.length} Batch 3 products to delete.`);

  if (productIds.length === 0) {
    console.log('No Batch 3 products found.');
    return;
  }

  await prisma.stock.deleteMany({ where: { productId: { in: productIds } } });
  await prisma.product.deleteMany({ where: { id: { in: productIds } } });

  console.log(`✅ Successfully reverted Batch 3 products.`);
}

rollbackBatch3()
  .catch(console.error)
  .finally(() => {
    prisma.$disconnect();
    if (pool) pool.end();
  });
