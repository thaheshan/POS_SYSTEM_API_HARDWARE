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
// BATCH 11 — HKU Series (Auto-continues from last HKU number in DB)
// Source: 5 handwritten audit sheets (Switches, Power Tools, Bulbs, Lighting)
// ─────────────────────────────────────────────────────────────────────────────
const productsToInsert = [

  // ─── 1. ELECTRICAL SWITCHES, SOCKETS & BREAKERS ─────────────────────────────
  { name: '13A Single Socket Black',                         qty: 7,   category: 'Electronics', subcategory: 'Sockets & Plugs',        brand: 'Generic',   price: 850,   unit: 'pcs' },
  { name: 'Hotel Key Switch with Card White',                qty: 1,   category: 'Electronics', subcategory: 'Switches',                brand: 'Generic',   price: 2400,  unit: 'pcs' },
  { name: 'Kumbuk 2-Gang 2-Way Switch',                     qty: 9,   category: 'Electronics', subcategory: 'Switches',                brand: 'Kevilton',  price: 1450,  unit: 'pcs' },
  { name: 'Black 2-Gang 2-Way Switch',                      qty: 2,   category: 'Electronics', subcategory: 'Switches',                brand: 'Generic',   price: 980,   unit: 'pcs' },
  { name: 'Miniature Circuit Breaker (MCB)',                 qty: 1,   category: 'Electronics', subcategory: 'Circuit Breakers',        brand: 'Generic',   price: 850,   unit: 'pcs' },
  { name: 'Hexa Isolator',                                   qty: 1,   category: 'Electronics', subcategory: 'Circuit Breakers',        brand: 'Hexa',      price: 1650,  unit: 'pcs' },
  { name: 'Krypton 5-Gang 1-Way Switch',                    qty: 1,   category: 'Electronics', subcategory: 'Switches',                brand: 'Krypton',   price: 1850,  unit: 'pcs' },
  { name: 'Krypton 40A 2-Pole Isolator',                    qty: 1,   category: 'Electronics', subcategory: 'Circuit Breakers',        brand: 'Krypton',   price: 2100,  unit: 'pcs' },
  { name: 'Aelifu Signal Indicator',                         qty: 1,   category: 'Electronics', subcategory: 'Switches',                brand: 'Aelifu',    price: 650,   unit: 'pcs' },
  { name: 'Fanlight Dimmer Fan Controller',                  qty: 3,   category: 'Electronics', subcategory: 'Dimmers & Controllers',   brand: 'Generic',   price: 1100,  unit: 'pcs' },

  // ─── 2. POWER TOOLS & MACHINERY ───────────────────────────────────────────
  { name: 'EuroAqua PlumTec PVC Ball Valve 50mm',           qty: 11,  category: 'Plumbing',    subcategory: 'Valves',                  brand: 'EuroAqua',  price: 1650,  unit: 'pcs' },
  { name: 'Men Angle Grinder (720W)',                        qty: 10,  category: 'Tools',       subcategory: 'Power Tools',             brand: 'Men',       price: 9400,  unit: 'pcs' },
  { name: 'WaterTec PVC Ball Valve 63mm 2"',                 qty: 7,   category: 'Plumbing',    subcategory: 'Valves',                  brand: 'WaterTec',  price: 2400,  unit: 'pcs' },
  { name: 'Men Electric Sander (220W)',                      qty: 3,   category: 'Tools',       subcategory: 'Power Tools',             brand: 'Men',       price: 8500,  unit: 'pcs' },
  { name: 'Men Rotary Hammer (500W)',                        qty: 1,   category: 'Tools',       subcategory: 'Power Tools',             brand: 'Men',       price: 14500, unit: 'pcs' },
  { name: 'Men Circular Saw (1200W)',                        qty: 1,   category: 'Tools',       subcategory: 'Power Tools',             brand: 'Men',       price: 18500, unit: 'pcs' },
  { name: 'Men Bench Grinder (DIY-65)',                      qty: 1,   category: 'Tools',       subcategory: 'Power Tools',             brand: 'Men',       price: 16500, unit: 'pcs' },
  { name: 'Men Impact Drill (1100W)',                        qty: 1,   category: 'Tools',       subcategory: 'Power Tools',             brand: 'Men',       price: 11500, unit: 'pcs' },
  { name: 'Men Electric Sander (300W)',                      qty: 1,   category: 'Tools',       subcategory: 'Power Tools',             brand: 'Men',       price: 9800,  unit: 'pcs' },
  { name: 'Makute Electric Drill (450W)',                    qty: 1,   category: 'Tools',       subcategory: 'Power Tools',             brand: 'Makute',    price: 7800,  unit: 'pcs' },
  { name: 'Men Electric Drill (450W)',                       qty: 1,   category: 'Tools',       subcategory: 'Power Tools',             brand: 'Men',       price: 7200,  unit: 'pcs' },
  { name: 'Men Electric Concrete Vibrator (1850W)',          qty: 2,   category: 'Tools',       subcategory: 'Power Tools',             brand: 'Men',       price: 22500, unit: 'pcs' },
  { name: 'Men Marble Cutter (1050W)',                       qty: 1,   category: 'Tools',       subcategory: 'Power Tools',             brand: 'Men',       price: 10500, unit: 'pcs' },
  { name: 'Hydraulic Jack (3Ton)',                           qty: 3,   category: 'Tools',       subcategory: 'Lifting Equipment',       brand: 'Generic',   price: 8500,  unit: 'pcs' },
  { name: 'Makute Laser Level (L2205)',                      qty: 1,   category: 'Tools',       subcategory: 'Measuring Tools',         brand: 'Makute',    price: 14500, unit: 'pcs' },
  { name: 'Digital Electric Scale (4kg)',                    qty: 1,   category: 'Tools',       subcategory: 'Measuring Tools',         brand: 'Generic',   price: 6500,  unit: 'pcs' },

  // ─── 3. BULBS — INCANDESCENT ───────────────────────────────────────────────
  { name: 'Incandescent Bulb 60W',                           qty: 1,   category: 'Electronics', subcategory: 'Bulbs',                  brand: 'Generic',   price: 140,   unit: 'pcs' },
  { name: 'Incandescent Bulb 100W',                          qty: 11,  category: 'Electronics', subcategory: 'Bulbs',                  brand: 'Generic',   price: 160,   unit: 'pcs' },

  // ─── 4. BULBS — ORANGE ────────────────────────────────────────────────────
  { name: 'Orange LED Panel Light 12W',                      qty: 1,   category: 'Electronics', subcategory: 'Lighting',               brand: 'Orange',    price: 1450,  unit: 'pcs' },
  { name: 'Orange High Power LED Bulb 40W',                  qty: 5,   category: 'Electronics', subcategory: 'Bulbs',                  brand: 'Orange',    price: 2800,  unit: 'pcs' },

  // ─── 5. BULBS — MING LED ──────────────────────────────────────────────────
  { name: 'Ming LED Candle Bulb 5W',                         qty: 3,   category: 'Electronics', subcategory: 'Bulbs',                  brand: 'Ming',      price: 380,   unit: 'pcs' },
  { name: 'Ming LED Bulb 38W',                               qty: 3,   category: 'Electronics', subcategory: 'Bulbs',                  brand: 'Ming',      price: 2200,  unit: 'pcs' },
  { name: 'Ming LED Bulb 28W',                               qty: 3,   category: 'Electronics', subcategory: 'Bulbs',                  brand: 'Ming',      price: 1750,  unit: 'pcs' },
  { name: 'Ming LED Bulb 7W',                                qty: 1,   category: 'Electronics', subcategory: 'Bulbs',                  brand: 'Ming',      price: 420,   unit: 'pcs' },
  { name: 'Ming LED Bulb 18W',                               qty: 61,  category: 'Electronics', subcategory: 'Bulbs',                  brand: 'Ming',      price: 980,   unit: 'pcs' },
  { name: 'Ming LED Bulb 9W',                                qty: 1,   category: 'Electronics', subcategory: 'Bulbs',                  brand: 'Ming',      price: 480,   unit: 'pcs' },
  { name: 'Ming LED Bulb 15W',                               qty: 59,  category: 'Electronics', subcategory: 'Bulbs',                  brand: 'Ming',      price: 850,   unit: 'pcs' },
  { name: 'Ming LED Bulb 12W',                               qty: 2,   category: 'Electronics', subcategory: 'Bulbs',                  brand: 'Ming',      price: 680,   unit: 'pcs' },

  // ─── 6. BULBS — MASTER ────────────────────────────────────────────────────
  { name: 'Master LED Bulb 28W',                             qty: 4,   category: 'Electronics', subcategory: 'Bulbs',                  brand: 'Master',    price: 1650,  unit: 'pcs' },
  { name: 'Zenon LED Bulb 20W',                              qty: 5,   category: 'Electronics', subcategory: 'Bulbs',                  brand: 'Zenon',     price: 1250,  unit: 'pcs' },

  // ─── 7. BULBS — MAXBA ────────────────────────────────────────────────────
  { name: 'Maxba Energized LED Bulb 5W',                    qty: 23,  category: 'Electronics', subcategory: 'Bulbs',                  brand: 'Maxba',     price: 350,   unit: 'pcs' },
  { name: 'Maxba Energized LED Bulb 7W',                    qty: 10,  category: 'Electronics', subcategory: 'Bulbs',                  brand: 'Maxba',     price: 420,   unit: 'pcs' },
  { name: 'Maxba Energized LED Bulb 12W',                   qty: 5,   category: 'Electronics', subcategory: 'Bulbs',                  brand: 'Maxba',     price: 650,   unit: 'pcs' },
  { name: 'Maxba Energized LED Bulb 15W',                   qty: 1,   category: 'Electronics', subcategory: 'Bulbs',                  brand: 'Maxba',     price: 780,   unit: 'pcs' },
  { name: 'Maxba Square Panel Light 18W White',             qty: 8,   category: 'Electronics', subcategory: 'Lighting',               brand: 'Maxba',     price: 1650,  unit: 'pcs' },
  { name: 'Maxba LED Bulb 9W',                              qty: 3,   category: 'Electronics', subcategory: 'Bulbs',                  brand: 'Maxba',     price: 450,   unit: 'pcs' },
  { name: 'Maxba Wide Angle LED Bulb 5W',                   qty: 156, category: 'Electronics', subcategory: 'Bulbs',                  brand: 'Maxba',     price: 380,   unit: 'pcs' },
  { name: 'Maxba LED Bulb 60W',                             qty: 24,  category: 'Electronics', subcategory: 'Bulbs',                  brand: 'Maxba',     price: 3400,  unit: 'pcs' },

  // ─── 8. SPOTLIGHTS — MODISH ───────────────────────────────────────────────
  { name: 'Modish Spotlight 5W Warm White Black',           qty: 54,  category: 'Electronics', subcategory: 'Lighting',               brand: 'Modish',    price: 1250,  unit: 'pcs' },
  { name: 'Modish 3W Spotlight COB White+Red',              qty: 37,  category: 'Electronics', subcategory: 'Lighting',               brand: 'Modish',    price: 980,   unit: 'pcs' },

  // ─── 9. BULBS — LAXAPANA, POLYCROME, KEVILTON, YUMI ─────────────────────
  { name: 'Laxapana LED Bulb 12W',                          qty: 1,   category: 'Electronics', subcategory: 'Bulbs',                  brand: 'Laxapana',  price: 720,   unit: 'pcs' },
  { name: 'Laxapana LED Bulb 15W',                          qty: 1,   category: 'Electronics', subcategory: 'Bulbs',                  brand: 'Laxapana',  price: 880,   unit: 'pcs' },
  { name: 'Polycrome LED Bulb 20W',                         qty: 4,   category: 'Electronics', subcategory: 'Bulbs',                  brand: 'Polycrome', price: 1350,  unit: 'pcs' },
  { name: 'Yumi LED Bulb 2W',                               qty: 5,   category: 'Electronics', subcategory: 'Bulbs',                  brand: 'Yumi',      price: 280,   unit: 'pcs' },
  { name: 'Yumi LED Bulb 4W',                               qty: 6,   category: 'Electronics', subcategory: 'Bulbs',                  brand: 'Yumi',      price: 350,   unit: 'pcs' },
  { name: 'Kevilton LED Bulb 12W',                          qty: 1,   category: 'Electronics', subcategory: 'Bulbs',                  brand: 'Kevilton',  price: 780,   unit: 'pcs' },
  { name: 'Safetea LED Bulb 15W',                           qty: 2,   category: 'Electronics', subcategory: 'Bulbs',                  brand: 'Safetea',   price: 850,   unit: 'pcs' },

  // ─── 10. SURFACE LIGHTS — KOBE ───────────────────────────────────────────
  { name: 'KOBE Surface Light Black 15W Round',             qty: 12,  category: 'Electronics', subcategory: 'Lighting',               brand: 'KOBE',      price: 1850,  unit: 'pcs' },
  { name: 'KOBE Surface Light Black 15W Square',            qty: 12,  category: 'Electronics', subcategory: 'Lighting',               brand: 'KOBE',      price: 1850,  unit: 'pcs' },

  // ─── 11. DECORATIVE LIGHTS — CBE ─────────────────────────────────────────
  { name: 'CBE Crystal Light 3W',                           qty: 10,  category: 'Electronics', subcategory: 'Decorative Lighting',    brand: 'CBE',       price: 1450,  unit: 'pcs' },
  { name: 'CBE Lotus Light 3W',                             qty: 8,   category: 'Electronics', subcategory: 'Decorative Lighting',    brand: 'CBE',       price: 1650,  unit: 'pcs' },

  // ─── 12. RGB CONTROLLER ───────────────────────────────────────────────────
  { name: 'RGB LED Controller 1500W 16-Color',              qty: 15,  category: 'Electronics', subcategory: 'Dimmers & Controllers',  brand: 'Generic',   price: 2400,  unit: 'pcs' },

  // ─── 13. FLOOD LIGHTS ─────────────────────────────────────────────────────
  { name: 'Gaojiang LED Flood Light 10W/20W',               qty: 1,   category: 'Electronics', subcategory: 'Flood Lights',           brand: 'Gaojiang',  price: 2200,  unit: 'pcs' },
  { name: 'Mini Party Light RGB',                            qty: 4,   category: 'Electronics', subcategory: 'Decorative Lighting',    brand: 'Generic',   price: 1850,  unit: 'pcs' },
  { name: 'Gaojiang LED 10W Flood Light',                   qty: 5,   category: 'Electronics', subcategory: 'Flood Lights',           brand: 'Gaojiang',  price: 1950,  unit: 'pcs' },
  { name: 'Apple Mini Flood Light',                          qty: 2,   category: 'Electronics', subcategory: 'Flood Lights',           brand: 'Apple Mini',price: 1850,  unit: 'pcs' },
  { name: 'Gaojiang LED 20W Flood Light',                   qty: 1,   category: 'Electronics', subcategory: 'Flood Lights',           brand: 'Gaojiang',  price: 2600,  unit: 'pcs' },

  // ─── 14. POWER SUPPLIES ───────────────────────────────────────────────────
  { name: 'LED Power Supply 12V 200W',                      qty: 1,   category: 'Electronics', subcategory: 'Power Supplies',         brand: 'Generic',   price: 3800,  unit: 'pcs' },
  { name: 'LED Power Supply 12V 300W',                      qty: 2,   category: 'Electronics', subcategory: 'Power Supplies',         brand: 'Generic',   price: 4800,  unit: 'pcs' },
  { name: 'Cross Lamp Outdoor Light',                       qty: 1,   category: 'Electronics', subcategory: 'Outdoor Lighting',       brand: 'Generic',   price: 3200,  unit: 'pcs' },

  // ─── 15. LGL & WIREMAN ────────────────────────────────────────────────────
  { name: 'LGL LED Bulb 8W',                                qty: 1,   category: 'Electronics', subcategory: 'Bulbs',                  brand: 'LGL',       price: 450,   unit: 'pcs' },
  { name: 'Wireman Electric Daylight Bulb 3W',              qty: 1,   category: 'Electronics', subcategory: 'Bulbs',                  brand: 'Wireman',   price: 320,   unit: 'pcs' },

  // ─── 16. HEDANS LIGHTING ─────────────────────────────────────────────────
  { name: 'Hedans Moon Surface Light 12W',                  qty: 1,   category: 'Electronics', subcategory: 'Lighting',               brand: 'Hedans',    price: 1650,  unit: 'pcs' },
  { name: 'Hedans Panel Light Square 18W',                  qty: 2,   category: 'Electronics', subcategory: 'Lighting',               brand: 'Hedans',    price: 1850,  unit: 'pcs' },

  // ─── 17. FILAMENT & ANTIQUE BULBS ────────────────────────────────────────
  { name: 'LED Filament Bulb 4W 2700K',                     qty: 14,  category: 'Electronics', subcategory: 'Bulbs',                  brand: 'Generic',   price: 680,   unit: 'pcs' },
  { name: 'Antique Edison Bulb ST64 6W',                    qty: 2,   category: 'Electronics', subcategory: 'Bulbs',                  brand: 'Generic',   price: 980,   unit: 'pcs' },
];

async function insertProductsBatch11() {
  console.log('🚀 Starting Batch 11 Product Insertion & Smart Stock Upsert...\n');

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

      const product = await prisma.product.create({
        data: {
          tenantId: shop.id, name: item.name, sku: hkuCode, barcode,
          categoryId: cat.id, subcategoryId: subCat?.id || null, brandId: brand?.id || null,
          sellingPrice: item.price, purchasePrice: Math.round(item.price * 0.72),
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

  console.log(`\n🎉 BATCH 11 COMPLETE!`);
  console.log(`   ✅ New Products Inserted : ${insertedCount}`);
  console.log(`   🔄 Existing Stock Updated: ${updatedCount}`);
  console.log(`   📋 HKU series now at     : HKU_${String(hkuIndex - 1).padStart(2, '0')}`);
}

insertProductsBatch11()
  .catch(e => { console.error('❌ Error:', e.message); process.exit(1); })
  .finally(() => { prisma.$disconnect(); if (pool) pool.end(); });
