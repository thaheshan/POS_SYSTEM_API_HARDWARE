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
// BATCH 17 — HKU Series (Auto-continues from last HKU number in DB)
// Source: User-provided text audit list (Orange Casablanca, Monaco, Scintilla,
//         Alpha MCBs/Isolators/RCDs, Sigma RCDs, MCB Changeover Switches)
// ─────────────────────────────────────────────────────────────────────────────
const productsToInsert = [

  // ─── 1. ORANGE ELECTRIC — CASABLANCA SERIES ──────────────────────────────
  { name: 'Orange Electric Casablanca 2-Gang Switch Box Plate', qty: 1,   category: 'Electronics', subcategory: 'Switches',        brand: 'Orange Electric', price: 450,   unit: 'pcs' },
  { name: 'Orange Electric Casablanca 1-Gang 4-Wire Telephone Socket', qty: 9, category: 'Electronics', subcategory: 'Sockets & Plugs', brand: 'Orange Electric', price: 1250, unit: 'pcs' },
  { name: 'Orange Electric Casablanca 75-Ohm TV Outlet (CA)', qty: 20, category: 'Electronics', subcategory: 'Sockets & Plugs', brand: 'Orange Electric', price: 1450, unit: 'pcs' },
  { name: 'Orange Electric Casablanca 1-Gang 2-Way Switch',  qty: 25, category: 'Electronics', subcategory: 'Switches',        brand: 'Orange Electric', price: 480,   unit: 'pcs' },
  { name: 'Orange Electric Casablanca 1-Way 4-Gang Switch',  qty: 15, category: 'Electronics', subcategory: 'Switches',        brand: 'Orange Electric', price: 980,   unit: 'pcs' },
  { name: 'Orange Electric Casablanca 3-Gang 1-Way Switch',  qty: 8,  category: 'Electronics', subcategory: 'Switches',        brand: 'Orange Electric', price: 780,   unit: 'pcs' },
  { name: 'Orange Electric Casablanca 2-Gang 1-Way Switch',  qty: 16, category: 'Electronics', subcategory: 'Switches',        brand: 'Orange Electric', price: 580,   unit: 'pcs' },
  { name: 'Orange Electric Casablanca 2-Gang 2-Way Switch',  qty: 11, category: 'Electronics', subcategory: 'Switches',        brand: 'Orange Electric', price: 680,   unit: 'pcs' },
  { name: 'Orange Electric Casablanca 1-Way 1-Gang Switch',  qty: 16, category: 'Electronics', subcategory: 'Switches',        brand: 'Orange Electric', price: 380,   unit: 'pcs' },
  { name: 'Orange Electric Casablanca 5-Step Humfree Fan Controller', qty: 10, category: 'Electronics', subcategory: 'Dimmers & Controllers', brand: 'Orange Electric', price: 1250, unit: 'pcs' },
  { name: 'Orange Electric Casablanca 1-Gang Switch Plate',  qty: 1,  category: 'Electronics', subcategory: 'Switches',        brand: 'Orange Electric', price: 280,   unit: 'pcs' },
  { name: 'Orange Electric Casablanca 2-Way 1-Gang Bell Press Switch', qty: 18, category: 'Electronics', subcategory: 'Switches', brand: 'Orange Electric', price: 450, unit: 'pcs' },
  { name: 'Orange Electric Casablanca 10A 1-Gang 2-Way Bell Press', qty: 6, category: 'Electronics', subcategory: 'Switches', brand: 'Orange Electric', price: 480, unit: 'pcs' },
  { name: 'Orange Electric Casablanca 3-Gang 2-Way Switch',  qty: 12, category: 'Electronics', subcategory: 'Switches',        brand: 'Orange Electric', price: 880,   unit: 'pcs' },
  { name: 'Orange Electric Casablanca 4-Gang 2-Way Switch',  qty: 8,  category: 'Electronics', subcategory: 'Switches',        brand: 'Orange Electric', price: 1150,  unit: 'pcs' },
  { name: 'Orange Electric Casablanca 1-Way 5-Gang Switch',  qty: 1,  category: 'Electronics', subcategory: 'Switches',        brand: 'Orange Electric', price: 1250,  unit: 'pcs' },
  { name: 'Orange Electric Akoya 5-Step Fan Controller',     qty: 1,  category: 'Electronics', subcategory: 'Dimmers & Controllers', brand: 'Orange Electric', price: 1350, unit: 'pcs' },
  { name: 'Orange Electric Akoya 400W Fan Controller',       qty: 4,  category: 'Electronics', subcategory: 'Dimmers & Controllers', brand: 'Orange Electric', price: 1450, unit: 'pcs' },
  { name: 'Orange Electric Casablanca 5-Gang 1-Way Switch',  qty: 7,  category: 'Electronics', subcategory: 'Switches',        brand: 'Orange Electric', price: 1250,  unit: 'pcs' },
  { name: 'Orange Electric Casablanca 1-Way 3-Gang Switch',  qty: 2,  category: 'Electronics', subcategory: 'Switches',        brand: 'Orange Electric', price: 780,   unit: 'pcs' },

  // ─── 2. ORANGE ELECTRIC — MONACO & SCINTILLA SERIES ──────────────────────
  { name: 'Orange Electric Monaco Blank Plate Removable Plug', qty: 15, category: 'Electronics', subcategory: 'Switches',       brand: 'Orange Electric', price: 280,   unit: 'pcs' },
  { name: 'Orange Electric Scintilla 13A Single Socket Outlet', qty: 52, category: 'Electronics', subcategory: 'Sockets & Plugs', brand: 'Orange Electric', price: 850,   unit: 'pcs' },

  // ─── 3. ALPHA MCB 1-POLE ──────────────────────────────────────────────────
  { name: 'Alpha MCB 1-Pole 32A',                            qty: 16, category: 'Electronics', subcategory: 'Circuit Breakers', brand: 'Alpha',      price: 950,   unit: 'pcs' },
  { name: 'Alpha MCB 1-Pole 20A',                            qty: 1,  category: 'Electronics', subcategory: 'Circuit Breakers', brand: 'Alpha',      price: 950,   unit: 'pcs' },
  { name: 'Alpha MCB 1-Pole 16A',                            qty: 46, category: 'Electronics', subcategory: 'Circuit Breakers', brand: 'Alpha',      price: 950,   unit: 'pcs' },
  { name: 'Alpha MCB 1-Pole 10A',                            qty: 43, category: 'Electronics', subcategory: 'Circuit Breakers', brand: 'Alpha',      price: 950,   unit: 'pcs' },

  // ─── 4. RCCB, ISOLATORS & RCDS ───────────────────────────────────────────
  { name: 'Alpha RCCB 2-Pole',                               qty: 1,  category: 'Electronics', subcategory: 'Circuit Breakers', brand: 'Alpha',      price: 4500,  unit: 'pcs' },
  { name: 'Alpha Isolator 2-Pole',                           qty: 3,  category: 'Electronics', subcategory: 'Circuit Breakers', brand: 'Alpha',      price: 2200,  unit: 'pcs' },
  { name: 'Alpha RCD 2-Pole',                                qty: 15, category: 'Electronics', subcategory: 'Circuit Breakers', brand: 'Alpha',      price: 4200,  unit: 'pcs' },
  { name: 'Sigma RCD 2-Pole 40A 100mA',                      qty: 4,  category: 'Electronics', subcategory: 'Circuit Breakers', brand: 'Sigma',      price: 4800,  unit: 'pcs' },
  { name: 'Sigma RCD 2-Pole 40A 30mA',                       qty: 9,  category: 'Electronics', subcategory: 'Circuit Breakers', brand: 'Sigma',      price: 4800,  unit: 'pcs' },
  { name: 'Sigma RCD 2-Pole 63A',                            qty: 1,  category: 'Electronics', subcategory: 'Circuit Breakers', brand: 'Sigma',      price: 5400,  unit: 'pcs' },
  { name: 'Sigma Isolator 2-Pole 10A',                       qty: 1,  category: 'Electronics', subcategory: 'Circuit Breakers', brand: 'Sigma',      price: 1850,  unit: 'pcs' },
  { name: 'MCB Type Changeover Switch 10A',                  qty: 10, category: 'Electronics', subcategory: 'Circuit Breakers', brand: 'Generic',    price: 3200,  unit: 'pcs' },
];

