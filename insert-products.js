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
  // Image 1: Decorative & Wall Lights (Category: Electronics, Subcategory: Lights)
  { name: 'Wall Lamp (WWL-020)', qty: 10, category: 'Electronics', subcategory: 'Lights', brand: 'LGL', price: 2500 },
  { name: 'Wall Lamp (S-EF-LMP-514)', qty: 5, category: 'Electronics', subcategory: 'Lights', brand: 'LGL', price: 2800 },
  { name: 'Wall Lamp (S-EF-ODL-355) 16W', qty: 5, category: 'Electronics', subcategory: 'Lights', brand: 'LGL', price: 3200 },
  { name: 'Wall Lamp (S-EF-ODL-370) 8W', qty: 2, category: 'Electronics', subcategory: 'Lights', brand: 'LGL', price: 2900 },
  { name: 'Outdoor Lamps (S-EF-ODL-164) 300K', qty: 7, category: 'Electronics', subcategory: 'Lights', brand: 'LGL', price: 3500 },
  { name: 'Wall Lamp (S-EF-ODL-435)', qty: 2, category: 'Electronics', subcategory: 'Lights', brand: 'LGL', price: 3100 },
  { name: 'Step Light (S-EF-ODL-332)', qty: 11, category: 'Electronics', subcategory: 'Lights', brand: 'LGL', price: 1800 },
  { name: 'Garden Lamp (S-EF-GPL-029)', qty: 3, category: 'Electronics', subcategory: 'Lights', brand: 'LGL', price: 4200 },
  { name: 'Wall Lamp (WWL-049)', qty: 9, category: 'Electronics', subcategory: 'Lights', brand: 'LGL', price: 2700 },
  { name: 'Show Lamp (S-EF-CHA-241)', qty: 3, category: 'Electronics', subcategory: 'Lights', brand: 'LGL', price: 4500 },
  { name: 'Show Lamp (S-EF-CHA-239)', qty: 4, category: 'Electronics', subcategory: 'Lights', brand: 'LGL', price: 4500 },

  // Image 2: Plumbing, Hardware & Tools
  { name: 'Wavin Non-Threaded Ball Valve 32mm', qty: 43, category: 'Pvc Fittings', subcategory: 'Ball Valves', brand: 'Watertite', price: 450 },
  { name: 'Rubber Boots Yellow', qty: 3, category: 'Hardware', subcategory: 'Safety Gear', brand: 'Generic', price: 1200 },
  { name: 'Interior Roller Brush (Hasky)', qty: 11, category: 'Paint', subcategory: 'Brushes & Rollers', brand: 'Hasky', price: 650 },
  { name: 'Interior Roller Brush (EMOL)', qty: 17, category: 'Paint', subcategory: 'Brushes & Rollers', brand: 'EMOL', price: 600 },
  { name: 'Aluminum Foil Sheet 10mm (25m)', qty: 2, category: 'Hardware', subcategory: 'Insulation', brand: 'Antun', price: 4500 },
  { name: 'Sunk Box 1-Way Single (White)', qty: 90, category: 'Switches', subcategory: 'Enclosures', brand: 'Generic', price: 85 },
  { name: 'Chain Saw', qty: 3, category: 'Tools', subcategory: 'Power Tools', brand: 'Kazuma', price: 28500 },
  { name: 'LED Light Long 8W (Energize LED)', qty: 25, category: 'Electronics', subcategory: 'Lights', brand: 'Marta', price: 1150 },
  { name: 'Ball Valve (40mm) 1 1/4"', qty: 22, category: 'Pvc Fittings', subcategory: 'Ball Valves', brand: 'S-lon', price: 850 },
  { name: 'Ball Valve 1"', qty: 36, category: 'Pvc Fittings', subcategory: 'Ball Valves', brand: 'S-lon', price: 650 },
  { name: 'Circular Saw', qty: 4, category: 'Tools', subcategory: 'Power Tools', brand: 'Kazuma', price: 18500 },
  { name: 'Hydraulic Floor Jack (3 Ton)', qty: 2, category: 'Tools', subcategory: 'Garage Tools', brand: 'Optimus', price: 16500 },
  { name: 'Electric Ceiling Fan Bajaj (Ivory)', qty: 1, category: 'Fans', subcategory: 'Ceiling Fans', brand: 'Bajaj', price: 12500 },
  { name: 'Electric Ceiling Fan Bajaj (White)', qty: 2, category: 'Fans', subcategory: 'Ceiling Fans', brand: 'Bajaj', price: 12500 },

  // Image 3: Architectural & Garden Lighting (Category: Electronics, Subcategory: Lights)
  { name: 'Outdoor Lamps 6W IP65', qty: 50, category: 'Electronics', subcategory: 'Lights', brand: 'LGL', price: 2200 },
  { name: 'LED Flood Light 100W (6500K)', qty: 3, category: 'Electronics', subcategory: 'Lights', brand: 'LGL', price: 6500 },
  { name: 'LED Flood Light 50W (6500K)', qty: 20, category: 'Electronics', subcategory: 'Lights', brand: 'LGL', price: 3800 },
  { name: 'LED Flood Light 200W', qty: 1, category: 'Electronics', subcategory: 'Lights', brand: 'LGL', price: 11500 },
  { name: 'LED Wall Light 18W 3-Color', qty: 20, category: 'Electronics', subcategory: 'Lights', brand: 'LGL', price: 2900 },
  { name: 'Wall Lamp (S-EF-LMP-316) E27', qty: 5, category: 'Electronics', subcategory: 'Lights', brand: 'LGL', price: 2600 },
  { name: 'Wall Lamp (S-EF-LMP-533) 18W', qty: 3, category: 'Electronics', subcategory: 'Lights', brand: 'LGL', price: 3100 },
  { name: 'Gate Post Lamp (S-EF-GPL-021) 12W', qty: 2, category: 'Electronics', subcategory: 'Lights', brand: 'LGL', price: 3800 },
  { name: 'Gate Lamp (S-EF-GPL-021) 10W', qty: 5, category: 'Electronics', subcategory: 'Lights', brand: 'LGL', price: 3400 },
  { name: 'Garden Lamp (S-EF-GPL-037)', qty: 4, category: 'Electronics', subcategory: 'Lights', brand: 'LGL', price: 4100 },
  { name: 'Garden Lamp (S-EF-GPL-039) 10W', qty: 1, category: 'Electronics', subcategory: 'Lights', brand: 'LGL', price: 3900 },
  { name: 'LED Step Light (S-EF-GPL-021) 12W', qty: 6, category: 'Electronics', subcategory: 'Lights', brand: 'LGL', price: 1950 },
  { name: 'Wall Lamp (S-EF-ODL-342)', qty: 1, category: 'Electronics', subcategory: 'Lights', brand: 'LGL', price: 2850 },
  { name: 'Wall Lamp (S-EF-LMP-521) 6W', qty: 9, category: 'Electronics', subcategory: 'Lights', brand: 'LGL', price: 2400 },
  { name: 'Wall Lamp (S-EF-ODL-203) 6W', qty: 11, category: 'Electronics', subcategory: 'Lights', brand: 'LGL', price: 2450 },
  { name: 'Pendant Light (A-EF-PLA-406)', qty: 2, category: 'Electronics', subcategory: 'Lights', brand: 'LGL', price: 5200 },
  { name: 'Garden Lamp (S-EF-GPL-038)', qty: 2, category: 'Electronics', subcategory: 'Lights', brand: 'LGL', price: 3850 },
  { name: 'Hanging Lamp AI (Design 01)', qty: 6, category: 'Electronics', subcategory: 'Lights', brand: 'LGL', price: 4800 },
  { name: 'Hanging Lamp AI (Design 02)', qty: 6, category: 'Electronics', subcategory: 'Lights', brand: 'LGL', price: 4800 },
  { name: 'Hanging Lamp (PLA-203)', qty: 4, category: 'Electronics', subcategory: 'Lights', brand: 'LGL', price: 4600 },
  { name: 'Hanging Lamp (PLA-089)', qty: 4, category: 'Electronics', subcategory: 'Lights', brand: 'LGL', price: 4200 },
  { name: 'Wall Light (S-EF-LMP-453)', qty: 3, category: 'Electronics', subcategory: 'Lights', brand: 'LGL', price: 2750 },
  { name: 'Wall Light (S-EF-LMP-453) 8W', qty: 9, category: 'Electronics', subcategory: 'Lights', brand: 'LGL', price: 2950 },
  { name: 'Hanging Lamp (S-EF-PLA-450)', qty: 7, category: 'Electronics', subcategory: 'Lights', brand: 'LGL', price: 5100 },
  { name: 'Hanging Lamp (S-EF-PLA-454)', qty: 4, category: 'Electronics', subcategory: 'Lights', brand: 'LGL', price: 4900 },
  { name: 'Wall Light (S-EF-LMP-H41)', qty: 4, category: 'Electronics', subcategory: 'Lights', brand: 'LGL', price: 2650 },
  { name: 'Wall Lamp (S-EF-LMP-515) 10W', qty: 1, category: 'Electronics', subcategory: 'Lights', brand: 'LGL', price: 2900 },
  { name: 'Wall LED Lamp (4W)', qty: 1, category: 'Electronics', subcategory: 'Lights', brand: 'LGL', price: 1850 },

  // Image 4: Panel Lights, Heaters, Ladders & Polish
  { name: 'LED Light 12+4W Round (Cool & Warm)', qty: 25, category: 'Electronics', subcategory: 'Lights', brand: 'Ming LED', price: 1650 },
  { name: 'Electric Water Heater 30L', qty: 1, category: 'Appliances', subcategory: 'Water Heaters', brand: 'Rhodes', price: 48000 },
  { name: 'Electric Water Heater 15L', qty: 1, category: 'Appliances', subcategory: 'Water Heaters', brand: 'Rhodes', price: 38000 },
  { name: 'Aluminum Ladder 5-Step', qty: 2, category: 'Tools', subcategory: 'Ladders', brand: 'Alco', price: 14500 },
  { name: 'Aluminum Ladder 6-Step', qty: 2, category: 'Tools', subcategory: 'Ladders', brand: 'Alco', price: 17500 },
  { name: 'Aluminum Ladder 7-Step', qty: 7, category: 'Tools', subcategory: 'Ladders', brand: 'Alco', price: 21000 },
  { name: 'Aluminum Ladder 8-Step', qty: 3, category: 'Tools', subcategory: 'Ladders', brand: 'Alco', price: 24500 },
  { name: 'LED Bulb ST64 (8W)', qty: 99, category: 'Electronics', subcategory: 'Lights', brand: 'LGL', price: 750 },
  { name: 'French Polish Can', qty: 12, category: 'Paint', subcategory: 'Wood Finishes', brand: 'Chemigo', price: 2400 },
  { name: 'French Polish Bottle 750ml', qty: 11, category: 'Paint', subcategory: 'Wood Finishes', brand: 'Chemigo', price: 1100 },
  { name: 'LED Light 18W Cool White (Square)', qty: 19, category: 'Electronics', subcategory: 'Lights', brand: 'Ming LED', price: 1950 },
  { name: 'LED Light 12+4W Square (Cool & Blue)', qty: 44, category: 'Electronics', subcategory: 'Lights', brand: 'Ming LED', price: 1750 },
  { name: 'LED Light 12+4W Square (Cool & Warm)', qty: 2, category: 'Electronics', subcategory: 'Lights', brand: 'Ming LED', price: 1750 },
  { name: 'LED Light 18W Warm White (Square)', qty: 27, category: 'Electronics', subcategory: 'Lights', brand: 'Ming LED', price: 1950 },
  { name: 'LED Light 18+6W Square (Cool & Warm)', qty: 31, category: 'Electronics', subcategory: 'Lights', brand: 'Ming LED', price: 2250 },
  { name: 'LED Light 12W Cool White (Square)', qty: 20, category: 'Electronics', subcategory: 'Lights', brand: 'Ming LED', price: 1450 },
  { name: 'LED Light 18+6W Round (Cool & Blue)', qty: 25, category: 'Electronics', subcategory: 'Lights', brand: 'Ming LED', price: 2250 },
  { name: 'LED Light 12+4W Cool White (Square)', qty: 1, category: 'Electronics', subcategory: 'Lights', brand: 'Ming LED', price: 1650 },
];

