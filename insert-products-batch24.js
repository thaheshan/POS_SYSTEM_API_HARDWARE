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
// BATCH 24 — HKU Series (In Front Markers — Power Tools, Fans, Tanks, Ladder)
// Source: "In Front Markers" handwritten audit — items MISSING from Batch 23
// Covers: Markes Power Tools & Motors, Incco Cordless Drill & Tool Box,
//         CR-V Socket Set, MAC Water Pump, Orange Exhaust Fan,
//         Havells Ventilair Fans, Range Wall Fan, Aluminium Ladder,
//         PE+ Water Tanks, Anton Water Tanks, YUMI Industrial Fans
// ─────────────────────────────────────────────────────────────────────────────
const productsToInsert = [

  // ─── MARKES — POWER TOOLS & MOTORS ──────────────────────────────────────
  { name: '[MRKS] Markes Demolition Hammer 1600W',                 qty: 1, category: 'Electrical & Power Tools', subcategory: 'Power Tools',     brand: 'Markes',  price: 32000, unit: 'pcs' },
  { name: '[MRKS] Markes Rotary Hammer 1100W',                     qty: 1, category: 'Electrical & Power Tools', subcategory: 'Power Tools',     brand: 'Markes',  price: 22000, unit: 'pcs' },
  { name: '[MRKS] Markes Cut Off Machine 355mm 2200W',             qty: 2, category: 'Electrical & Power Tools', subcategory: 'Power Tools',     brand: 'Markes',  price: 18500, unit: 'pcs' },
  { name: '[MRKS] Markes Electric Mixer 1050W 12mm',               qty: 2, category: 'Electrical & Power Tools', subcategory: 'Power Tools',     brand: 'Markes',  price: 14500, unit: 'pcs' },
  { name: '[MRKS] Markes Electric Router 1200W 8-12mm',            qty: 1, category: 'Electrical & Power Tools', subcategory: 'Power Tools',     brand: 'Markes',  price: 17500, unit: 'pcs' },
  { name: '[MRKS] Markes Single Phase Induction Motor YL 90L-2',  qty: 2, category: 'Electrical & Power Tools', subcategory: 'Electric Motors', brand: 'Markes',  price: 25000, unit: 'pcs' },

  // ─── INCCO — CORDLESS DRILL & TOOL BOX ──────────────────────────────────
  { name: '[INCCO] Incco Brushless Cordless Impact Drill 20V (DBKKK)', qty: 2, category: 'Electrical & Power Tools', subcategory: 'Power Tools', brand: 'Incco',  price: 27500, unit: 'pcs' },
  { name: '[INCCO] Incco 17" Plastic Tool Box (DHFK)',             qty: 5, category: 'Hardware & Tools',          subcategory: 'Tool Storage',   brand: 'Incco',  price:  3200, unit: 'pcs' },

  // ─── CR-V — SOCKET SET ───────────────────────────────────────────────────
  { name: '[CRV] CR-V 94Pcs Socket Set 1/4" & 1/2"',              qty: 2, category: 'Hardware & Tools',          subcategory: 'Hand Tools',     brand: 'CR-V',   price: 11500, unit: 'set' },

  // ─── MAC — WATER PUMP ────────────────────────────────────────────────────
  { name: '[MAC] MAC Water Pump WP-30K',                           qty: 1, category: 'Electrical & Power Tools', subcategory: 'Water Pumps',    brand: 'MAC',    price: 32000, unit: 'pcs' },

  // ─── ORANGE — DOMESTIC EXHAUST FAN ───────────────────────────────────────
  { name: '[ORNG] Orange 12" Domestic Exhaust Fan 45W',           qty: 3, category: 'Electrical & Lighting',    subcategory: 'Fans & Ventilation', brand: 'Orange', price: 3200, unit: 'pcs' },

  // ─── HAVELLS — VENTILAIR FANS ────────────────────────────────────────────
  { name: '[HVLS] Havells Ventilair Dx 200mm',                    qty: 1, category: 'Electrical & Lighting',    subcategory: 'Fans & Ventilation', brand: 'Havells', price: 5500, unit: 'pcs' },
  { name: '[HVLS] Havells Ventilair Dsp 300mm',                   qty: 2, category: 'Electrical & Lighting',    subcategory: 'Fans & Ventilation', brand: 'Havells', price: 9500, unit: 'pcs' },

  // ─── RANGE — WALL FAN ────────────────────────────────────────────────────
  { name: '[RNGE] Range Wall Fan RWF-020R 230V 50Hz',             qty: 1, category: 'Electrical & Lighting',    subcategory: 'Fans & Ventilation', brand: 'Range',  price: 6500, unit: 'pcs' },

  // ─── ALUMINIUM LADDER ────────────────────────────────────────────────────
  { name: 'Aluminium Multi Purpose Ladder 150kg',                  qty: 1, category: 'Hardware & Tools',         subcategory: 'Ladders & Access',   brand: 'Generic', price: 18500, unit: 'pcs' },

  // ─── PE+ — WATER TANKS ───────────────────────────────────────────────────
  { name: '[PE+] Pure Tech 3 Layer Water Tank 1100L Blue',         qty: 5, category: 'Plumbing & Water',         subcategory: 'Water Tanks',        brand: 'PE+',    price: 29500, unit: 'pcs' },
  { name: '[PE+] Blue Tech Premium Water Tank 1000L Black',        qty: 2, category: 'Plumbing & Water',         subcategory: 'Water Tanks',        brand: 'PE+',    price: 24500, unit: 'pcs' },

  // ─── ANTON — WATER TANKS ─────────────────────────────────────────────────
  { name: '[ANTN] Anton Max Triple Layer Tank 1000L Black',        qty: 2, category: 'Plumbing & Water',         subcategory: 'Water Tanks',        brand: 'Anton',  price: 22000, unit: 'pcs' },
  { name: '[ANTN] Anton Max Triple Layer Tank 500L',               qty: 1, category: 'Plumbing & Water',         subcategory: 'Water Tanks',        brand: 'Anton',  price: 13500, unit: 'pcs' },
  { name: '[ANTN] Anton Max Triple Layer Tank 2000L',              qty: 1, category: 'Plumbing & Water',         subcategory: 'Water Tanks',        brand: 'Anton',  price: 42000, unit: 'pcs' },

  // ─── YUMI — INDUSTRIAL FANS ──────────────────────────────────────────────
  { name: '[YUMI] YUMI GP 20" Industrial Ventilating Fan 350W',   qty: 1, category: 'Electrical & Lighting',    subcategory: 'Fans & Ventilation', brand: 'YUMI',   price:  9500, unit: 'pcs' },
  { name: '[YUMI] YUMI GP-18 Industrial Fan 220W',                 qty: 1, category: 'Electrical & Lighting',    subcategory: 'Fans & Ventilation', brand: 'YUMI',   price:  7500, unit: 'pcs' },

];