async function insertProductsBatch17() {
  console.log('🚀 Starting Batch 17 Product Insertion & Smart Stock Upsert...\n');

  const shops = await prisma.shop.findMany();
  let shop = shops.find(s => s.id.toLowerCase().includes('3924fc6c'));
  if (!shop && shops.length > 0) shop = shops[0];
  if (!shop) throw new Error('❌ No shop found in database!');
  console.log(`✅ Using Shop: ${shop.name} (${shop.id})`);

  const warehouses = await prisma.warehouse.findMany({ where: { tenantId: shop.id } });
  const warehouse = warehouses[0] || (await prisma.warehouse.findFirst());
  if (!warehouse) throw new Error('❌ No warehouse found in database!');

  const branches = await prisma.branch.findMany({ where: { tenantId: shop.id } });
  const branchId = warehouse.branchId || (branches[0] ? branches[0].id : shop.id);
  console.log(`✅ Using Warehouse: ${warehouse.name} (${warehouse.id})`);

  const allExisting = await prisma.product.findMany({
    where: { tenantId: shop.id },
    select: { id: true, name: true, sku: true },
  });

  const existingByName = new Map();
  let maxHkuNum = 0;
  allExisting.forEach(p => {
    existingByName.set(p.name.toLowerCase(), p);
    const hkuMatch = p.sku && p.sku.match(/HKU_(\d+)/i);
    if (hkuMatch) {
      const num = parseInt(hkuMatch[1], 10);
      if (num > maxHkuNum) maxHkuNum = num;
    }
  });

  let hkuIndex = maxHkuNum + 1;
  console.log(`📦 HKU sequence continuing from: HKU_${String(hkuIndex).padStart(2, '0')}`);

  const catCache = new Map();
  const subCatCache = new Map();
  const brandCache = new Map();

  const existingCats = await prisma.category.findMany({ where: { tenantId: shop.id } });
  existingCats.forEach(c => catCache.set(c.name.toLowerCase(), c));

  const existingBrands = await prisma.brand.findMany({ where: { tenantId: shop.id } });
  existingBrands.forEach(b => brandCache.set(b.name.toLowerCase(), b));

  let insertedCount = 0;
  let updatedCount = 0;

  for (const item of productsToInsert) {
    const existingProd = existingByName.get(item.name.toLowerCase());

    if (existingProd) {
      const stock = await prisma.stock.findFirst({
        where: { tenantId: shop.id, productId: existingProd.id, warehouseId: warehouse.id },
      });
      if (stock) {
        await prisma.stock.update({
          where: { id: stock.id },
          data: { quantity: { increment: item.qty }, availableQuantity: { increment: item.qty } },
        });
      } else {
        await prisma.stock.create({
          data: { tenantId: shop.id, productId: existingProd.id, warehouseId: warehouse.id, branchId, quantity: item.qty, availableQuantity: item.qty },
        });
      }
      updatedCount++;
      console.log(`[STOCK+] ${existingProd.sku.padEnd(8)} | +${String(item.qty).padStart(3)} | ${item.name}`);
    } else {
      let cat = catCache.get(item.category.toLowerCase());
      if (!cat) {
        cat = await prisma.category.create({ data: { tenantId: shop.id, name: item.category } });
        catCache.set(item.category.toLowerCase(), cat);
      }

      const subKey = `${item.category}:${item.subcategory}`.toLowerCase();
      let subCat = subCatCache.get(subKey);
      if (!subCat) {
        const existingSub = existingCats.find(c => c.name.toLowerCase() === item.subcategory.toLowerCase() && c.parentId === cat.id);
        subCat = existingSub || await prisma.category.create({ data: { tenantId: shop.id, name: item.subcategory, parentId: cat.id } });
        subCatCache.set(subKey, subCat);
      }

      let brand = null;
      if (item.brand && item.brand !== 'Generic') {
        brand = brandCache.get(item.brand.toLowerCase());
        if (!brand) {
          brand = await prisma.brand.create({ data: { tenantId: shop.id, name: item.brand, categoryId: cat.id } });
          brandCache.set(item.brand.toLowerCase(), brand);
        }
      }

      const hkuCode = `HKU_${String(hkuIndex).padStart(2, '0')}`;
      const barcode  = `30000${String(hkuIndex).padStart(5, '0')}`;
      hkuIndex++;

      const purchasePrice = Math.round(item.price * 0.72);

      const product = await prisma.product.create({
        data: {
          tenantId: shop.id, name: item.name, sku: hkuCode, barcode,
          categoryId: cat.id, subcategoryId: subCat?.id || null, brandId: brand?.id || null,
          sellingPrice: item.price, purchasePrice,
          minimumStockLevel: 3, sellType: 'FIX', measurementUnit: item.unit || 'pcs',
        },
      });

      await prisma.stock.create({
        data: {
          tenantId: shop.id, productId: product.id, warehouseId: warehouse.id,
          branchId, quantity: item.qty, availableQuantity: item.qty, reservedQuantity: 0, damagedQuantity: 0,
        },
      });

      insertedCount++;
      console.log(`[NEW]    ${hkuCode.padEnd(8)} | Qty:${String(item.qty).padStart(3)} | Rs.${String(item.price).padStart(6)} | ${item.name}`);
    }
  }

  console.log(`\n🎉 BATCH 17 COMPLETE!`);
  console.log(`   ✅ New Products Inserted : ${insertedCount}`);
  console.log(`   🔄 Existing Stock Updated: ${updatedCount}`);
  console.log(`   📋 HKU series now at     : HKU_${String(hkuIndex - 1).padStart(2, '0')}`);
}

insertProductsBatch17()
  .catch(e => { console.error('❌ Error:', e.message); process.exit(1); })
  .finally(() => { prisma.$disconnect(); if (pool) pool.end(); });
