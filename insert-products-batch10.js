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
// BATCH 10 — HKU Series (Auto-continues from last HKU number in DB)
// Source: Handwritten stock audit sheet (Valves, Couplings, EuroAqua, Secret Codes FK/FD/FJK/DHFK/DKFK & Bajaj Cabin Fan)
// ─────────────────────────────────────────────────────────────────────────────
const productsToInsert = [

  // ─── 1. VALVES & COUPLINGS WITH SECRET CODES ─────────────────────────────
  { name: 'Non-Return Valve 1"',                               qty: 9,  category: 'Plumbing', subcategory: 'Valves', brand: 'Generic',          price: 1850, unit: 'pcs' },
  { name: 'Brass Stop Valve 3/4" (Round Handle)',              qty: 3,  category: 'Plumbing', subcategory: 'Valves', brand: 'Generic',          price: 1950, unit: 'pcs' },
  { name: 'Brass Stop Valve 1/2"',                             qty: 8,  category: 'Plumbing', subcategory: 'Valves', brand: 'Generic',          price: 1450, unit: 'pcs' },
  { name: 'Manual Non-Return Valve 1/2"',                      qty: 7,  category: 'Plumbing', subcategory: 'Valves', brand: 'Generic',          price: 1650, unit: 'pcs' },
  { name: 'Brass Air-Valve 1/2"',                              qty: 4,  category: 'Plumbing', subcategory: 'Valves', brand: 'Generic',          price: 1250, unit: 'pcs' },
  { name: 'Normal Non-Return Valve 1/2"',                      qty: 3,  category: 'Plumbing', subcategory: 'Valves', brand: 'Generic',          price: 1450, unit: 'pcs' },
  
  // EuroAqua PlumTec PVC Ball Valves
  { name: 'EuroAqua PlumTec PVC Ball Valve 1"',                qty: 15, category: 'Plumbing', subcategory: 'Valves', brand: 'EuroAqua PlumTec', price: 1150, unit: 'pcs' },
  { name: 'EuroAqua PlumTec PVC Ball Valve 3/4" (25mm)',       qty: 3,  category: 'Plumbing', subcategory: 'Valves', brand: 'EuroAqua PlumTec', price: 950,  unit: 'pcs' },
  { name: 'EuroAqua PlumTec PVC Ball Valve 1/2" (20mm)',       qty: 45, category: 'Plumbing', subcategory: 'Valves', brand: 'EuroAqua PlumTec', price: 750,  unit: 'pcs' },

  { name: 'Non-Return Valve 3/4"',                             qty: 2,  category: 'Plumbing', subcategory: 'Valves', brand: 'Generic',          price: 1550, unit: 'pcs' },
  { name: 'Coupling Branch 1 1/4"',                            qty: 2,  category: 'Plumbing', subcategory: 'Pipe Fittings', brand: 'Generic',   price: 850,  unit: 'pcs' },

  // Items with Secret Codes in Left Margin
  { name: 'Fordmix Non Return Valve 1 1/2" (FK)',              qty: 4,  category: 'Plumbing', subcategory: 'Valves', brand: 'Fordmix',          price: 3200, unit: 'pcs' },
  { name: 'FP+ Non Return Valve 1 1/2" (FD)',                  qty: 2,  category: 'Plumbing', subcategory: 'Valves', brand: 'FP+',              price: 3100, unit: 'pcs' },
  { name: 'Kevin Non Return Valve 2" (FJK)',                   qty: 3,  category: 'Plumbing', subcategory: 'Valves', brand: 'Kevin',            price: 4200, unit: 'pcs' },
  { name: 'Kevin Non Return Valve 1 1/2" (DHFK)',              qty: 2,  category: 'Plumbing', subcategory: 'Valves', brand: 'Kevin',            price: 3400, unit: 'pcs' },
  { name: 'Kevin Non Return Valve 1 1/4" (DKFK)',              qty: 1,  category: 'Plumbing', subcategory: 'Valves', brand: 'Kevin',            price: 2800, unit: 'pcs' },

  // ─── 2. FANS ─────────────────────────────────────────────────────────────
  { name: 'Bajaj Cabin Fan 400mm',                             qty: 1,  category: 'Electronics', subcategory: 'Fans', brand: 'Bajaj',            price: 14500, unit: 'pcs' },
];

async function insertProductsBatch10() {
  console.log('🚀 Starting Batch 10 Product Insertion & Smart Stock Upsert...\n');

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

  console.log(`\n🎉 BATCH 10 COMPLETE!`);
  console.log(`   ✅ New Products Inserted : ${insertedCount}`);
  console.log(`   🔄 Existing Stock Updated: ${updatedCount}`);
  console.log(`   📋 HKU series now at     : HKU_${String(hkuIndex - 1).padStart(2, '0')}`);
}

insertProductsBatch10()
  .catch(e => {
    console.error('❌ Error:', e.message);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
    if (pool) pool.end();
  });
