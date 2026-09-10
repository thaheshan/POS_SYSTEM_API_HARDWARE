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

async function standardizeEnclosureCategories() {
  const shops = await prisma.shop.findMany();
  let shop = shops.find(s => s.id.toLowerCase().includes('3924fc6c'));
  if (!shop && shops.length > 0) shop = shops[0];
  if (!shop) throw new Error('No shop found in database!');

  console.log(`Standardizing enclosure & switch box categories for Shop ${shop.id}...`);

  // Ensure 'Electronics' Category exists
  let electronicsCat = await prisma.category.findFirst({
    where: { tenantId: shop.id, name: { equals: 'Electronics', mode: 'insensitive' }, parentId: null },
  });

  if (!electronicsCat) {
    electronicsCat = await prisma.category.create({
      data: { tenantId: shop.id, name: 'Electronics' },
    });
  }

  // Ensure 'Switch Boxes' Subcategory exists under Electronics
  let switchBoxesSub = await prisma.category.findFirst({
    where: { tenantId: shop.id, name: { equals: 'Switch Boxes', mode: 'insensitive' }, parentId: electronicsCat.id },
  });

  if (!switchBoxesSub) {
    switchBoxesSub = await prisma.category.create({
      data: { tenantId: shop.id, name: 'Switch Boxes', parentId: electronicsCat.id },
    });
  }

  // Fetch all enclosure & switch box products
  const products = await prisma.product.findMany({
    where: { tenantId: shop.id },
  });

  const enclosureKeywords = ['sunk box', 'switch box', 'enclosure', 'mcb enclosure', 'abc enclosure', 'mounting box'];

  let updatedCount = 0;

  for (const prod of products) {
    const nameLower = prod.name.toLowerCase();
    const isEnclosure = enclosureKeywords.some(kw => nameLower.includes(kw));

    if (isEnclosure && (prod.categoryId !== electronicsCat.id || prod.subcategoryId !== switchBoxesSub.id)) {
      await prisma.product.update({
        where: { id: prod.id },
        data: {
          categoryId: electronicsCat.id,
          subcategoryId: switchBoxesSub.id,
        },
      });

      updatedCount++;
      console.log(`✅ Standardized ${prod.sku} - "${prod.name}": Set Category -> Electronics > Switch Boxes`);
    }
  }

  console.log(`\n🎉 SUCCESSFULLY STANDARDIZED ALL ${updatedCount} SWITCH BOXES & ENCLOSURES UNDER "Electronics > Switch Boxes"!`);
}

standardizeEnclosureCategories()
  .catch(console.error)
  .finally(() => {
    prisma.$disconnect();
    if (pool) pool.end();
  });
