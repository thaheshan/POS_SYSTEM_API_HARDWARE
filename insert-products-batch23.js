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
// BATCH 23 — HKU Series (Electrical Switches, Sockets, MCBs & RCDs)
// Source: Handwritten stock audit — Orange Casablanca, Monaco, Scintilla,
//         Alpha MCB/RCCB/RCD/Isolator, Sigma RCD, MCB Changeover
// ─────────────────────────────────────────────────────────────────────────────
const productsToInsert = [

  // ─── ORANGE — CASABLANCA SWITCHES & SOCKETS ──────────────────────────────
  { name: '[CSB] Orange Casablanca 2 Gang Socket',                   qty:  1,  category: 'Electrical & Lighting', subcategory: 'Switches & Sockets', brand: 'Orange', price:  650, unit: 'pcs' },
  { name: '[CSB] Orange Casablanca 1G 4 Wire TP Socket',             qty:  9,  category: 'Electrical & Lighting', subcategory: 'Switches & Sockets', brand: 'Orange', price:  850, unit: 'pcs' },
  { name: '[CSB] Orange Casablanca 75 Ohm TV Outlet',                qty: 20,  category: 'Electrical & Lighting', subcategory: 'Switches & Sockets', brand: 'Orange', price:  550, unit: 'pcs' },
  { name: '[CSB] Orange Casablanca 1 Gang 2 Way Switch',             qty: 25,  category: 'Electrical & Lighting', subcategory: 'Switches & Sockets', brand: 'Orange', price:  450, unit: 'pcs' },
  { name: '[CSB] Orange Casablanca 4 Gang 1 Way Switch',             qty: 15,  category: 'Electrical & Lighting', subcategory: 'Switches & Sockets', brand: 'Orange', price:  950, unit: 'pcs' },
  { name: '[CSB] Orange Casablanca 3 Gang 1 Way Switch',             qty: 10,  category: 'Electrical & Lighting', subcategory: 'Switches & Sockets', brand: 'Orange', price:  750, unit: 'pcs' },
  { name: '[CSB] Orange Casablanca 2 Gang 1 Way Switch',             qty: 16,  category: 'Electrical & Lighting', subcategory: 'Switches & Sockets', brand: 'Orange', price:  600, unit: 'pcs' },
  { name: '[CSB] Orange Casablanca 2 Gang 2 Way Switch',             qty: 11,  category: 'Electrical & Lighting', subcategory: 'Switches & Sockets', brand: 'Orange', price:  750, unit: 'pcs' },
  { name: '[CSB] Orange Casablanca 1 Gang 1 Way Switch',             qty: 16,  category: 'Electrical & Lighting', subcategory: 'Switches & Sockets', brand: 'Orange', price:  350, unit: 'pcs' },
  { name: '[CSB] Orange Casablanca 5 Step Humfree Fan Control',      qty: 10,  category: 'Electrical & Lighting', subcategory: 'Switches & Sockets', brand: 'Orange', price: 1200, unit: 'pcs' },
  { name: '[CSB] Orange Casablanca 1 Gang Socket',                   qty:  1,  category: 'Electrical & Lighting', subcategory: 'Switches & Sockets', brand: 'Orange', price:  450, unit: 'pcs' },
  { name: '[CSB] Orange Casablanca 1 Gang 2 Way Bell Press Switch',  qty: 18,  category: 'Electrical & Lighting', subcategory: 'Switches & Sockets', brand: 'Orange', price:  450, unit: 'pcs' },
  { name: '[CSB] Orange Casablanca 10A 1 Gang 2 Way Bell Press',     qty:  6,  category: 'Electrical & Lighting', subcategory: 'Switches & Sockets', brand: 'Orange', price:  550, unit: 'pcs' },
  { name: '[CSB] Orange Casablanca 3 Gang 2 Way Switch',             qty: 12,  category: 'Electrical & Lighting', subcategory: 'Switches & Sockets', brand: 'Orange', price:  850, unit: 'pcs' },
  { name: '[CSB] Orange Casablanca 4 Gang 2 Way Switch',             qty:  8,  category: 'Electrical & Lighting', subcategory: 'Switches & Sockets', brand: 'Orange', price: 1100, unit: 'pcs' },
  { name: '[CSB] Orange Casablanca 5 Gang 1 Way Switch',             qty:  8,  category: 'Electrical & Lighting', subcategory: 'Switches & Sockets', brand: 'Orange', price: 1150, unit: 'pcs' },

  // ─── ORANGE — CASABLANCA AKOYA FAN CONTROLLERS ───────────────────────────
  { name: '[CSB] Orange Akoya Step 5 Fan Controller',                qty:  1,  category: 'Electrical & Lighting', subcategory: 'Switches & Sockets', brand: 'Orange', price: 1350, unit: 'pcs' },
  { name: '[CSB] Orange Akoya 400W Fan Control',                     qty:  4,  category: 'Electrical & Lighting', subcategory: 'Switches & Sockets', brand: 'Orange', price: 1100, unit: 'pcs' },

  // ─── ORANGE — MONACO ─────────────────────────────────────────────────────
  { name: '[MON] Orange Monaco Blank Plate Removable Plug',          qty: 15,  category: 'Electrical & Lighting', subcategory: 'Switches & Sockets', brand: 'Orange', price:  220, unit: 'pcs' },

  // ─── ORANGE — SCINTILLA ──────────────────────────────────────────────────
  { name: '[SCI] Orange Scintilla 13A Single Socket Outlet',         qty: 52,  category: 'Electrical & Lighting', subcategory: 'Switches & Sockets', brand: 'Orange', price:  450, unit: 'pcs' },

  // ─── ALPHA — MCB 1 POLE ──────────────────────────────────────────────────
  { name: '[ALP] Alpha MCB 1 Pole 32A',                              qty: 16,  category: 'Electrical & Lighting', subcategory: 'Circuit Protection',  brand: 'Alpha',  price: 1500, unit: 'pcs' },
  { name: '[ALP] Alpha MCB 1 Pole 20A',                              qty:  1,  category: 'Electrical & Lighting', subcategory: 'Circuit Protection',  brand: 'Alpha',  price: 1200, unit: 'pcs' },
  { name: '[ALP] Alpha MCB 1 Pole 16A',                              qty: 46,  category: 'Electrical & Lighting', subcategory: 'Circuit Protection',  brand: 'Alpha',  price: 1000, unit: 'pcs' },
  { name: '[ALP] Alpha MCB 1 Pole 10A',                              qty: 43,  category: 'Electrical & Lighting', subcategory: 'Circuit Protection',  brand: 'Alpha',  price:  850, unit: 'pcs' },

  // ─── ALPHA — RCCB, ISOLATOR, RCD ─────────────────────────────────────────
  { name: '[ALP] Alpha RCCB 2 Pole',                                 qty:  1,  category: 'Electrical & Lighting', subcategory: 'Circuit Protection',  brand: 'Alpha',  price: 4200, unit: 'pcs' },
  { name: '[ALP] Alpha Isolator 2 Pole',                             qty:  3,  category: 'Electrical & Lighting', subcategory: 'Circuit Protection',  brand: 'Alpha',  price: 3000, unit: 'pcs' },
  { name: '[ALP] Alpha RCD 2 Pole',                                  qty: 15,  category: 'Electrical & Lighting', subcategory: 'Circuit Protection',  brand: 'Alpha',  price: 3500, unit: 'pcs' },

  // ─── SIGMA — RCD 2 POLE ──────────────────────────────────────────────────
  { name: '[SIG] Sigma RCD 2 Pole 40A 100mA',                       qty:  4,  category: 'Electrical & Lighting', subcategory: 'Circuit Protection',  brand: 'Sigma',  price: 4500, unit: 'pcs' },
  { name: '[SIG] Sigma RCD 2 Pole 40A 30mA',                        qty:  9,  category: 'Electrical & Lighting', subcategory: 'Circuit Protection',  brand: 'Sigma',  price: 5000, unit: 'pcs' },
  { name: '[SIG] Sigma RCD 2 Pole 63A',                              qty:  1,  category: 'Electrical & Lighting', subcategory: 'Circuit Protection',  brand: 'Sigma',  price: 6500, unit: 'pcs' },
  { name: '[SIG] Sigma RCD 2 Pole 10A',                              qty:  1,  category: 'Electrical & Lighting', subcategory: 'Circuit Protection',  brand: 'Sigma',  price: 3000, unit: 'pcs' },

  // ─── MCB CHANGE OVER ─────────────────────────────────────────────────────
  { name: 'MCB Type Change Over',                                     qty: 10,  category: 'Electrical & Lighting', subcategory: 'Circuit Protection',  brand: 'Generic', price: 5500, unit: 'pcs' },

];