async function insertProductsBatch24() {
  console.log('🚀 Starting Batch 24 Product Insertion & Smart Stock Upsert...\n');
  console.log('📋 This batch contains the "In Front Markers" items MISSING from Batch 23\n');

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
  console.log(`✅ Using Warehouse: ${warehouse.name} (${warehouse.id})\n`);

  const allExisting = await prisma.product.findMany({
    where: { tenantId: shop.id },
    select: { id: true, name: true, sku: true },
  });

  const existingByName = new Map();
  const existingByModelCode = new Map();
  let maxHkuNum = 0;

  allExisting.forEach(p => {
    existingByName.set(p.name.toLowerCase().trim(), p);
    const modelMatch = p.name.match(/([A-Z0-9]{2,}-[A-Z0-9-]{3,})/i);
    if (modelMatch) existingByModelCode.set(modelMatch[1].toLowerCase().trim(), p);
    const hkuMatch = p.sku && p.sku.match(/HKU_(\d+)/i);
    if (hkuMatch) {
      const num = parseInt(hkuMatch[1], 10);
      if (num > maxHkuNum) maxHkuNum = num;
    }
  });

  let hkuIndex = maxHkuNum + 1;
  console.log(`📦 HKU sequence continuing automatically from: HKU_${String(hkuIndex).padStart(2, '0')}\n`);

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
    let existingProd = existingByName.get(item.name.toLowerCase().trim());
    if (!existingProd) {
      const modelMatch = item.name.match(/([A-Z0-9]{2,}-[A-Z0-9-]{3,})/i);
      if (modelMatch) existingProd = existingByModelCode.get(modelMatch[1].toLowerCase().trim());
    }

    if (existingProd) {
      const existingStock = await prisma.stock.findFirst({
        where: { productId: existingProd.id, warehouseId: warehouse.id, tenantId: shop.id },
      });
      if (existingStock) {
        const newQty   = Number(existingStock.quantity) + item.qty;
        const newAvail = Number(existingStock.availableQuantity ?? existingStock.quantity) + item.qty;
        await prisma.stock.update({
          where: { id: existingStock.id },
          data: { quantity: newQty, availableQuantity: newAvail },
        });
      } else {
        await prisma.stock.create({
          data: {
            tenantId: shop.id, productId: existingProd.id, warehouseId: warehouse.id,
            branchId, quantity: item.qty, availableQuantity: item.qty,
            reservedQuantity: 0, damagedQuantity: 0,
          },
        });
      }
      updatedCount++;
      console.log(`[STOCK+] ${existingProd.sku.padEnd(10)} | +${String(item.qty).padStart(3)} | ${item.name}`);
      continue;
    }

    // Resolve / create category
    let cat = catCache.get(item.category.toLowerCase());
    if (!cat) {
      cat = await prisma.category.create({ data: { tenantId: shop.id, name: item.category } });
      catCache.set(item.category.toLowerCase(), cat);
    }

    // Resolve / create subcategory
    let subCat = null;
    if (item.subcategory) {
      const subKey = `${item.category.toLowerCase()}::${item.subcategory.toLowerCase()}`;
      subCat = subCatCache.get(subKey);
      if (!subCat) {
        const existing = await prisma.category.findFirst({
          where: { tenantId: shop.id, name: item.subcategory, parentId: cat.id },
        });
        subCat = existing || await prisma.category.create({
          data: { tenantId: shop.id, name: item.subcategory, parentId: cat.id },
        });
        subCatCache.set(subKey, subCat);
      }
    }

    // Resolve / create brand
    let brand = null;
    if (item.brand && item.brand.toLowerCase() !== 'generic') {
      brand = brandCache.get(item.brand.toLowerCase());
      if (!brand) {
        const existing = await prisma.brand.findFirst({ where: { tenantId: shop.id, name: item.brand } });
        brand = existing || await prisma.brand.create({ data: { tenantId: shop.id, name: item.brand } });
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
        minimumStockLevel: 1, sellType: 'FIX', measurementUnit: item.unit || 'pcs',
      },
    });

    await prisma.stock.create({
      data: {
        tenantId: shop.id, productId: product.id, warehouseId: warehouse.id,
        branchId, quantity: item.qty, availableQuantity: item.qty,
        reservedQuantity: 0, damagedQuantity: 0,
      },
    });

    existingByName.set(item.name.toLowerCase().trim(), product);
    insertedCount++;
    console.log(`[NEW]    ${hkuCode.padEnd(10)} | Qty: ${String(item.qty).padStart(3)} | Rs. ${String(item.price).padStart(6)} | ${item.name}`);
  }

  console.log(`\n==============================================`);
  console.log(`✅ BATCH 24 COMPLETE!`);
  console.log(`✨ New Products Created: ${insertedCount}`);
  console.log(`🔄 Existing Products Stock Added: ${updatedCount}`);
  console.log(`🏷️  HKU Series now at: HKU_${String(hkuIndex - 1).padStart(2, '00')}`);
  console.log(`==============================================\n`);
}

insertProductsBatch24()
  .catch(e => {
    console.error('❌ Error executing Batch 24:', e);
    process.exit(1);
  })
  .finally(async () => {
    if (prisma) await prisma.$disconnect();
    if (pool) await pool.end();
  });
