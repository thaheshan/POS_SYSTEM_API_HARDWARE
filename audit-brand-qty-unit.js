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

function stringSimilarity(s1, s2) {
  const str1 = s1.toLowerCase().trim();
  const str2 = s2.toLowerCase().trim();
  if (str1 === str2) return 1.0;
  
  const longer = str1.length > str2.length ? str1 : str2;
  if (longer.length === 0) return 1.0;
  
  let costs = [];
  for (let i = 0; i <= str1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= str2.length; j++) {
      if (i === 0) costs[j] = j;
      else if (j > 0) {
        let newValue = costs[j - 1];
        if (str1.charAt(i - 1) !== str2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[str2.length] = lastValue;
  }
  return (longer.length - costs[str2.length]) / parseFloat(longer.length);
}

async function auditBrandsQuantitiesUnits() {
  console.log('🔍 Comprehensive Audit: Brands, Quantities & Measurement Units...\n');

  const shops = await prisma.shop.findMany();
  let shop = shops.find(s => s.id.toLowerCase().includes('3924fc6c'));
  if (!shop && shops.length > 0) shop = shops[0];
  if (!shop) throw new Error('❌ No shop found in database!');

  const products = await prisma.product.findMany({
    where: { tenantId: shop.id },
    include: { brand: true, category: true, subCategory: true, stocks: true },
    orderBy: { sku: 'asc' },
  });

  const brands = await prisma.brand.findMany({ where: { tenantId: shop.id } });
  console.log(`📦 Total Active Products: ${products.length}`);
  console.log(`🏷️ Total Unique Brands: ${brands.length}\n`);

  // 1. BRAND TYPO CHECK
  console.log('════════════════════════════════════════════════════════════');
  console.log('1. BRAND NAME TYPOS OR SIMILAR BRAND NAMES');
  console.log('════════════════════════════════════════════════════════════');
  const brandNames = brands.map(b => b.name);
  let brandTypoCount = 0;
  for (let i = 0; i < brandNames.length; i++) {
    for (let j = i + 1; j < brandNames.length; j++) {
      const b1 = brandNames[i];
      const b2 = brandNames[j];
      const sim = stringSimilarity(b1, b2);
      if (sim >= 0.75 && sim < 1.0) {
        brandTypoCount++;
        console.log(`⚠️ Similar Brand Names: "${b1}" <---> "${b2}" [Similarity: ${Math.round(sim * 100)}%]`);
      }
    }
  }
  if (brandTypoCount === 0) {
    console.log('✅ ZERO brand name typos or conflicting brand names found!');
  }

  // 2. UNUSUALLY HIGH OR ILLOGICAL QUANTITIES
  console.log('\n════════════════════════════════════════════════════════════');
  console.log('2. UNUSUALLY HIGH QUANTITIES (> 500 pcs/units)');
  console.log('════════════════════════════════════════════════════════════');
  let highQtyCount = 0;
  products.forEach(p => {
    const totalQty = p.stocks.reduce((sum, s) => sum + (s.quantity || 0), 0);
    if (totalQty >= 500) {
      highQtyCount++;
      const unitStr = (p.measurementUnit || 'pcs').padEnd(5);
      console.log(`📌 SKU: ${p.sku.padEnd(9)} | Qty: ${String(totalQty).padStart(5)} ${unitStr} | "${p.name}"`);
    }
  });
  if (highQtyCount === 0) {
    console.log('✅ No unusually high quantities found.');
  }

  // 3. MEASUREMENT UNITS AUDIT
  console.log('\n════════════════════════════════════════════════════════════');
  console.log('3. MEASUREMENT UNITS BREAKDOWN & INTEGRITY');
  console.log('════════════════════════════════════════════════════════════');
  const unitMap = new Map();
  products.forEach(p => {
    const u = p.measurementUnit || 'MISSING';
    unitMap.set(u, (unitMap.get(u) || 0) + 1);
  });

  unitMap.forEach((count, unitName) => {
    console.log(`  • Unit "${unitName}": ${count} products`);
  });

  console.log('\n🎉 COMPREHENSIVE AUDIT COMPLETE!');
}

auditBrandsQuantitiesUnits()
  .catch(e => console.error('❌ Error during audit:', e))
  .finally(() => {
    prisma.$disconnect();
    if (pool) pool.end();
  });
