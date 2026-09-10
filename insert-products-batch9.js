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
// BATCH 9 — HKU Series (Auto-continues from HKU_474 in DB)
// Source: Handwritten stock audit pages (Electrical, Machinery, Tools, Paint Brushes)
// Note: Includes all secret codes, model numbers, and technical specs in names.
// ─────────────────────────────────────────────────────────────────────────────
const productsToInsert = [

  // ─── 1. ELECTRICAL & APPLIANCES ─────────────────────────────────────────────
  { name: 'Orange Electric Exhaust Fan 8"',                 qty: 3,  category: 'Electronics', subcategory: 'Fans',              brand: 'Orange Electric', price: 6800,  unit: 'pcs' },
  { name: 'Orange Electric Exhaust Fan 10"',                qty: 5,  category: 'Electronics', subcategory: 'Fans',              brand: 'Orange Electric', price: 7400,  unit: 'pcs' },
  { name: 'LGTL Gate Post Lamp (S-EF-GPL-003)',            qty: 1,  category: 'Electronics', subcategory: 'Outdoor Lighting', brand: 'LGTL',           price: 4200,  unit: 'pcs' },
  { name: 'Dajiang Swing Switch',                           qty: 1,  category: 'Electronics', subcategory: 'Switches',          brand: 'Dajiang',        price: 1450,  unit: 'pcs' },
  { name: 'KDK Electric Ceiling Fan',                       qty: 1,  category: 'Electronics', subcategory: 'Fans',              brand: 'KDK',            price: 18500, unit: 'pcs' },
  { name: 'Panasonic AA Battery 1.5V (33pcs)',              qty: 33, category: 'Electronics', subcategory: 'Batteries',         brand: 'Panasonic',      price: 120,   unit: 'pcs' },

  // ─── 2. POWER TOOLS & MACHINERY ────────────────────────────────────────────
  { name: 'Men Demolition Hammer (2200W)',                 qty: 1,  category: 'Tools',       subcategory: 'Power Tools',       brand: 'Men',            price: 34500, unit: 'pcs' },
  { name: 'Men Angle Grinder',                              qty: 10, category: 'Tools',       subcategory: 'Power Tools',       brand: 'Men',            price: 9800,  unit: 'pcs' },
  { name: 'EXOL Water Motor 2" 2HP (EXS2.00HP)',            qty: 1,  category: 'Plumbing',    subcategory: 'Pumps & Motors',    brand: 'EXOL',           price: 48500, unit: 'pcs' },
  { name: 'Browns Lion Brush Cutter (HYP328A)',             qty: 4,  category: 'Tools',       subcategory: 'Power Tools',       brand: 'Lion by Browns', price: 38000, unit: 'pcs' },
  { name: 'Pneumatic Nail Gun',                             qty: 1,  category: 'Tools',       subcategory: 'Power Tools',       brand: 'Generic',        price: 14500, unit: 'pcs' },
  { name: 'Karcher Car Kit (Compact)',                      qty: 1,  category: 'Tools',       subcategory: 'Pressure Washers',  brand: 'Karcher',        price: 28000, unit: 'pcs' },

  // ─── 3. CUTTING, GRINDING & POLISHING ACCESSORIES ──────────────────────────
  { name: 'Husky Cup Wheel (Φ4 -> 1/2")',                   qty: 3,  category: 'Tools',       subcategory: 'Cutting & Abrasives', brand: 'Husky',       price: 1850,  unit: 'pcs' },
  { name: 'Bosun Cup Wheel',                                qty: 40, category: 'Tools',       subcategory: 'Cutting & Abrasives', brand: 'Bosun',       price: 1650,  unit: 'pcs' },
  { name: 'Ouruisi Star Diamond Blade 4" 10mm',             qty: 6,  category: 'Tools',       subcategory: 'Cutting & Abrasives', brand: 'Ouruisi Star',price: 1250,  unit: 'pcs' },
  { name: 'Bosun Diamond Cup Wheel',                        qty: 10, category: 'Tools',       subcategory: 'Cutting & Abrasives', brand: 'Bosun',       price: 2100,  unit: 'pcs' },
  { name: 'Polishing Pad 4"',                               qty: 19, category: 'Tools',       subcategory: 'Polishing & Abrasives', brand: 'Generic',   price: 450,   unit: 'pcs' },
  { name: 'Polishing Pad 4 1/2"',                           qty: 10, category: 'Tools',       subcategory: 'Polishing & Abrasives', brand: 'Generic',   price: 520,   unit: 'pcs' },
  { name: 'SALI Diamond Saw Blade (To be topa)',            qty: 8,  category: 'Tools',       subcategory: 'Cutting & Abrasives', brand: 'SALI',        price: 1450,  unit: 'pcs' },
  { name: 'Husky Turbo Disc Φ4"',                           qty: 18, category: 'Tools',       subcategory: 'Cutting & Abrasives', brand: 'Husky',       price: 1150,  unit: 'pcs' },
  { name: 'Husky Turbo Supercut Ceramic Disc Φ4"',          qty: 22, category: 'Tools',       subcategory: 'Cutting & Abrasives', brand: 'Husky',       price: 1350,  unit: 'pcs' },
  { name: 'Turbo Disc Cutting Wheel Φ4 1/2"',               qty: 1,  category: 'Tools',       subcategory: 'Cutting & Abrasives', brand: 'Turbo Disc',  price: 680,   unit: 'pcs' },
  { name: 'BKH Multifunction Cutting Disc 4.5"',            qty: 6,  category: 'Tools',       subcategory: 'Cutting & Abrasives', brand: 'BKH',         price: 850,   unit: 'pcs' },

  // ─── 4. HARDWARE, SANITARYWARE & CLEANING SUPPLIES ─────────────────────────
  { name: 'Smart Duo Dustpan Set',                          qty: 1,  category: 'Cleaning',    subcategory: 'Cleaning Tools',    brand: 'Generic',        price: 1200,  unit: 'set' },
  { name: 'Plastic Broom (Leather)',                       qty: 1,  category: 'Cleaning',    subcategory: 'Cleaning Tools',    brand: 'Leather',        price: 650,   unit: 'pcs' },
  { name: 'Cobweb Brush (Leather)',                        qty: 21, category: 'Cleaning',    subcategory: 'Cleaning Tools',    brand: 'Leather',        price: 750,   unit: 'pcs' },
  { name: 'Hard Brush (Leather)',                           qty: 4,  category: 'Cleaning',    subcategory: 'Cleaning Tools',    brand: 'Leather',        price: 580,   unit: 'pcs' },
  { name: 'Dust Mop (Leather)',                             qty: 1,  category: 'Cleaning',    subcategory: 'Cleaning Tools',    brand: 'Leather',        price: 1450,  unit: 'pcs' },
  { name: 'Globe Toilet Set',                               qty: 2,  category: 'Plumbing',    subcategory: 'Sanitaryware',      brand: 'Globe',          price: 28500, unit: 'set' },
  { name: 'Globe Water Tank',                               qty: 1,  category: 'Plumbing',    subcategory: 'Water Storage',     brand: 'Globe',          price: 38000, unit: 'pcs' },
  { name: 'Wesda Stainless Steel Rack',                     qty: 3,  category: 'Hardware',    subcategory: 'Bathroom Accessories', brand: 'Wesda',       price: 4500,  unit: 'pcs' },
  { name: 'Bedford Bathroom Cistern Fittings',             qty: 7,  category: 'Plumbing',    subcategory: 'Sanitaryware',      brand: 'Bedford',        price: 2800,  unit: 'set' },

  // ─── 5. PAINT BRUSHES (RAVI, MULTILAC, NIPPON, JAI) ────────────────────────
  { name: 'Ravi Economy Paint Brush 2"',                    qty: 24, category: 'Paints',      subcategory: 'Brushes & Rollers', brand: 'Ravi Economy',   price: 320,   unit: '2" (50mm)' },
  { name: 'Ravi Economy Paint Brush 2" (50mm)',             qty: 21, category: 'Paints',      subcategory: 'Brushes & Rollers', brand: 'Ravi Economy',   price: 320,   unit: '2" (50mm)' },
  { name: 'Ravi Economy Paint Brush 3" (76mm)',             qty: 5,  category: 'Paints',      subcategory: 'Brushes & Rollers', brand: 'Ravi Economy',   price: 450,   unit: '3" (76mm)' },
  { name: 'Ravi Timbermate Paint Brush 2" (50mm)',          qty: 20, category: 'Paints',      subcategory: 'Brushes & Rollers', brand: 'Ravi Timbermate',price: 380,   unit: '2" (50mm)' },
  { name: 'Ravi Timbermate Paint Brush 1 1/2" (38mm)',      qty: 13, category: 'Paints',      subcategory: 'Brushes & Rollers', brand: 'Ravi Timbermate',price: 310,   unit: '1 1/2" (38mm)' },
  { name: 'Multilac Paint Brush 3" (75mm)',                 qty: 12, category: 'Paints',      subcategory: 'Brushes & Rollers', brand: 'Multilac',       price: 420,   unit: '3" (75mm)' },
  { name: 'Multilac Paint Brush 3/4" (19mm)',              qty: 5,  category: 'Paints',      subcategory: 'Brushes & Rollers', brand: 'Multilac',       price: 180,   unit: '3/4" (19mm)' },
  { name: 'Multilac Paint Brush 4" (100mm)',                qty: 11, category: 'Paints',      subcategory: 'Brushes & Rollers', brand: 'Multilac',       price: 580,   unit: '4" (100mm)' },
  { name: 'Multilac Paint Brush 5" (125mm)',                qty: 14, category: 'Paints',      subcategory: 'Brushes & Rollers', brand: 'Multilac',       price: 720,   unit: '5" (125mm)' },
  { name: 'Nippon Paint Brush 3" (75mm)',                   qty: 5,  category: 'Paints',      subcategory: 'Brushes & Rollers', brand: 'Nippon',         price: 460,   unit: '3" (75mm)' },
  { name: 'Nippon Paint Brush 5"',                          qty: 3,  category: 'Paints',      subcategory: 'Brushes & Rollers', brand: 'Nippon',         price: 750,   unit: '5"' },
  { name: 'Jai Paints Paint Brush 6" (152mm)',              qty: 6,  category: 'Paints',      subcategory: 'Brushes & Rollers', brand: 'Jai Paints',     price: 950,   unit: '6" (152mm)' },
  { name: 'Jai Paints Paint Brush 5" (127mm)',              qty: 8,  category: 'Paints',      subcategory: 'Brushes & Rollers', brand: 'Jai Paints',     price: 780,   unit: '5" (127mm)' },
  { name: 'Jai Paints Paint Brush 4" (100mm)',              qty: 2,  category: 'Paints',      subcategory: 'Brushes & Rollers', brand: 'Jai Paints',     price: 620,   unit: '4" (100mm)' },
  { name: 'Jai Paints Paint Brush 3" (75mm)',              qty: 6,  category: 'Paints',      subcategory: 'Brushes & Rollers', brand: 'Jai Paints',     price: 440,   unit: '3" (75mm)' },

  // ─── 6. WOOD FINISH ────────────────────────────────────────────────────────
  { name: 'Sayerlack Innovative Wood Solutions Burma Teak 4L', qty: 2, category: 'Paints',    subcategory: 'Wood Finishes',     brand: 'Sayerlack',      price: 9800,  unit: '4L' },
];

