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

async function fixMeasurementUnits() {
  console.log('🚀 Standardizing & Fixing Product Measurement Units...\n');

  const shops = await prisma.shop.findMany();
  let shop = shops.find(s => s.id.toLowerCase().includes('3924fc6c'));
  if (!shop && shops.length > 0) shop = shops[0];
  if (!shop) throw new Error('❌ No shop found in database!');
  console.log(`✅ Using Shop: ${shop.name} (${shop.id})`);

  const products = await prisma.product.findMany({
    where: { tenantId: shop.id },
    select: { id: true, name: true, sku: true, measurementUnit: true },
  });

  let nullFixedCount = 0;
  let dimensionFixedCount = 0;

  for (const p of products) {
    const currentUnit = p.measurementUnit ? p.measurementUnit.trim() : null;
    const nameLower = p.name.toLowerCase();

    // 1. Check if unit is null or empty
    if (!currentUnit || currentUnit === 'MISSING') {
      let targetUnit = 'pcs';
      if (nameLower.includes('tape') || nameLower.includes('cable') || nameLower.includes('wire')) {
        targetUnit = 'roll';
      } else if (nameLower.includes('paint') || nameLower.includes('primer') || nameLower.includes('lacquer') || nameLower.includes('varnish')) {
        if (nameLower.includes('4l')) targetUnit = '4L';
        else if (nameLower.includes('20l')) targetUnit = '20L';
        else if (nameLower.includes('1l')) targetUnit = '1L';
        else if (nameLower.includes('500ml')) targetUnit = '500ml';
        else targetUnit = 'pcs';
      } else if (nameLower.includes('box') && !nameLower.includes('sunk box') && !nameLower.includes('junction box')) {
        targetUnit = 'box';
      }

      await prisma.product.update({
        where: { id: p.id },
        data: { measurementUnit: targetUnit },
      });
      nullFixedCount++;
      console.log(`[FIX NULL]  ${p.sku.padEnd(9)} | Set unit -> "${targetUnit}" | ${p.name}`);
    } 
    // 2. Check if unit contains dimension text like 2" (50mm), 3" (76mm), etc.
    else if (currentUnit.includes('"') || currentUnit.includes('mm)') || currentUnit.includes('5""')) {
      await prisma.product.update({
        where: { id: p.id },
        data: { measurementUnit: 'pcs' },
      });
      dimensionFixedCount++;
      console.log(`[FIX DIM]   ${p.sku.padEnd(9)} | Changed "${currentUnit}" -> "pcs" | ${p.name}`);
    }
  }

  console.log(`\n🎉 MEASUREMENT UNITS CLEANUP COMPLETE!`);
  console.log(`   ✅ Fixed Null/Missing Units : ${nullFixedCount}`);
  console.log(`   ✅ Fixed Dimension Units    : ${dimensionFixedCount}`);
}

fixMeasurementUnits()
  .catch(e => console.error('❌ Error fixing units:', e))
  .finally(() => {
    prisma.$disconnect();
    if (pool) pool.end();
  });
