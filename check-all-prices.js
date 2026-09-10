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

async function auditPrices() {
  const shops = await prisma.shop.findMany();
  let shop = shops.find(s => s.id.toLowerCase().includes('3924fc6c'));
  if (!shop && shops.length > 0) shop = shops[0];
  if (!shop) throw new Error('No shop found in database!');

  console.log(`\n======================================================`);
  console.log(`PRICING AUDIT FOR SHOP: ${shop.name} (${shop.id})`);
  console.log(`======================================================\n`);

  const products = await prisma.product.findMany({
    where: { tenantId: shop.id },
    include: { category: true },
    orderBy: { createdAt: 'asc' },
  });

  const zeroPriceProds = [];
  const baselineProds = [];
  const batch1Prods = [];
  const batch2Prods = [];
  const batch3Prods = [];
  const batch4Prods = [];

  products.forEach(p => {
    const price = Number(p.sellingPrice || 0);
    const skuNum = p.sku ? parseInt(p.sku.replace('SKU_', ''), 10) : 0;

    if (price === 0) zeroPriceProds.push(p);

    if (skuNum >= 1 && skuNum <= 63) baselineProds.push(p);
    else if (skuNum >= 76 && skuNum <= 146) batch1Prods.push(p);
    else if (skuNum >= 147 && skuNum <= 201) batch2Prods.push(p);
    else if (skuNum >= 202 && skuNum <= 260) batch3Prods.push(p);
    else if (skuNum >= 261) batch4Prods.push(p);
  });

  console.log(`Products with Rs. 0 Price: ${zeroPriceProds.length}`);
  if (zeroPriceProds.length > 0) {
    zeroPriceProds.forEach(p => console.log(`  - ${p.sku}: ${p.name}`));
  }

  console.log(`\n--- PRICE DISTRIBUTION BREAKDOWN ---`);
  console.log(`Baseline Products (SKU_001 - SKU_063): ${baselineProds.length} products`);
  console.log(`Batch 1 Products (SKU_076 - SKU_146): ${batch1Prods.length} products (Avg Price: Rs. ${Math.round(batch1Prods.reduce((a,b)=>a+Number(b.sellingPrice),0)/(batch1Prods.length||1))})`);
  console.log(`Batch 2 Products (SKU_147 - SKU_201): ${batch2Prods.length} products (Avg Price: Rs. ${Math.round(batch2Prods.reduce((a,b)=>a+Number(b.sellingPrice),0)/(batch2Prods.length||1))})`);
  console.log(`Batch 3 Products (SKU_202 - SKU_260): ${batch3Prods.length} products (Avg Price: Rs. ${Math.round(batch3Prods.reduce((a,b)=>a+Number(b.sellingPrice),0)/(batch3Prods.length||1))})`);
  console.log(`Batch 4 Products (SKU_261 - SKU_318): ${batch4Prods.length} products (Avg Price: Rs. ${Math.round(batch4Prods.reduce((a,b)=>a+Number(b.sellingPrice),0)/(batch4Prods.length||1))})`);

  console.log(`\n--- SAMPLE PRICES FOR BATCH 1 (SKU_076 to SKU_146) ---`);
  batch1Prods.slice(0, 15).forEach(p => {
    console.log(`  ${p.sku}: ${p.name} -> Selling Price: Rs. ${p.sellingPrice}, Cost: Rs. ${p.purchasePrice}`);
  });
}

auditPrices()
  .catch(console.error)
  .finally(() => {
    prisma.$disconnect();
    if (pool) pool.end();
  });
