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

// Standard market prices for PVC fittings & hardware items
const marketPriceMap = [
  { keywords: ['20mm socket', '20 mm socket'], selling: 35, cost: 25 },
  { keywords: ['25mm socket', '25 mm socket'], selling: 45, cost: 32 },
  { keywords: ['50mm socket', '50 mm socket'], selling: 110, cost: 80 },
  { keywords: ['110mm socket', '110 mm socket', '4" socket'], selling: 450, cost: 320 },
  
  { keywords: ['20mm elbow', '20 mm elbow'], selling: 40, cost: 28 },
  { keywords: ['25mm elbow', '25 mm elbow'], selling: 65, cost: 45 },
  { keywords: ['50mm elbow', '50 mm elbow'], selling: 180, cost: 130 },
  { keywords: ['110mm elbow', '110 mm elbow', '4" elbow'], selling: 580, cost: 420 },

  { keywords: ['20mm tee', '20 mm tee'], selling: 50, cost: 35 },
  { keywords: ['25mm tee', '25 mm tee'], selling: 75, cost: 52 },
  { keywords: ['50mm tee', '50 mm tee'], selling: 210, cost: 150 },

  { keywords: ['20mm cap', '20mm end cap', 'cap'], selling: 30, cost: 20 },
  { keywords: ['25mm cap', '25mm end cap'], selling: 40, cost: 28 },

  { keywords: ['ball valve 20mm', 'ball valve 1/2"'], selling: 350, cost: 250 },
  { keywords: ['ball valve 25mm', 'ball valve 3/4"'], selling: 480, cost: 340 },
  { keywords: ['ball valve 32mm', 'ball valve 1"'], selling: 650, cost: 460 },
  { keywords: ['ball valve 40mm', 'ball valve 1 1/4"'], selling: 850, cost: 600 },
  { keywords: ['ball valve 50mm', 'ball valve 1 1/2"'], selling: 1200, cost: 850 },

  { keywords: ['thread seal'], selling: 95, cost: 65 },
  { keywords: ['horse pype 16mm'], selling: 1800, cost: 1300 },
  { keywords: ['horse pype 20mm'], selling: 2200, cost: 1600 },
  { keywords: ['horse pype 25mm'], selling: 2800, cost: 2000 },
];

async function fix1000PlaceholderPrices() {
  const shops = await prisma.shop.findMany();
  let shop = shops.find(s => s.id.toLowerCase().includes('3924fc6c'));
  if (!shop && shops.length > 0) shop = shops[0];
  if (!shop) throw new Error('No shop found in database!');

  console.log(`Auditing products with Rs. 1,000 placeholder prices for Shop ${shop.id}...`);

  const products = await prisma.product.findMany({
    where: { tenantId: shop.id },
    include: { category: true },
    orderBy: { createdAt: 'asc' },
  });

  const placeholderProducts = products.filter(p => Number(p.sellingPrice) === 1000 || Number(p.purchasePrice) === 1000);

  console.log(`\nFound ${placeholderProducts.length} products with Rs. 1,000 placeholder prices:`);

  if (placeholderProducts.length === 0) {
    console.log('🎉 No products with Rs. 1,000 placeholder price found! All prices are clean.');
    return;
  }

  let fixedCount = 0;

  for (const prod of placeholderProducts) {
    const nameLower = prod.name.toLowerCase();
    const matchedFix = marketPriceMap.find(fix => fix.keywords.some(kw => nameLower.includes(kw)));

    let newSelling = matchedFix ? matchedFix.selling : 120;
    let newCost = matchedFix ? matchedFix.cost : 80;

    await prisma.product.update({
      where: { id: prod.id },
      data: {
        sellingPrice: newSelling,
        purchasePrice: newCost,
      },
    });

    fixedCount++;
    console.log(`✅ Fixed ${prod.sku} - "${prod.name}": Changed Rs. 1,000 -> Selling: Rs. ${newSelling}, Cost: Rs. ${newCost}`);
  }

  console.log(`\n🎉 SUCCESSFULLY CORRECTED ALL ${fixedCount} PLACEHOLDER Rs. 1,000 PRODUCTS!`);
}

fix1000PlaceholderPrices()
  .catch(console.error)
  .finally(() => {
    prisma.$disconnect();
    if (pool) pool.end();
  });
