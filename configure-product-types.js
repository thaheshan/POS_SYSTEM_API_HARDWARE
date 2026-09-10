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

async function configureProductTypes() {
  console.log('🚀 Configuring Product Types (FIX vs LOOSE) & Unit Price Structure...\n');

  const shops = await prisma.shop.findMany();
  let shop = shops.find(s => s.id.toLowerCase().includes('3924fc6c'));
  if (!shop && shops.length > 0) shop = shops[0];
  if (!shop) throw new Error('❌ No shop found in database!');
  console.log(`✅ Using Shop: ${shop.name} (${shop.id})`);

  const products = await prisma.product.findMany({
    where: { tenantId: shop.id },
  });

  let looseCount = 0;
  let fixCount = 0;

  for (const p of products) {
    const unit = (p.measurementUnit || '').toLowerCase();
    const name = p.name.toLowerCase();

    // Determine if product is LOOSE (measured by weight/length/volume rate) or FIX (countable)
    let targetSellType = 'FIX';

    if (
      unit === 'kg' ||
      unit === 'meter' ||
      unit === 'meters' ||
      unit === 'liter' ||
      unit === 'liters' ||
      name.includes('per meter') ||
      name.includes('per kg') ||
      (name.includes('horse pype') && !name.includes('roll'))
    ) {
      targetSellType = 'LOOSE';
      looseCount++;
    } else {
      targetSellType = 'FIX';
      fixCount++;
    }

    if (p.sellType !== targetSellType) {
      await prisma.product.update({
        where: { id: p.id },
        data: { sellType: targetSellType },
      });
      console.log(`[SELL TYPE] ${p.sku.padEnd(9)} | Changed ${p.sellType} -> ${targetSellType} | "${p.name}"`);
    }
  }

  console.log(`\n🎉 PRODUCT TYPE CONFIGURATION COMPLETE!`);
  console.log(`   📦 FIX Products (Countable / Pcs / Box / Roll) : ${fixCount}`);
  console.log(`   ⚖️ LOOSE Products (Measured Rate per Kg/Mtr/Ltr): ${looseCount}`);
}

configureProductTypes()
  .catch(e => console.error('❌ Error configuring product types:', e))
  .finally(() => {
    prisma.$disconnect();
    if (pool) pool.end();
  });
