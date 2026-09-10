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

// Millimeter to Inch mapping for PVC fittings
const mmToInchMap = [
  { mm: '20mm', inch: '1/2"' },
  { mm: '20 mm', inch: '1/2"' },
  { mm: '25mm', inch: '3/4"' },
  { mm: '25 mm', inch: '3/4"' },
  { mm: '32mm', inch: '1"' },
  { mm: '32 mm', inch: '1"' },
  { mm: '40mm', inch: '1 1/4"' },
  { mm: '40 mm', inch: '1 1/4"' },
  { mm: '50mm', inch: '1 1/2"' },
  { mm: '50 mm', inch: '1 1/2"' },
  { mm: '63mm', inch: '2"' },
  { mm: '63 mm', inch: '2"' },
  { mm: '75mm', inch: '2 1/2"' },
  { mm: '75 mm', inch: '2 1/2"' },
  { mm: '90mm', inch: '3"' },
  { mm: '90 mm', inch: '3"' },
  { mm: '110mm', inch: '4"' },
  { mm: '110 mm', inch: '4"' },
  { mm: '160mm', inch: '6"' },
  { mm: '160 mm', inch: '6"' },
];

async function addInchToPvcFittings() {
  console.log('🚀 Adding Inch Conversions to PVC Fittings Product Names...\n');

  const shops = await prisma.shop.findMany();
  let shop = shops.find(s => s.id.toLowerCase().includes('3924fc6c'));
  if (!shop && shops.length > 0) shop = shops[0];
  if (!shop) throw new Error('❌ No shop found in database!');

  const products = await prisma.product.findMany({
    where: { tenantId: shop.id },
  });

  let updatedCount = 0;

  for (const p of products) {
    const nameLower = p.name.toLowerCase();

    // Check if item is a PVC fitting (contains socket, elbow, tee, cap, bend, union, reducer, valve, pipe)
    const isPvcFitting =
      nameLower.includes('socket') ||
      nameLower.includes('elbow') ||
      nameLower.includes('tee') ||
      nameLower.includes('cap') ||
      nameLower.includes('bend') ||
      nameLower.includes('union') ||
      nameLower.includes('reducer') ||
      nameLower.includes('pvc');

    if (!isPvcFitting) continue;

    // Check if name already has inch quote symbol like " or 1/2 or 3/4
    const alreadyHasInch = nameLower.includes('"') || nameLower.includes('1/2') || nameLower.includes('3/4') || nameLower.includes('1/4');
    if (alreadyHasInch) continue;

    // Look for mm size to append inch equivalent
    let matchedConv = null;
    for (const conv of mmToInchMap) {
      if (nameLower.includes(conv.mm)) {
        matchedConv = conv;
        break;
      }
    }

    if (matchedConv) {
      const newName = `${p.name} (${matchedConv.inch})`;
      await prisma.product.update({
        where: { id: p.id },
        data: { name: newName },
      });
      updatedCount++;
      console.log(`[NAME ENHANCED] ${p.sku.padEnd(9)} | "${p.name}" ➔ "${newName}"`);
    }
  }

  console.log(`\n🎉 PVC FITTINGS INCH ENHANCEMENT COMPLETE!`);
  console.log(`   ✅ Total PVC Fitting Names Enhanced: ${updatedCount}`);
}

addInchToPvcFittings()
  .catch(e => console.error('❌ Error updating names:', e))
  .finally(() => {
    prisma.$disconnect();
    if (pool) pool.end();
  });
