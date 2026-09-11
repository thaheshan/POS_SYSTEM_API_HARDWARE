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

// ─────────────────────────────────────────────────────────────────────────────
// BATCH 23 ROLLBACK — Undo accidental double-run of batch 23
// Deducts the exact quantities that were added in the second (accidental) run
// Source: actual terminal output of the second batch 23 run
// ─────────────────────────────────────────────────────────────────────────────
const deductions = [
  { sku: 'HKU_1461', deduct: 1  },
  { sku: 'HKU_1462', deduct: 9  },
  { sku: 'HKU_1463', deduct: 20 },
  { sku: 'HKU_1464', deduct: 25 },
  { sku: 'HKU_1465', deduct: 15 },
  { sku: 'HKU_1466', deduct: 10 },
  { sku: 'HKU_1467', deduct: 16 },
  { sku: 'HKU_1468', deduct: 11 },
  { sku: 'HKU_1469', deduct: 16 },
  { sku: 'HKU_1470', deduct: 10 },
  { sku: 'HKU_1471', deduct: 1  },
  { sku: 'HKU_1472', deduct: 18 },
  { sku: 'HKU_1473', deduct: 6  },
  { sku: 'HKU_1474', deduct: 12 },
  { sku: 'HKU_1475', deduct: 8  },
  { sku: 'HKU_1476', deduct: 8  },
  { sku: 'HKU_1477', deduct: 1  },
  { sku: 'HKU_1478', deduct: 4  },
  { sku: 'HKU_1479', deduct: 15 },
  { sku: 'HKU_1480', deduct: 52 },
  { sku: 'HKU_1481', deduct: 16 },
  { sku: 'HKU_1482', deduct: 1  },
  { sku: 'HKU_1483', deduct: 46 },
  { sku: 'HKU_1484', deduct: 43 },
  { sku: 'HKU_1485', deduct: 1  },
  { sku: 'HKU_1486', deduct: 3  },
  { sku: 'HKU_1487', deduct: 15 },
  { sku: 'HKU_1488', deduct: 4  },
  { sku: 'HKU_1489', deduct: 9  },
  { sku: 'HKU_1490', deduct: 1  },
  { sku: 'HKU_1491', deduct: 1  },
  { sku: 'HKU_1492', deduct: 10 },
];

async function rollbackBatch23() {
  console.log('🔄 BATCH 23 ROLLBACK — Undoing accidental double-run...\n');

  const shops = await prisma.shop.findMany();
  let shop = shops.find(s => s.id.toLowerCase().includes('3924fc6c'));
  if (!shop && shops.length > 0) shop = shops[0];
  if (!shop) throw new Error('❌ No shop found!');
  console.log(`✅ Shop: ${shop.name}\n`);

  let fixed = 0;
  let skipped = 0;

  for (const { sku, deduct } of deductions) {
    const product = await prisma.product.findFirst({
      where: { sku, tenantId: shop.id },
    });

    if (!product) {
      console.log(`[SKIP]   ${sku} — product not found`);
      skipped++;
      continue;
    }

    const stock = await prisma.stock.findFirst({
      where: { productId: product.id, tenantId: shop.id },
    });

    if (!stock) {
      console.log(`[SKIP]   ${sku} — no stock record`);
      skipped++;
      continue;
    }

    const currentQty   = Number(stock.quantity);
    const currentAvail = Number(stock.availableQuantity ?? stock.quantity);
    const newQty       = Math.max(0, currentQty - deduct);
    const newAvail     = Math.max(0, currentAvail - deduct);

    await prisma.stock.update({
      where: { id: stock.id },
      data: { quantity: newQty, availableQuantity: newAvail },
    });

    console.log(`[FIXED]  ${sku.padEnd(10)} | ${currentQty} → ${newQty} qty (deducted ${deduct}) | ${product.name}`);
    fixed++;
  }

  console.log(`\n==============================================`);
  console.log(`✅ ROLLBACK COMPLETE!`);
  console.log(`✔  Fixed:   ${fixed} products`);
  console.log(`⚠️  Skipped: ${skipped} products`);
  console.log(`==============================================\n`);
}

rollbackBatch23()
  .catch(e => {
    console.error('❌ Rollback failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    if (prisma) await prisma.$disconnect();
    if (pool) await pool.end();
  });
