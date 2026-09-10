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
// BATCH 14 — HKU Series (Auto-continues from last HKU number in DB)
// Source: 5 handwritten audit sheets — Floodlights, MingLED Recessed/Surface lights,
//         Plumbing & Sanitaryware, Sink Taps & Bottle Paints, Thread Seals & Spray Paints
// ─────────────────────────────────────────────────────────────────────────────
const productsToInsert = [

  // ─── 1. FLOODLIGHTS & PANEL LIGHTS (Sheet 1) ──────────────────────────────
  { name: 'LED Floodlight 150W',                            qty: 11,  category: 'Electronics', subcategory: 'Flood Lights',       brand: 'Generic',    price: 6800,  unit: 'pcs' },
  { name: 'LED Sensor Floodlight 50W',                      qty: 3,   category: 'Electronics', subcategory: 'Flood Lights',       brand: 'Generic',    price: 4500,  unit: 'pcs' },
  { name: 'LGL Floodlight 100W (A-EF-HLL-007)',            qty: 10,  category: 'Electronics', subcategory: 'Flood Lights',       brand: 'LGL',        price: 8500,  unit: 'pcs' },
  { name: 'LGL Floodlight 50W (A-EF-HLL-010)',             qty: 1,   category: 'Electronics', subcategory: 'Flood Lights',       brand: 'LGL',        price: 4800,  unit: 'pcs' },
  { name: 'LGL Floodlight 100W (A-EF-HLL-080)',            qty: 3,   category: 'Electronics', subcategory: 'Flood Lights',       brand: 'LGL',        price: 9200,  unit: 'pcs' },
  { name: 'LGL Floodlight 50W (A-EF-HLL-078)',             qty: 9,   category: 'Electronics', subcategory: 'Flood Lights',       brand: 'LGL',        price: 5200,  unit: 'pcs' },
  { name: 'LGL Icecubes 18W Square (S-EF-SDL-005)',       qty: 5,   category: 'Electronics', subcategory: 'Lighting',           brand: 'LGL',        price: 2400,  unit: 'pcs' },
  { name: 'LGL Panel Light 24W Square (A-EF-CBL-059)',     qty: 1,   category: 'Electronics', subcategory: 'Lighting',           brand: 'LGL',        price: 2800,  unit: 'pcs' },
  { name: 'LGL Icecubes 12W Warmwhite',                     qty: 5,   category: 'Electronics', subcategory: 'Lighting',           brand: 'LGL',        price: 1850,  unit: 'pcs' },
  { name: 'LGL Icecubes 12W Daylight',                      qty: 5,   category: 'Electronics', subcategory: 'Lighting',           brand: 'LGL',        price: 1850,  unit: 'pcs' },
  { name: 'Yumi Sensor Flood Light 50W',                    qty: 1,   category: 'Electronics', subcategory: 'Flood Lights',       brand: 'Yumi',       price: 4200,  unit: 'pcs' },
  { name: 'Yumi Sensor Flood Light 30W',                    qty: 7,   category: 'Electronics', subcategory: 'Flood Lights',       brand: 'Yumi',       price: 3200,  unit: 'pcs' },
  { name: 'Orange LED Panel 12W Daylight Square',          qty: 6,   category: 'Electronics', subcategory: 'Lighting',           brand: 'Orange',     price: 1650,  unit: 'pcs' },

  // ─── 2. MINGLED RECESSED & SURFACE LIGHTS (Sheet 2) ────────────────────────
  { name: 'MingLED Recessed 18+6W Coolwhite Warm Round',    qty: 1,   category: 'Electronics', subcategory: 'Lighting',           brand: 'Ming',       price: 1850,  unit: 'pcs' },
  { name: 'MingLED Recessed 18+6W Coolwhite Blue Round',    qty: 23,  category: 'Electronics', subcategory: 'Lighting',           brand: 'Ming',       price: 1850,  unit: 'pcs' },
  { name: 'MingLED Recessed 18W Coolwhite Round',           qty: 8,   category: 'Electronics', subcategory: 'Lighting',           brand: 'Ming',       price: 1450,  unit: 'pcs' },
  { name: 'MingLED Recessed 18W Warmwhite Round',           qty: 22,  category: 'Electronics', subcategory: 'Lighting',           brand: 'Ming',       price: 1450,  unit: 'pcs' },
  { name: 'MingLED Recessed 18+6W Coolwhite Warm',          qty: 1,   category: 'Electronics', subcategory: 'Lighting',           brand: 'Ming',       price: 1850,  unit: 'pcs' },
  { name: 'MingLED Recessed 18+6W Coolwhite Blue',          qty: 4,   category: 'Electronics', subcategory: 'Lighting',           brand: 'Ming',       price: 1850,  unit: 'pcs' },
  { name: 'MingLED Surface 18W Coolwhite Square',           qty: 13,  category: 'Electronics', subcategory: 'Lighting',           brand: 'Ming',       price: 1650,  unit: 'pcs' },
  { name: 'MingLED Surface 18+6W Coolwhite Warm',           qty: 1,   category: 'Electronics', subcategory: 'Lighting',           brand: 'Ming',       price: 1950,  unit: 'pcs' },
  { name: 'MingLED Surface 18+6W Coolwhite Blue',          qty: 4,   category: 'Electronics', subcategory: 'Lighting',           brand: 'Ming',       price: 1950,  unit: 'pcs' },
  { name: 'MingLED Recessed 18W Warmwhite',                 qty: 6,   category: 'Electronics', subcategory: 'Lighting',           brand: 'Ming',       price: 1450,  unit: 'pcs' },
  { name: 'MingLED Recessed 12+4W Coolwhite Warm',          qty: 2,   category: 'Electronics', subcategory: 'Lighting',           brand: 'Ming',       price: 1450,  unit: 'pcs' },
  { name: 'MingLED Surface 18W Coolwhite Round',            qty: 13,  category: 'Electronics', subcategory: 'Lighting',           brand: 'Ming',       price: 1550,  unit: 'pcs' },
  { name: 'MingLED Surface 18W Warmwhite Square',           qty: 10,  category: 'Electronics', subcategory: 'Lighting',           brand: 'Ming',       price: 1650,  unit: 'pcs' },
  { name: 'MingLED Recessed 12+4W Warmwhite Round',         qty: 11,  category: 'Electronics', subcategory: 'Lighting',           brand: 'Ming',       price: 1350,  unit: 'pcs' },
  { name: 'MingLED Recessed 12+4W Coolwhite Round',         qty: 48,  category: 'Electronics', subcategory: 'Lighting',           brand: 'Ming',       price: 1350,  unit: 'pcs' },
  { name: 'MingLED Surface 12+4W Coolwhite Warm Round',     qty: 17,  category: 'Electronics', subcategory: 'Lighting',           brand: 'Ming',       price: 1450,  unit: 'pcs' },
  { name: 'MingLED Surface 12+4W Coolwhite Blue Square',    qty: 8,   category: 'Electronics', subcategory: 'Lighting',           brand: 'Ming',       price: 1450,  unit: 'pcs' },
  { name: 'MingLED Surface 12+4W Coolwhite Warm Square',    qty: 9,   category: 'Electronics', subcategory: 'Lighting',           brand: 'Ming',       price: 1450,  unit: 'pcs' },
  { name: 'MingLED Recessed 12W Coolwhite Square',          qty: 40,  category: 'Electronics', subcategory: 'Lighting',           brand: 'Ming',       price: 1250,  unit: 'pcs' },
  { name: 'MingLED Surface 12W Coolwhite Square',           qty: 8,   category: 'Electronics', subcategory: 'Lighting',           brand: 'Ming',       price: 1350,  unit: 'pcs' },
  { name: 'MingLED Surface 12W Warmwhite Square',           qty: 9,   category: 'Electronics', subcategory: 'Lighting',           brand: 'Ming',       price: 1350,  unit: 'pcs' },
  { name: 'MingLED Surface 18+6W Coolwhite Warm Square',    qty: 12,  category: 'Electronics', subcategory: 'Lighting',           brand: 'Ming',       price: 1950,  unit: 'pcs' },
  { name: 'MingLED Surface 18+6W Coolwhite Warm Round',     qty: 20,  category: 'Electronics', subcategory: 'Lighting',           brand: 'Ming',       price: 1950,  unit: 'pcs' },
  { name: 'MingLED Surface 18+6W Coolwhite Blue Round',     qty: 26,  category: 'Electronics', subcategory: 'Lighting',           brand: 'Ming',       price: 1950,  unit: 'pcs' },
  { name: 'MingLED 18W LED Bulb Warmwhite',                 qty: 7,   category: 'Electronics', subcategory: 'Bulbs',              brand: 'Ming',       price: 980,   unit: 'pcs' },
  { name: 'MingLED 15W LED Bulb Warmwhite',                 qty: 9,   category: 'Electronics', subcategory: 'Bulbs',              brand: 'Ming',       price: 850,   unit: 'pcs' },
  { name: 'MingLED 12W LED Bulb Warmwhite',                 qty: 11,  category: 'Electronics', subcategory: 'Bulbs',              brand: 'Ming',       price: 680,   unit: 'pcs' },
  { name: 'MingLED 9W LED Bulb Warmwhite',                  qty: 3,   category: 'Electronics', subcategory: 'Bulbs',              brand: 'Ming',       price: 480,   unit: 'pcs' },

  // ─── 3. PLUMBING & SANITARYWARE (Sheet 3) ─────────────────────────────────
  { name: 'Prince CPVC Ball Valve 15mm 1/2"',              qty: 10,  category: 'Plumbing',    subcategory: 'Valves',              brand: 'Prince',     price: 850,   unit: 'pcs' },
  { name: 'Prince CPVC Ball Valve 20mm 3/4"',              qty: 10,  category: 'Plumbing',    subcategory: 'Valves',              brand: 'Prince',     price: 1150,  unit: 'pcs' },
  { name: 'WaterTec Non-Threaded Ball Valve 20mm 1/2"',    qty: 1,   category: 'Plumbing',    subcategory: 'Valves',              brand: 'WaterTec',   price: 950,   unit: 'pcs' },
  { name: 'Kevin Bidet Shower White',                       qty: 17,  category: 'Plumbing',    subcategory: 'Sanitaryware',        brand: 'Kevin',      price: 1850,  unit: 'pcs' },
  { name: 'Topman Basin Tap E-04 Silver',                   qty: 3,   category: 'Plumbing',    subcategory: 'Sanitaryware',        brand: 'Topman',     price: 3400,  unit: 'box' },
  { name: 'Topman Angle Valve Black',                       qty: 11,  category: 'Plumbing',    subcategory: 'Valves',              brand: 'Topman',     price: 1450,  unit: 'box' },
  { name: 'Topman Stop Valve TPE003 Black',                 qty: 4,   category: 'Plumbing',    subcategory: 'Valves',              brand: 'Topman',     price: 1850,  unit: 'box' },
  { name: 'Topman Bidet Shower Set OS',                     qty: 5,   category: 'Plumbing',    subcategory: 'Sanitaryware',        brand: 'Topman',     price: 2400,  unit: 'pcs' },
  { name: 'Gralace Angle Valve 03',                         qty: 3,   category: 'Plumbing',    subcategory: 'Valves',              brand: 'Gralace',    price: 1250,  unit: 'pcs' },
  { name: 'Euro Aqua Overhead Shower 5A',                   qty: 3,   category: 'Plumbing',    subcategory: 'Sanitaryware',        brand: 'Euro Aqua',  price: 2800,  unit: 'pcs' },
  { name: 'Pushcock Slim Round Shower Set',                 qty: 4,   category: 'Plumbing',    subcategory: 'Sanitaryware',        brand: 'Generic',    price: 2200,  unit: 'pcs' },
  { name: 'Makabaka Shower Spray Kit 6" Square',            qty: 7,   category: 'Plumbing',    subcategory: 'Sanitaryware',        brand: 'Makabaka',   price: 3200,  unit: 'pcs' },
  { name: 'Rapsel Bidet Shower Set',                        qty: 5,   category: 'Plumbing',    subcategory: 'Sanitaryware',        brand: 'Rapsel',     price: 2600,  unit: 'pcs' },

  // ─── 4. SINK TAPS & BOTTLE PAINTS (Sheet 4) ───────────────────────────────
  { name: 'Bestford Sink Tap',                              qty: 13,  category: 'Plumbing',    subcategory: 'Sanitaryware',        brand: 'Bestford',   price: 2400,  unit: 'pcs' },
  { name: 'Prince Sink Tap',                                qty: 5,   category: 'Plumbing',    subcategory: 'Sanitaryware',        brand: 'Prince',     price: 2800,  unit: 'pcs' },
  { name: 'WaterTec Sink Tap (CBFK)',                       qty: 3,   category: 'Plumbing',    subcategory: 'Sanitaryware',        brand: 'WaterTec',   price: 3200,  unit: 'pcs' },
  { name: 'Water SPA Sink Tap',                             qty: 16,  category: 'Plumbing',    subcategory: 'Sanitaryware',        brand: 'Water SPA',  price: 2600,  unit: 'pcs' },
  { name: 'Kevin Water Tap (GKK)',                          qty: 5,   category: 'Plumbing',    subcategory: 'Sanitaryware',        brand: 'Kevin',      price: 2100,  unit: 'pcs' },
  { name: 'WaterTec Angle Valve WT14546',                   qty: 5,   category: 'Plumbing',    subcategory: 'Valves',              brand: 'WaterTec',   price: 1450,  unit: 'pcs' },
  { name: 'WaterTec Angle Valve WT14550',                   qty: 12,  category: 'Plumbing',    subcategory: 'Valves',              brand: 'WaterTec',   price: 1550,  unit: 'pcs' },
  { name: 'WaterTec Angle Valve WT14548',                   qty: 1,   category: 'Plumbing',    subcategory: 'Valves',              brand: 'WaterTec',   price: 1450,  unit: 'pcs' },
  { name: 'Bestford Water Tap WT1454',                      qty: 4,   category: 'Plumbing',    subcategory: 'Sanitaryware',        brand: 'Bestford',   price: 2200,  unit: 'pcs' },
  { name: 'One Drop Bottle Paint Dark Green 100ml',         qty: 13,  category: 'Paints',      subcategory: 'Specialty Paints',   brand: 'Generic',    price: 350,   unit: '100ml' },
  { name: 'One Drop Bottle Paint Purple Blue 100ml',        qty: 10,  category: 'Paints',      subcategory: 'Specialty Paints',   brand: 'Generic',    price: 350,   unit: '100ml' },
  { name: 'One Drop Bottle Paint Red 100ml',                qty: 12,  category: 'Paints',      subcategory: 'Specialty Paints',   brand: 'Generic',    price: 350,   unit: '100ml' },
  { name: 'One Drop Bottle Paint Purple 100ml',             qty: 10,  category: 'Paints',      subcategory: 'Specialty Paints',   brand: 'Generic',    price: 350,   unit: '100ml' },
  { name: 'One Drop Bottle Paint Pink 100ml',               qty: 10,  category: 'Paints',      subcategory: 'Specialty Paints',   brand: 'Generic',    price: 350,   unit: '100ml' },
  { name: 'One Drop Bottle Paint Black 100ml',              qty: 5,   category: 'Paints',      subcategory: 'Specialty Paints',   brand: 'Generic',    price: 350,   unit: '100ml' },
  { name: 'One Drop Bottle Paint Yellow 100ml',             qty: 18,  category: 'Paints',      subcategory: 'Specialty Paints',   brand: 'Generic',    price: 350,   unit: '100ml' },
  { name: 'One Drop Bottle Paint Orange 100ml',             qty: 12,  category: 'Paints',      subcategory: 'Specialty Paints',   brand: 'Generic',    price: 350,   unit: '100ml' },
  { name: 'One Drop Bottle Paint Light Green 100ml',        qty: 15,  category: 'Paints',      subcategory: 'Specialty Paints',   brand: 'Generic',    price: 350,   unit: '100ml' },
  { name: 'One Drop Bottle Paint Green 100ml',              qty: 6,   category: 'Paints',      subcategory: 'Specialty Paints',   brand: 'Generic',    price: 350,   unit: '100ml' },
  { name: 'Multico Banner Paint White',                     qty: 6,   category: 'Paints',      subcategory: 'Specialty Paints',   brand: 'Multico',    price: 950,   unit: 'pcs' },
  { name: 'Paint Fabric Banner Butter',                     qty: 3,   category: 'Paints',      subcategory: 'Specialty Paints',   brand: 'Generic',    price: 850,   unit: 'pcs' },
  { name: 'Paint Fabric Banner Grey',                       qty: 1,   category: 'Paints',      subcategory: 'Specialty Paints',   brand: 'Generic',    price: 850,   unit: 'pcs' },

  // ─── 5. THREAD SEALS & SPRAY PAINTS (Sheet 5) ─────────────────────────────
  { name: 'S-Lon Thread Seal Tape 19mm x 0.075mm x 10m',    qty: 100, category: 'Plumbing',    subcategory: 'Pipe Accessories',    brand: 'S-Lon',      price: 135,   unit: 'pcs' },
  { name: 'S-Lon Thread Seal Tape 25mm x 0.075mm x 10m',    qty: 40,  category: 'Plumbing',    subcategory: 'Pipe Accessories',    brand: 'S-Lon',      price: 165,   unit: 'pcs' },
  { name: 'S-Lon Thread Seal Tape 12mm x 0.075mm x 10m',    qty: 20,  category: 'Plumbing',    subcategory: 'Pipe Accessories',    brand: 'S-Lon',      price: 95,    unit: 'pcs' },
  { name: 'COLLRFIA Spray Paint Black 400ml',               qty: 6,   category: 'Paints',      subcategory: 'Spray Paints',        brand: 'COLLRFIA',   price: 850,   unit: '400ml' },
  { name: 'COLLRFIA Spray Paint White 400ml',               qty: 6,   category: 'Paints',      subcategory: 'Spray Paints',        brand: 'COLLRFIA',   price: 850,   unit: '400ml' },
];

async function insertProductsBatch14() {
  console.log('🚀 Starting Batch 14 Product Insertion & Smart Stock Upsert...\n');

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

  console.log(`\n🎉 BATCH 14 COMPLETE!`);
  console.log(`   ✅ New Products Inserted : ${insertedCount}`);
  console.log(`   🔄 Existing Stock Updated: ${updatedCount}`);
  console.log(`   📋 HKU series now at     : HKU_${String(hkuIndex - 1).padStart(2, '0')}`);
}

insertProductsBatch14()
  .catch(e => { console.error('❌ Error:', e.message); process.exit(1); })
  .finally(() => { prisma.$disconnect(); if (pool) pool.end(); });