async function insertProductsBatch23() {
  console.log('🚀 Starting Batch 23 Product Insertion & Smart Stock Upsert...\n');

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

  // ── Name normalization: detects abbreviated vs full-name duplicates ──────
  // e.g. "2G 2W Switch" and "2 Gang 2 Way Switch" → same normalized key
  function normalizeName(raw) {
    let n = (raw || '').toLowerCase().trim();
    n = n.replace(/^\[[^\]]+\]\s*/g, '');           // strip [CSB], [ALP] etc.
    n = n.replace(/\b([1-9])\s*-?\s*gang\b/g, '$1gang');
    n = n.replace(/\b([1-9])g\b/g, '$1gang');       // 2g → 2gang
    n = n.replace(/\b([12])\s*-?\s*way\b/g, '$1way');
    n = n.replace(/\b([12])w\b/g, '$1way');         // 2w → 2way (safe: only single digit)
    n = n.replace(/\bs\s*\/\s*socket\b/g, 'socket');
    n = n.replace(/[.\-_\/\\]+/g, ' ');
    return n.replace(/\s+/g, ' ').trim();
  }
  // ────────────────────────────────────────────────────────────────────────

  const allExisting = await prisma.product.findMany({
    where: { tenantId: shop.id },
    select: { id: true, name: true, sku: true },
  });

  const existingByName = new Map();
  const existingByNormName = new Map();  // normalized name lookup
  const existingByModelCode = new Map();
  let maxHkuNum = 0;

  allExisting.forEach(p => {
    existingByName.set(p.name.toLowerCase().trim(), p);
    existingByNormName.set(normalizeName(p.name), p);   // ← normalized fallback
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
    // 1. Exact name match
    let existingProd = existingByName.get(item.name.toLowerCase().trim());
    // 2. Model code match (e.g. WP-30K, DBKKK)
    if (!existingProd) {
      const modelMatch = item.name.match(/([A-Z0-9]{2,}-[A-Z0-9-]{3,})/i);
      if (modelMatch) existingProd = existingByModelCode.get(modelMatch[1].toLowerCase().trim());
    }
    // 3. Normalized name match — catches "2G 2W" vs "2 Gang 2 Way" duplicates
    if (!existingProd) {
      existingProd = existingByNormName.get(normalizeName(item.name));
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
        minimumStockLevel: 2, sellType: 'FIX', measurementUnit: item.unit || 'pcs',
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
  console.log(`✅ BATCH 23 COMPLETE!`);
  console.log(`✨ New Products Created: ${insertedCount}`);
  console.log(`🔄 Existing Products Stock Added: ${updatedCount}`);
  console.log(`🏷️  HKU Series now at: HKU_${String(hkuIndex - 1).padStart(2, '00')}`);
  console.log(`==============================================\n`);
}

insertProductsBatch23()
  .catch(e => {
    console.error('❌ Error executing Batch 23:', e);
    process.exit(1);
  })
  .finally(async () => {
    if (prisma) await prisma.$disconnect();
    if (pool) await pool.end();
  });
