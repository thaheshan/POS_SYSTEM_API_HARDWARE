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

// Market price dictionary for common Sri Lanka PVC fittings & baseline items
const priceFixes = [
  { keywords: ['20mm socket'], price: 35, cost: 25 },
  { keywords: ['25mm socket', '25 mm socket'], price: 45, cost: 32 },
  { keywords: ['50mm socket', '50 mm socket'], price: 110, cost: 80 },
  { keywords: ['20mm elbow', '20 mm elbow'], price: 40, cost: 28 },
  { keywords: ['25mm elbow', '25 mm elbow'], price: 65, cost: 45 },
  { keywords: ['50mm elbow', '50 mm elbow'], price: 180, cost: 130 },
  { keywords: ['20mm tee', '20 mm tee'], price: 50, cost: 35 },
  { keywords: ['25mm tee', '25 mm tee'], price: 75, cost: 52 },
  { keywords: ['50mm tee', '50 mm tee'], price: 210, cost: 150 },
  { keywords: ['end cap', 'cap'], price: 30, cost: 20 },
  { keywords: ['ball valve'], price: 350, cost: 250 },
  { keywords: ['thread seal'], price: 95, cost: 65 },
  { keywords: ['horse pype', 'pipe'], price: 2200, cost: 1600 },
];

async function fixZeroPrices() {
  const shops = await prisma.shop.findMany();
  let shop = shops.find(s => s.id.toLowerCase().includes('3924fc6c'));
  if (!shop && shops.length > 0) shop = shops[0];
  if (!shop) throw new Error('No shop found in database!');

  console.log(`Auditing baseline Rs.0 price items for Shop ${shop.id}...`);

  const products = await prisma.product.findMany({
    where: { tenantId: shop.id },
    include: { stocks: true },
    orderBy: { createdAt: 'asc' },
  });

  const zeroPriceProducts = products.filter(p => Number(p.sellingPrice || 0) === 0 || Number(p.purchasePrice || 0) === 0);

  console.log(`\nFound ${zeroPriceProducts.length} baseline products with Rs. 0 price/cost:`);

  if (zeroPriceProducts.length === 0) {
    console.log('🎉 No Rs. 0 price products found! All items have valid unit prices.');
    return;
  }

  let updatedCount = 0;

  for (const prod of zeroPriceProducts) {
    const nameLower = prod.name.toLowerCase();
    let matchedFix = priceFixes.find(fix => fix.keywords.some(kw => nameLower.includes(kw)));

    let newSelling = matchedFix ? matchedFix.price : 60;
    let newCost = matchedFix ? matchedFix.cost : 40;

    await prisma.product.update({
      where: { id: prod.id },
      data: {
        sellingPrice: newSelling,
        purchasePrice: newCost,
      },
    });

    updatedCount++;
    console.log(`✅ Updated ${prod.sku} - "${prod.name}": Set Unit Cost = Rs. ${newCost}, Selling Price = Rs. ${newSelling}`);
  }

  console.log(`\n🎉 SUCCESSFULLY FIXED ALL ${updatedCount} ZERO-PRICE BASELINE PRODUCTS!`);
}

fixZeroPrices()
  .catch(console.error)
  .finally(() => {
    prisma.$disconnect();
    if (pool) pool.end();
  });
