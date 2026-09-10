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

async function checkAccountProducts() {
  const shops = await prisma.shop.findMany();
  let shop = shops.find(s => s.id.toLowerCase().includes('3924fc6c'));
  if (!shop && shops.length > 0) shop = shops[0];
  if (!shop) throw new Error('No shop found in database!');

  console.log(`\n======================================================`);
  console.log(`AUDITING CATALOG FOR SHOP: ${shop.name} (${shop.id})`);
  console.log(`======================================================\n`);

  const products = await prisma.product.findMany({
    where: { tenantId: shop.id },
    include: {
      category: true,
      subCategory: true,
      brand: true,
      stocks: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`Total Products in Shop Catalog: ${products.length}`);

  // 1. Check for duplicate product names
  const nameMap = new Map();
  const duplicateNames = new Set();

  products.forEach(p => {
    const key = p.name.trim().toLowerCase();
    if (nameMap.has(key)) {
      nameMap.get(key).push(p);
      duplicateNames.add(key);
    } else {
      nameMap.set(key, [p]);
    }
  });

  if (duplicateNames.size > 0) {
    console.log(`\n⚠️ FOUND ${duplicateNames.size} DUPLICATE PRODUCT NAME PAIRS (From Baseline Catalog):`);
    duplicateNames.forEach(key => {
      const items = nameMap.get(key);
      console.log(`  - "${items[0].name}": ${items.length} records found (${items.map(i => `${i.sku} (Qty: ${Number(i.stocks[0]?.quantity || 0)})`).join(', ')})`);
    });
  } else {
    console.log(`\n✅ ZERO DUPLICATE PRODUCT NAMES FOUND! Every product name is unique.`);
  }

  // 2. Check for duplicate SKUs
  const skuMap = new Map();
  const duplicateSkus = [];
  products.forEach(p => {
    if (p.sku) {
      if (skuMap.has(p.sku)) {
        duplicateSkus.push(p.sku);
      } else {
        skuMap.set(p.sku, true);
      }
    }
  });

  if (duplicateSkus.length > 0) {
    console.log(`⚠️ FOUND ${duplicateSkus.length} DUPLICATE SKUs: ${duplicateSkus.join(', ')}`);
  } else {
    console.log(`✅ ZERO DUPLICATE SKUs FOUND! All SKUs are 100% unique.`);
  }

  // 3. Check stock records & missing stock
  let totalStockUnits = 0;
  let totalStockVal = 0;
  const missingStockProds = [];

  products.forEach(p => {
    const totalQty = p.stocks.reduce((acc, s) => acc + Number(s.quantity || 0), 0);
    if (p.stocks.length === 0) {
      missingStockProds.push(`${p.sku} - ${p.name}`);
    }
    totalStockUnits += totalQty;
    totalStockVal += totalQty * Number(p.sellingPrice || 0);
  });

  if (missingStockProds.length > 0) {
    console.log(`\n⚠️ PRODUCTS MISSING STOCK RECORDS (${missingStockProds.length}):`);
    missingStockProds.forEach(m => console.log(`  - ${m}`));
  } else {
    console.log(`\n✅ ALL PRODUCTS HAVE VALID STOCK RECORDS!`);
  }

  console.log(`\n------------------------------------------------------`);
  console.log(`SUMMARY OF AUDIT FOR SHOP ID: ${shop.id}`);
  console.log(`------------------------------------------------------`);
  console.log(`• Total Products in Catalog: ${products.length} items`);
  console.log(`• Total Physical Inventory Count: ${totalStockUnits.toLocaleString()} units`);
  console.log(`• Total Inventory Stock Value: Rs. ${totalStockVal.toLocaleString('en-LK')}`);
  console.log(`------------------------------------------------------\n`);
}

checkAccountProducts()
  .catch(console.error)
  .finally(() => {
    prisma.$disconnect();
    if (pool) pool.end();
  });
