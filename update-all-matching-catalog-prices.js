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

// Full Master List of Prices from S-Lon & National PVC Price Lists
const catalogPriceRules = [
  // ─── WATER PUMPS ──────────────────────────────────────────────────────────
  { keyword: 'sl 30', sellingPrice: 23080, purchasePrice: 16618 },
  { keyword: 'sl 50', sellingPrice: 37660, purchasePrice: 27115 },
  { keyword: 'sl 75', sellingPrice: 42860, purchasePrice: 30859 },
  { keyword: 'sl 100', sellingPrice: 49350, purchasePrice: 35532 },
  { keyword: 'sla 75', sellingPrice: 46180, purchasePrice: 33250 },
  { keyword: 'sla 100', sellingPrice: 51345, purchasePrice: 36968 },
  { keyword: 'sla 150', sellingPrice: 73395, purchasePrice: 52844 },
  { keyword: 'sla 200', sellingPrice: 78120, purchasePrice: 56246 },
  { keyword: 'jet pump', sellingPrice: 55020, purchasePrice: 39614 },
  { keyword: 'auto pressure pump', sellingPrice: 45150, purchasePrice: 32508 },
  { keyword: 'pressure controller', sellingPrice: 12600, purchasePrice: 9072 },

  // ─── SOLVENT CEMENT (SLS 935) ──────────────────────────────────────────────
  { keyword: 'solvent cement 15g', sellingPrice: 148, purchasePrice: 106 },
  { keyword: 'solvent cement 25g', sellingPrice: 200, purchasePrice: 144 },
  { keyword: 'solvent cement 50g', sellingPrice: 375, purchasePrice: 270 },
  { keyword: 'solvent cement 75g', sellingPrice: 535, purchasePrice: 385 },
  { keyword: 'solvent cement 125g', sellingPrice: 880, purchasePrice: 633 },
  { keyword: 'solvent cement 250g', sellingPrice: 1600, purchasePrice: 1152 },
  { keyword: 'solvent cement 500g', sellingPrice: 3250, purchasePrice: 2340 },
  { keyword: 'pvc gum 500g', sellingPrice: 3250, purchasePrice: 2340 },
  { keyword: 'pvc gum 250g', sellingPrice: 1600, purchasePrice: 1152 },
  { keyword: 'pvc gum 100g', sellingPrice: 880, purchasePrice: 633 },
  { keyword: 'pvc gum 50g', sellingPrice: 375, purchasePrice: 270 },

  // ─── NATIONAL PVC PRESSURE FITTINGS (With 53% + 6% Discount Cost) ─────────
  { keyword: '20mm socket', sellingPrice: 50, purchasePrice: 22 },
  { keyword: '25mm socket', sellingPrice: 70, purchasePrice: 31 },
  { keyword: '32mm socket', sellingPrice: 120, purchasePrice: 53 },
  { keyword: '40mm socket', sellingPrice: 165, purchasePrice: 73 },
  { keyword: '50mm socket', sellingPrice: 240, purchasePrice: 106 },
  { keyword: '63mm socket', sellingPrice: 375, purchasePrice: 165 },
  { keyword: '75mm socket', sellingPrice: 540, purchasePrice: 238 },
  { keyword: '20mm elbow', sellingPrice: 50, purchasePrice: 22 },
  { keyword: '25mm elbow', sellingPrice: 70, purchasePrice: 31 },
  { keyword: '32mm elbow', sellingPrice: 125, purchasePrice: 55 },
  { keyword: '40mm elbow', sellingPrice: 195, purchasePrice: 86 },
  { keyword: '50mm elbow', sellingPrice: 270, purchasePrice: 119 },
  { keyword: '63mm elbow', sellingPrice: 608, purchasePrice: 268 },
  { keyword: '20mm equal tee', sellingPrice: 70, purchasePrice: 31 },
  { keyword: '25mm equal tee', sellingPrice: 105, purchasePrice: 46 },
  { keyword: '32mm equal tee', sellingPrice: 165, purchasePrice: 73 },
  { keyword: '20mm end cap', sellingPrice: 65, purchasePrice: 29 },
  { keyword: '25mm end cap', sellingPrice: 86, purchasePrice: 38 },
  { keyword: '32mm end cap', sellingPrice: 122, purchasePrice: 54 },
  { keyword: '50mm end cap', sellingPrice: 170, purchasePrice: 75 },
  { keyword: '63mm end cap', sellingPrice: 346, purchasePrice: 152 },

  // ─── S-LON VITO BRASS VALVES ───────────────────────────────────────────────
  { keyword: 'brass ball valve 1/2"', sellingPrice: 2470, purchasePrice: 1778 },
  { keyword: 'brass ball valve 3/4"', sellingPrice: 3415, purchasePrice: 2458 },
  { keyword: 'brass ball valve 1"', sellingPrice: 5565, purchasePrice: 4006 },
  { keyword: 'brass ball valve 1 1/4"', sellingPrice: 9890, purchasePrice: 7120 },
  { keyword: 'brass ball valve 1 1/2"', sellingPrice: 13805, purchasePrice: 9939 },
  { keyword: 'brass ball valve 2"', sellingPrice: 21215, purchasePrice: 15274 },
  { keyword: 'brass gate valve 1/2"', sellingPrice: 3075, purchasePrice: 2214 },
  { keyword: 'brass gate valve 3/4"', sellingPrice: 3470, purchasePrice: 2498 },
  { keyword: 'brass gate valve 1"', sellingPrice: 4285, purchasePrice: 3085 },
];

async function updateAllMatchingCatalogPrices() {
  console.log('🚀 Scanning & Updating All Matching S-Lon & National PVC Product Prices...\n');

  const shops = await prisma.shop.findMany();
  let shop = shops.find(s => s.id.toLowerCase().includes('3924fc6c'));
  if (!shop && shops.length > 0) shop = shops[0];
  if (!shop) throw new Error('❌ No shop found in database!');

  const products = await prisma.product.findMany({
    where: { tenantId: shop.id },
  });

  let updatedCount = 0;

  for (const rule of catalogPriceRules) {
    for (const p of products) {
      const nameLower = p.name.toLowerCase();
      if (nameLower.includes(rule.keyword)) {
        await prisma.product.update({
          where: { id: p.id },
          data: {
            sellingPrice: rule.sellingPrice,
            purchasePrice: rule.purchasePrice,
          },
        });
        updatedCount++;
        console.log(`[CATALOG PRICE] ${p.sku.padEnd(9)} | Selling: Rs. ${String(rule.sellingPrice).padStart(6)} | Cost: Rs. ${String(rule.purchasePrice).padStart(6)} | "${p.name}"`);
      }
    }
  }

  console.log(`\n🎉 COMPREHENSIVE CATALOG PRICE UPDATE COMPLETE!`);
  console.log(`   ✅ Total Products Updated to Catalog Prices: ${updatedCount}`);
}

updateAllMatchingCatalogPrices()
  .catch(e => console.error('❌ Error updating prices:', e))
  .finally(() => {
    prisma.$disconnect();
    if (pool) pool.end();
  });
