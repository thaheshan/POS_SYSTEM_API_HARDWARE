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

const productsToInsert = [
  // ─── Sheet 1: Tools, Lighting, Electrical & Accessories ───────────────────
  { name: 'LED Light 15W', qty: 25, category: 'Electronics', subcategory: 'Lights', brand: 'Ming LED', price: 950 },
  { name: 'Electric Sander', qty: 1, category: 'Tools', subcategory: 'Power Tools', brand: 'MEN', price: 14500 },
  { name: 'Angle Grinder', qty: 1, category: 'Tools', subcategory: 'Power Tools', brand: 'MEN', price: 12500 },
  { name: 'Electric Vibrator', qty: 2, category: 'Tools', subcategory: 'Power Tools', brand: 'MEN', price: 18500 },
  { name: 'Demolition Hammer', qty: 6, category: 'Tools', subcategory: 'Power Tools', brand: 'MEN', price: 28500 },
  { name: 'Aluminium Door Lock Set', qty: 4, category: 'Hardware', subcategory: 'Door Fittings', brand: 'CITTION', price: 3450 },
  { name: 'Heat Gun', qty: 1, category: 'Tools', subcategory: 'Power Tools', brand: 'MEN', price: 8500 },
  { name: 'D/B-Surface / Flush Type (2 Row - 28 Way)', qty: 2, category: 'Electronics', subcategory: 'Switch Boxes', brand: 'Orange Electric', price: 4250 },
  { name: 'Electric Blower', qty: 1, category: 'Tools', subcategory: 'Power Tools', brand: 'MEN', price: 7800 },
  { name: 'Tool Box (495 × 200 × 290 mm)', qty: 3, category: 'Tools', subcategory: 'Hand Tools', brand: 'INECO', price: 4850 },
  { name: 'Water Cooling Motor', qty: 1, category: 'Tools', subcategory: 'Power Tools', brand: 'AGROMAX', price: 16500 },
  { name: '4 Row × 56 Way Distribution Box', qty: 1, category: 'Electronics', subcategory: 'Switch Boxes', brand: 'Orange Electric', price: 8900 },
  { name: '18+6W LED (Round) Cool & Blue', qty: 1, category: 'Electronics', subcategory: 'Lights', brand: 'Ming LED', price: 2150 },
  { name: 'Mammottees Hoe', qty: 12, category: 'Tools', subcategory: 'Garden Tools', brand: 'Generic', price: 1250 },

  // ─── Sheet 2: Lighting, Machinery, Fans, Enclosures & Switches ─────────────
  { name: 'LED Street Light', qty: 1, category: 'Electronics', subcategory: 'Lights', brand: 'Luminar Light', price: 4850 },
  { name: 'Tile Cutter (1200mm)', qty: 2, category: 'Tools', subcategory: 'Hand Tools', brand: 'Velar', price: 22500 },
  { name: 'High Pressure Spray Hose', qty: 1, category: 'Tools', subcategory: 'Hand Tools', brand: 'Husky', price: 3450 },
  { name: 'Demolition Hammer', qty: 1, category: 'Tools', subcategory: 'Power Tools', brand: 'MEN', price: 28500 },
  { name: 'Plastic Cistern Set Box', qty: 3, category: 'Plumbing', subcategory: 'Sanitaryware', brand: 'Generic', price: 2850 },
  { name: 'Deep Junction Box (Polycrome)', qty: 150, category: 'Electronics', subcategory: 'Switch Boxes', brand: 'Polycrome', price: 95 },
  { name: 'Hanging Light (S-EF-CHA-242)', qty: 1, category: 'Electronics', subcategory: 'Lights', brand: 'LGL', price: 5800 },
  { name: 'Orbit Fan (16 Inch)', qty: 4, category: 'Electronics', subcategory: 'Fans', brand: 'Misaki', price: 6850 },
  { name: 'Wall Fan (RWF-020R)', qty: 2, category: 'Electronics', subcategory: 'Fans', brand: 'Range', price: 7450 },
  { name: 'Cabin Fan (GYRONETIC 400mm)', qty: 2, category: 'Electronics', subcategory: 'Fans', brand: 'Bajaj', price: 8200 },
  { name: 'Remote Wall Fan', qty: 1, category: 'Electronics', subcategory: 'Fans', brand: 'Havells', price: 9800 },
  { name: 'Sunk Box 4-Way (Ivory)', qty: 10, category: 'Electronics', subcategory: 'Switch Boxes', brand: 'Generic', price: 280 },
  { name: 'Sunk Box 1-Way (White)', qty: 120, category: 'Electronics', subcategory: 'Switch Boxes', brand: 'Generic', price: 85 },

  // Orange Electric Switches (Black Series)
  { name: 'Orange Electric Black 1G Single Switch (Calling Bell)', qty: 9, category: 'Electronics', subcategory: 'Switches', brand: 'Orange Electric', price: 420 },
  { name: 'Orange Electric Black 1G Single Switch (Normal)', qty: 35, category: 'Electronics', subcategory: 'Switches', brand: 'Orange Electric', price: 380 },
  { name: 'Orange Electric Black 2G Double Switch', qty: 43, category: 'Electronics', subcategory: 'Switches', brand: 'Orange Electric', price: 580 },
  { name: 'Orange Electric Black 3G Switch', qty: 26, category: 'Electronics', subcategory: 'Switches', brand: 'Orange Electric', price: 780 },
  { name: 'Orange Electric Black 4G Switch', qty: 25, category: 'Electronics', subcategory: 'Switches', brand: 'Orange Electric', price: 950 },

  { name: 'Solar Street Lamp (300W)', qty: 3, category: 'Electronics', subcategory: 'Lights', brand: 'LGL', price: 8900 },
  { name: 'Grease Gun Lever Type (500cc)', qty: 6, category: 'Tools', subcategory: 'Hand Tools', brand: 'MEN', price: 3200 },
  { name: 'Cup Brush', qty: 5, category: 'Tools', subcategory: 'Hand Tools', brand: 'Generic', price: 450 },
  { name: 'Float Ball Valve', qty: 36, category: 'Plumbing', subcategory: 'Pipe Accessories', brand: 'Husky', price: 1450 },

  // ─── Sheet 3: Ceiling Fans (Bajaj & Havells) ──────────────────────────────
  { name: 'Bajaj Ceiling Fan (Black)', qty: 8, category: 'Electronics', subcategory: 'Ceiling Fans', brand: 'Bajaj', price: 12500 },
  { name: 'Bajaj Ceiling Fan (Brown)', qty: 12, category: 'Electronics', subcategory: 'Ceiling Fans', brand: 'Bajaj', price: 12500 },
  { name: 'Bajaj Ceiling Fan (Ivory)', qty: 8, category: 'Electronics', subcategory: 'Ceiling Fans', brand: 'Bajaj', price: 12500 },
  { name: 'Bajaj Ceiling Fan (White)', qty: 25, category: 'Electronics', subcategory: 'Ceiling Fans', brand: 'Bajaj', price: 12500 },
  { name: 'Havells Ceiling Fan (Ivory)', qty: 1, category: 'Electronics', subcategory: 'Ceiling Fans', brand: 'Havells', price: 13800 },
  { name: 'Havells Ceiling Fan (Smoke Brown)', qty: 1, category: 'Electronics', subcategory: 'Ceiling Fans', brand: 'Havells', price: 13800 },
];