async function insertProducts() {
  if (pool) {
    try {
      await pool.query(`
        ALTER TABLE products ADD COLUMN IF NOT EXISTS has_secondary_discount BOOLEAN DEFAULT false;
        ALTER TABLE products ADD COLUMN IF NOT EXISTS secondary_discount_type VARCHAR(50);
        ALTER TABLE products ADD COLUMN IF NOT EXISTS max_secondary_discount DECIMAL(10, 2);
        ALTER TABLE products ADD COLUMN IF NOT EXISTS default_secondary_discount DECIMAL(10, 2);
      `);
      console.log('✅ Database columns verified and ready.');
    } catch (err) {
      console.warn('Could not run auto-column migration:', err.message);
    }
  }

  console.log('Starting ingestion of products into Prisma DB...');

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

  // Rollback any partial test products from previous failed attempt
  const testSkus = Array.from({ length: 150 }, (_, i) => `SKU_${String(i + 76).padStart(3, '0')}`);
  const partialProducts = await prisma.product.findMany({
    where: {
      tenantId: shop.id,
      sku: { in: testSkus },
    },
  });

  if (partialProducts.length > 0) {
    const partialIds = partialProducts.map(p => p.id);
    await prisma.stock.deleteMany({ where: { productId: { in: partialIds } } });
    await prisma.product.deleteMany({ where: { id: { in: partialIds } } });
    console.log(`Cleaned up ${partialProducts.length} test product(s).`);
  }

  // Find highest existing SKU index to continue sequentially
  const existingProducts = await prisma.product.findMany({
    where: { tenantId: shop.id },
    select: { sku: true },
  });

  let maxSkuNum = 75;
  existingProducts.forEach(p => {
    const match = p.sku && p.sku.match(/SKU_(\d+)/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxSkuNum) maxSkuNum = num;
    }
  });

  let skuIndex = maxSkuNum + 1;
  console.log(`Continuing SKU order starting from SKU_${String(skuIndex).padStart(3, '0')}...`);

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

  for (const item of productsToInsert) {
    // 1. Ensure Category
    let cat = catCache.get(item.category.toLowerCase());
    if (!cat) {
      cat = await prisma.category.create({
        data: {
          tenantId: shop.id,
          name: item.category,
        },
      });
      catCache.set(item.category.toLowerCase(), cat);
    }

    // 2. Ensure Subcategory (under parent category)
    const subKey = `${item.category}:${item.subcategory}`.toLowerCase();
    let subCat = subCatCache.get(subKey);
    if (!subCat) {
      const existingSub = existingCats.find(c => c.name.toLowerCase() === item.subcategory.toLowerCase() && c.parentId === cat.id);
      if (existingSub) {
        subCat = existingSub;
      } else {
        subCat = await prisma.category.create({
          data: {
            tenantId: shop.id,
            name: item.subcategory,
            parentId: cat.id,
          },
        });
      }
      subCatCache.set(subKey, subCat);
    }

    // 3. Ensure Brand
    let brand = brandCache.get(item.brand.toLowerCase());
    if (!brand && item.brand !== 'Generic') {
      brand = await prisma.brand.create({
        data: {
          tenantId: shop.id,
          name: item.brand,
          categoryId: cat.id,
        },
      });
      brandCache.set(item.brand.toLowerCase(), brand);
    }

    // 4. Create Product with sequential SKU
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

    // 5. Create Stock record
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
    console.log(`[${insertedCount}/71] Inserted ${sku}: ${item.name} (Qty: ${item.qty}, Category: ${item.category} > ${item.subcategory}, Brand: ${item.brand})`);
  }

  console.log(`\n🎉 SUCCESSFULLY INSERTED ALL ${insertedCount} PRODUCTS WITH FULL STOCK INTO SHOP ${shop.id}!`);
}

insertProducts()
  .catch(console.error)
  .finally(() => {
    prisma.$disconnect();
    if (pool) pool.end();
  });
