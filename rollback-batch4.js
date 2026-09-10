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

async function rollbackBatch4() {
  console.log(`Starting rollback for Batch 4 products...`);

  const shops = await prisma.shop.findMany();
  let shop = shops.find(s => s.id.toLowerCase().includes('3924fc6c'));
  if (!shop && shops.length > 0) shop = shops[0];

  const batch4Names = [
    'Double Burner Stainless Steel Gas Cooker',
    'Heavy Duty Petrol Grass Cutter Machine',
    'Crocodile Threaded Mammoties Hoe',
    'Hammer Tongs 3-Piece Set (Flora Vels)',
    'LED Creative UFO Lamp 50W',
    'Kobe Angle Grinder 850W',
    'Husky Heavy Duty Brass Float Valve',
    'Electric Water Heater 10L',
    'LGL LED Panel Light 48W 6500K (595x595mm 2x2 Grid)',
    'Husky Square Junction Box 4x4 (Black)',
    'Nippon Oxford Window Fastener Right',
    'Nippon Window Fastener Left',
    'Nippon Heavy Duty Casement Stay 9"',
  ];

  const productsToDelete = await prisma.product.findMany({
    where: {
      tenantId: shop.id,
      OR: [
        { name: { in: batch4Names } },
        { name: { startsWith: 'High Quality Waterproof Sanding' } },
        { name: { startsWith: 'Sandease Coarse' } },
        { name: { startsWith: 'Berlux Easy Coat Zinc' } },
        { name: { startsWith: 'Polycrome' } },
        { name: { startsWith: 'Standard Pendant' } },
        { name: { startsWith: 'Protect Deep Single' } },
        { name: { startsWith: 'Sunk Switch' } },
        { name: { startsWith: 'Deluxe Switch' } },
        { name: { startsWith: 'Sunk Mounting' } },
        { name: { startsWith: 'Orange 10-Way Sunk' } },
        { name: { startsWith: 'ABC MCB Enclosure' } },
        { name: { startsWith: 'Kevilton Plastic' } },
        { name: { startsWith: 'Yashodha Ceiling Rose' } },
        { name: { startsWith: 'Waterproof Toilet LED' } },
        { name: { startsWith: 'Toota Waterproof' } },
        { name: { startsWith: 'Single Switch Mounting' } },
      ],
    },
  });

  const productIds = productsToDelete.map(p => p.id);
  console.log(`Found ${productIds.length} Batch 4 products to delete.`);

  if (productIds.length === 0) {
    console.log('No Batch 4 products found.');
    return;
  }

  await prisma.stock.deleteMany({ where: { productId: { in: productIds } } });
  await prisma.product.deleteMany({ where: { id: { in: productIds } } });

  console.log(`✅ Successfully reverted Batch 4 products.`);
}

rollbackBatch4()
  .catch(console.error)
  .finally(() => {
    prisma.$disconnect();
    if (pool) pool.end();
  });
