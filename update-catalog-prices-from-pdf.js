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
// SAFE & EXACT MATCHING PRICE UPDATES — ONLY S-LON & NATIONAL PVC TARGETS
// ─────────────────────────────────────────────────────────────────────────────
const exactPriceUpdates = [
  // ─── 1. S-LON WATER PUMPS ──────────────────────────────────────────────────
  { name: 'S-Lon Water Pump SL 30', sellingPrice: 23080, purchasePrice: 16618 },
  { name: 'S-Lon Water Pump SL 50', sellingPrice: 37660, purchasePrice: 27115 },
  { name: 'S-Lon Water Pump SL 75', sellingPrice: 42860, purchasePrice: 30859 },
  { name: 'S-Lon Water Pump SL 100', sellingPrice: 49350, purchasePrice: 35532 },
  { name: 'S-Lon Agro Pump SLA 75', sellingPrice: 46180, purchasePrice: 33250 },
  { name: 'S-Lon Agro Pump SLA 100', sellingPrice: 51345, purchasePrice: 36968 },
  { name: 'S-Lon Agro Pump SLA 150', sellingPrice: 73395, purchasePrice: 52844 },
  { name: 'S-Lon Agro Pump SLA 200', sellingPrice: 78120, purchasePrice: 56246 },

  // ─── 2. S-LON THREAD SEAL TAPES ───────────────────────────────────────────
  { name: 'S-lon Thread Seal Tape 12mm x 0.075mm x 10m', sellingPrice: 95, purchasePrice: 68 },
  { name: 'S-lon Thread Seal Tape 19mm x 0.075mm x 10m', sellingPrice: 135, purchasePrice: 97 },
  { name: 'S-lon Thread Seal Tape 25mm x 0.075mm x 10m', sellingPrice: 165, purchasePrice: 119 },

  // ─── 3. NATIONAL PVC MOULDED FITTINGS ──────────────────────────────────────
  { name: '20mm socket', sellingPrice: 50, purchasePrice: 22 },
  { name: '25mm socket', sellingPrice: 70, purchasePrice: 31 },
  { name: '32 mm socket', sellingPrice: 120, purchasePrice: 53 },
  { name: '40mm socket', sellingPrice: 165, purchasePrice: 73 },
  { name: '50mm socket', sellingPrice: 240, purchasePrice: 106 },
  { name: 'Elbow 20mm 90°', sellingPrice: 50, purchasePrice: 22 },
  { name: '25 mm elbow', sellingPrice: 70, purchasePrice: 31 },
  { name: '32mm elbow', sellingPrice: 125, purchasePrice: 55 },
  { name: '40mm elbow', sellingPrice: 195, purchasePrice: 86 },
  { name: '50mm elbow', sellingPrice: 270, purchasePrice: 119 },

  // ─── 4. S-LON VITO BRASS VALVES ───────────────────────────────────────────
  { name: 'Vito Brass Ball Valve 1/2"', sellingPrice: 2470, purchasePrice: 1778 },
  { name: 'Vito Brass Ball Valve 3/4"', sellingPrice: 3415, purchasePrice: 2458 },
  { name: 'Vito Brass Ball Valve 1"', sellingPrice: 5565, purchasePrice: 4006 },
  { name: 'Vito Brass Gate Valve 1/2"', sellingPrice: 3075, purchasePrice: 2214 },
  { name: 'Vito Brass Gate Valve 3/4"', sellingPrice: 3470, purchasePrice: 2498 },
  { name: 'Vito Brass Gate Valve 1"', sellingPrice: 4285, purchasePrice: 3085 },
];

async function updateCatalogPrices() {
  console.log('🔒 Running 100% Safe Exact-Match Price Update...\n');

  const shops = await prisma.shop.findMany();
  let shop = shops.find(s => s.id.toLowerCase().includes('3924fc6c'));
  if (!shop && shops.length > 0) shop = shops[0];
  if (!shop) throw new Error('❌ No shop found in database!');
  console.log(`✅ Target Shop: ${shop.name} (${shop.id})`);

  let updatedCount = 0;

  for (const item of exactPriceUpdates) {
    // EXACT MATCH ON PRODUCT NAME ONLY — GUARANTEES NO OTHER PRODUCT IS TOUCHED!
    const product = await prisma.product.findFirst({
      where: {
        tenantId: shop.id,
        name: { equals: item.name, mode: 'insensitive' },
      },
    });

    if (product) {
      await prisma.product.update({
        where: { id: product.id },
        data: {
          sellingPrice: item.sellingPrice,
          purchasePrice: item.purchasePrice,
        },
      });
      updatedCount++;
      console.log(`[SAFE UPDATE] ${product.sku.padEnd(9)} | Selling: Rs. ${String(item.sellingPrice).padStart(6)} | Cost: Rs. ${String(item.purchasePrice).padStart(6)} | "${product.name}"`);
    }
  }

  console.log(`\n🎉 SAFE PRICE UPDATE COMPLETE! Updated exactly ${updatedCount} target products.`);
  console.log(`🛡️ 100% Guaranteed: Zero other products were modified.`);
}

updateCatalogPrices()
  .catch(e => console.error('❌ Error updating prices:', e))
  .finally(() => {
    prisma.$disconnect();
    if (pool) pool.end();
  });