async function insertProductsBatch9() {
  console.log('🚀 Starting Batch 9 Product Insertion & Smart Stock Upsert...\n');

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

  // Fetch ALL existing products for smart upsert
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

  // Caches
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
      // ✅ EXISTS — only increment stock
      const stock = await prisma.stock.findFirst({
        where: { tenantId: shop.id, productId: existingProd.id, warehouseId: warehouse.id },
      });

      if (stock) {
        await prisma.stock.update({
          where: { id: stock.id },
          data: {
            quantity: { increment: item.qty },
            availableQuantity: { increment: item.qty },
          },
        });
      } else {
        await prisma.stock.create({
          data: {
            tenantId: shop.id,
            productId: existingProd.id,
            warehouseId: warehouse.id,
            branchId: branchId,
            quantity: item.qty,
            availableQuantity: item.qty,
          },
        });
      }
      updatedCount++;
      console.log(`[STOCK+] ${existingProd.sku.padEnd(8)} | +${String(item.qty).padStart(3)} | ${item.name}`);

    } else {
      // 🆕 NEW — create category, brand, product & stock
      let cat = catCache.get(item.category.toLowerCase());
      if (!cat) {
        cat = await prisma.category.create({ data: { tenantId: shop.id, name: item.category } });
        catCache.set(item.category.toLowerCase(), cat);
      }

      const subKey = `${item.category}:${item.subcategory}`.toLowerCase();
      let subCat = subCatCache.get(subKey);
      if (!subCat) {
        const existingSub = existingCats.find(
          c => c.name.toLowerCase() === item.subcategory.toLowerCase() && c.parentId === cat.id
        );
        subCat = existingSub || await prisma.category.create({
          data: { tenantId: shop.id, name: item.subcategory, parentId: cat.id },
        });
        subCatCache.set(subKey, subCat);
      }

      let brand = null;
      if (item.brand && item.brand !== 'Generic') {
        brand = brandCache.get(item.brand.toLowerCase());
        if (!brand) {
          brand = await prisma.brand.create({
            data: { tenantId: shop.id, name: item.brand, categoryId: cat.id },
          });
          brandCache.set(item.brand.toLowerCase(), brand);
        }
      }

      const hkuCode = `HKU_${String(hkuIndex).padStart(2, '0')}`;
      const barcode  = `30000${String(hkuIndex).padStart(5, '0')}`;
      hkuIndex++;

      const product = await prisma.product.create({
        data: {
          tenantId: shop.id,
          name: item.name,
          sku: hkuCode,
          barcode: barcode,
          categoryId: cat.id,
          subcategoryId: subCat?.id || null,
          brandId: brand?.id || null,
          sellingPrice: item.price,
          purchasePrice: Math.round(item.price * 0.72),
          minimumStockLevel: 3,
          sellType: 'FIX',
          measurementUnit: item.unit || 'pcs',
        },
      });

      await prisma.stock.create({
        data: {
          tenantId: shop.id,
          productId: product.id,
          warehouseId: warehouse.id,
          branchId: branchId,
          quantity: item.qty,
          availableQuantity: item.qty,
          reservedQuantity: 0,
          damagedQuantity: 0,
        },
      });

      insertedCount++;
      console.log(`[NEW]    ${hkuCode.padEnd(8)} | Qty:${String(item.qty).padStart(3)} | Rs.${String(item.price).padStart(6)} | ${item.name}`);
    }
  }

  console.log(`\n🎉 BATCH 9 COMPLETE!`);
  console.log(`   ✅ New Products Inserted : ${insertedCount}`);
  console.log(`   🔄 Existing Stock Updated: ${updatedCount}`);
  console.log(`   📋 HKU series now at     : HKU_${String(hkuIndex - 1).padStart(2, '0')}`);
}

insertProductsBatch9()
  .catch(e => {
    console.error('❌ Error:', e.message);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
    if (pool) pool.end();
  });