async function insertProductsBatch5() {
  if (pool) {
    try {
      await pool.query(`
        ALTER TABLE products ADD COLUMN IF NOT EXISTS has_secondary_discount BOOLEAN DEFAULT false;
        ALTER TABLE products ADD COLUMN IF NOT EXISTS secondary_discount_type VARCHAR(50);
        ALTER TABLE products ADD COLUMN IF NOT EXISTS max_secondary_discount DECIMAL(10, 2);
        ALTER TABLE products ADD COLUMN IF NOT EXISTS default_secondary_discount DECIMAL(10, 2);
      `);
      console.log('✅ Database columns verified.');
    } catch (err) {
      console.warn('Could not run auto-column migration:', err.message);
    }
  }

  console.log('Starting smart ingestion of Batch 5 products into Prisma DB...');

  const shops = await prisma.shop.findMany();
  let shop = shops.find(s => s.id.toLowerCase().includes('3924fc6c'));
  if (!shop && shops.length > 0) shop = shops[0];
  if (!shop) throw new Error('No shop found in database!');

  console.log(`Using Shop ID: ${shop.id} (${shop.name})`);

  const warehouses = await prisma.warehouse.findMany({ where: { tenantId: shop.id } });
  const warehouse = warehouses[0] || (await prisma.warehouse.findFirst());
  if (!warehouse) throw new Error('No warehouse found in database!');

  const branches = await prisma.branch.findMany({ where: { tenantId: shop.id } });
  const branchId = warehouse.branchId || (branches[0] ? branches[0].id : shop.id);

  console.log(`Using Warehouse ID: ${warehouse.id} (${warehouse.name}), Branch ID: ${branchId}`);

  // Fetch all existing products for smart upsert (name or fuzzy match)
  const allExisting = await prisma.product.findMany({
    where: { tenantId: shop.id },
    select: { id: true, name: true, sku: true },
  });

  const existingByName = new Map();
  let maxSkuNum = 100;

  allExisting.forEach(p => {
    existingByName.set(p.name.toLowerCase(), p);
    const match = p.sku && p.sku.match(/SKU_(\d+)/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxSkuNum) maxSkuNum = num;
    }
  });

  let skuIndex = maxSkuNum + 1;
  console.log(`Continuing SKU sequence starting from SKU_${String(skuIndex).padStart(3, '0')}...`);

  // Track categories and subcategories
  const catCache = new Map();
  const subCatCache = new Map();
  const brandCache = new Map();

  // Load existing categories and brands
  const existingCats = await prisma.category.findMany({ where: { tenantId: shop.id } });
  existingCats.forEach(c => catCache.set(c.name.toLowerCase(), c));

  const existingBrands = await prisma.brand.findMany({ where: { tenantId: shop.id } });
  existingBrands.forEach(b => brandCache.set(b.name.toLowerCase(), b));

  let insertedCount = 0;
  let updatedCount = 0;

  for (const item of productsToInsert) {
    // 1. Check if product already exists in database (exact or case-insensitive)
    const existingProd = existingByName.get(item.name.toLowerCase());

    if (existingProd) {
      // Product already exists -> Increment stock quantity!
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
      console.log(`[UPSERT STOCK] ${existingProd.sku} - ${item.name}: Added +${item.qty} Qty to existing item.`);
    } else {
      // Product does NOT exist -> Create Category, Brand, Product & Stock
      let cat = catCache.get(item.category.toLowerCase());
      if (!cat) {
        cat = await prisma.category.create({
          data: { tenantId: shop.id, name: item.category },
        });
        catCache.set(item.category.toLowerCase(), cat);
      }

      const subKey = `${item.category}:${item.subcategory}`.toLowerCase();
      let subCat = subCatCache.get(subKey);
      if (!subCat) {
        const existingSub = existingCats.find(c => c.name.toLowerCase() === item.subcategory.toLowerCase() && c.parentId === cat.id);
        if (existingSub) {
          subCat = existingSub;
        } else {
          subCat = await prisma.category.create({
            data: { tenantId: shop.id, name: item.subcategory, parentId: cat.id },
          });
        }
        subCatCache.set(subKey, subCat);
      }

      let brand = brandCache.get(item.brand.toLowerCase());
      if (!brand && item.brand !== 'Generic') {
        brand = await prisma.brand.create({
          data: { tenantId: shop.id, name: item.brand, categoryId: cat.id },
        });
        brandCache.set(item.brand.toLowerCase(), brand);
      }

      const sku = `SKU_${String(skuIndex).padStart(3, '0')}`;
      const barcode = `20000000${String(skuIndex).padStart(4, '0')}`;
      skuIndex++;

      const product = await prisma.product.create({
        data: {
          tenantId: shop.id,
          name: item.name,
          sku: sku,
          barcode: barcode,
          categoryId: cat.id,
          subcategoryId: subCat?.id || null,
          brandId: brand?.id || null,
          sellingPrice: item.price,
          purchasePrice: Math.round(item.price * 0.7),
          minimumStockLevel: 5,
          sellType: 'FIX',
          measurementUnit: 'pcs',
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
      console.log(`[NEW PRODUCT] ${sku}: ${item.name} (Qty: ${item.qty}, Category: ${item.category} > ${item.subcategory}, Brand: ${item.brand})`);
    }
  }

  console.log(`\n🎉 BATCH 5 FINISHED! New Products Created: ${insertedCount}, Existing Products Stock Incremented: ${updatedCount}`);
}

insertProductsBatch5()
  .catch(console.error)
  .finally(() => {
    prisma.$disconnect();
    if (pool) pool.end();
  });
