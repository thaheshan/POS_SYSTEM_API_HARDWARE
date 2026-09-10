require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

let prisma;
try {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  const adapter = new PrismaPg(pool);
  prisma = new PrismaClient({ adapter });
} catch (e) {
  prisma = new PrismaClient();
}

const skuListToDelete = [];
for (let i = 76; i <= 200; i++) {
  skuListToDelete.push(`SKU_${String(i).padStart(3, '0')}`);
}

async function rollbackProducts() {
  console.log(`Starting rollback/revert for inserted products...`);

  const shops = await prisma.shop.findMany();
  let shop = shops.find(s => s.id.toLowerCase().includes('3924fc6c'));
  if (!shop && shops.length > 0) shop = shops[0];
  if (!shop) throw new Error('No shop found in database!');

  console.log(`Target Shop ID: ${shop.id}`);

  // Find products matching inserted SKUs
  const productsToDelete = await prisma.product.findMany({
    where: {
      tenantId: shop.id,
      sku: { in: skuListToDelete },
    },
  });

  const productIds = productsToDelete.map(p => p.id);
  console.log(`Found ${productIds.length} inserted products to revert/delete.`);

  if (productIds.length === 0) {
    console.log('No inserted products found to rollback. Database is clean.');
    return;
  }

  // Delete Stock records first
  const deletedStocks = await prisma.stock.deleteMany({
    where: {
      tenantId: shop.id,
      productId: { in: productIds },
    },
  });
  console.log(`Deleted ${deletedStocks.count} stock records.`);

  // Delete Products
  const deletedProducts = await prisma.product.deleteMany({
    where: {
      tenantId: shop.id,
      id: { in: productIds },
    },
  });
  console.log(`Deleted ${deletedProducts.count} product records.`);

  console.log('\n✅ ROLLBACK COMPLETE! All inserted products have been safely removed without affecting existing inventory.');
}

rollbackProducts()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
