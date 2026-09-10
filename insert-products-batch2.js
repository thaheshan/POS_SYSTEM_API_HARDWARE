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
  // Image 1: Robbialac Exterior Paints & Brushes
  { name: 'Robbialac Exterior Paint Willow Grey 4L', qty: 1, category: 'Paint', subcategory: 'Exterior Paint', brand: 'Robbialac', price: 7800 },
  { name: 'Robbialac Exterior Paint Bamboo 4L', qty: 2, category: 'Paint', subcategory: 'Exterior Paint', brand: 'Robbialac', price: 7800 },
  { name: 'Robbialac Exterior Paint Off White 4L', qty: 3, category: 'Paint', subcategory: 'Exterior Paint', brand: 'Robbialac', price: 7800 },
  { name: 'Nippon Paint Brush 4"', qty: 48, category: 'Paint', subcategory: 'Brushes & Rollers', brand: 'Nippon', price: 450 },

  // Image 2: Plumbing, Sanitaryware, Hardware & Solar Lights
  { name: 'LED & Solar Street Light', qty: 2, category: 'Electronics', subcategory: 'Lights', brand: 'LED', price: 14500 },
  { name: 'Manual Tile Cutter 20"', qty: 1, category: 'Tools', subcategory: 'Hand Tools', brand: 'Bordonley', price: 18500 },
  { name: 'Havells Ventilator Fan 250mm', qty: 8, category: 'Electronics', subcategory: 'Ventilators', brand: 'Havells', price: 6200 },
  { name: 'Concrete Nail 4.0 x 65mm Patta (500g Pack)', qty: 64, category: 'Hardware', subcategory: 'Fasteners', brand: 'Generic', price: 380 },
  { name: 'S-lon Thread Seal Tape 12mm x 0.075mm x 10m', qty: 100, category: 'Plumbing', subcategory: 'Pipe Accessories', brand: 'S-lon', price: 95 },
  { name: 'S-lon Thread Seal Tape 25mm x 0.075mm x 10m', qty: 238, category: 'Plumbing', subcategory: 'Pipe Accessories', brand: 'S-lon', price: 165 },
  { name: 'Rapsel Sanitaryware Wash Basin', qty: 1, category: 'Plumbing', subcategory: 'Sanitaryware', brand: 'Rapsel', price: 18500 },
  { name: 'Switch Box 4-Way Enclosure', qty: 55, category: 'Electronics', subcategory: 'Switch Boxes', brand: 'Generic', price: 280 },
  { name: 'Premium Handmade Kitchen Sink', qty: 3, category: 'Plumbing', subcategory: 'Sanitaryware', brand: 'Generic', price: 24500 },
  { name: 'Waterproof Bathroom Door (PVC/Composite)', qty: 5, category: 'Plumbing', subcategory: 'Doors & Fittings', brand: 'Generic', price: 14500 },

  // Image 3: Robbialac Interior 1L & Berlux Enamels
  { name: 'Robbialac Interior Paint Star Green 1L', qty: 3, category: 'Paint', subcategory: 'Interior Paint', brand: 'Robbialac', price: 2450 },
  { name: 'Robbialac Interior Paint Sand Stone 1L', qty: 5, category: 'Paint', subcategory: 'Interior Paint', brand: 'Robbialac', price: 2450 },
  { name: 'Robbialac Interior Paint Orchid 1L', qty: 2, category: 'Paint', subcategory: 'Interior Paint', brand: 'Robbialac', price: 2450 },
  { name: 'Robbialac Interior Paint Jamboree 1L', qty: 2, category: 'Paint', subcategory: 'Interior Paint', brand: 'Robbialac', price: 2450 },
  { name: 'Robbialac Interior Paint Easter Egg 1L', qty: 1, category: 'Paint', subcategory: 'Interior Paint', brand: 'Robbialac', price: 2450 },
  { name: 'Robbialac Interior Paint Cameo 1L', qty: 2, category: 'Paint', subcategory: 'Interior Paint', brand: 'Robbialac', price: 2450 },
  { name: 'Robbialac Exterior Paint Flint Grey 1L', qty: 1, category: 'Paint', subcategory: 'Exterior Paint', brand: 'Robbialac', price: 2550 },
  { name: 'Robbialac Exterior Paint Bamboo 1L', qty: 1, category: 'Paint', subcategory: 'Exterior Paint', brand: 'Robbialac', price: 2550 },
  { name: 'Robbialac Exterior Paint Black 1L', qty: 1, category: 'Paint', subcategory: 'Exterior Paint', brand: 'Robbialac', price: 2550 },
  { name: 'Robbialac Exterior Paint Mushroom 1L', qty: 2, category: 'Paint', subcategory: 'Exterior Paint', brand: 'Robbialac', price: 2550 },
  { name: 'Berlux Primer Red 1L', qty: 11, category: 'Paint', subcategory: 'Primers', brand: 'Berlux', price: 1850 },
  { name: 'Berlux Enamel Paint Jet Black 1L', qty: 11, category: 'Paint', subcategory: 'Enamel Paint', brand: 'Berlux', price: 2150 },
  { name: 'Berlux Enamel Paint Regatta Blue 1L', qty: 14, category: 'Paint', subcategory: 'Enamel Paint', brand: 'Berlux', price: 2150 },
  { name: 'Berlux Enamel Paint Brilliant White 1L', qty: 11, category: 'Paint', subcategory: 'Enamel Paint', brand: 'Berlux', price: 2150 },
  { name: 'Berlux Enamel Paint Golden Yellow 1L', qty: 12, category: 'Paint', subcategory: 'Enamel Paint', brand: 'Berlux', price: 2150 },
  { name: 'Berlux Enamel Paint Dark Grey 1L', qty: 1, category: 'Paint', subcategory: 'Enamel Paint', brand: 'Berlux', price: 2150 },
  { name: 'Berlux PU Varnish Clear 1L', qty: 4, category: 'Paint', subcategory: 'Wood Finishes', brand: 'Berlux', price: 2800 },
  { name: 'Berlux Enamel Paint Sand Stone 1L', qty: 1, category: 'Paint', subcategory: 'Enamel Paint', brand: 'Berlux', price: 2150 },
  { name: 'Berlux Enamel Paint American Apple 1L', qty: 1, category: 'Paint', subcategory: 'Enamel Paint', brand: 'Berlux', price: 2150 },
  { name: 'Berlux Enamel Paint Minerva Grey 1L', qty: 1, category: 'Paint', subcategory: 'Enamel Paint', brand: 'Berlux', price: 2150 },
  { name: 'Berlux Enamel Paint Brilliant White 500ml', qty: 10, category: 'Paint', subcategory: 'Enamel Paint', brand: 'Berlux', price: 1250 },
  { name: 'Berlux Sanding Sealer Clear 500ml', qty: 15, category: 'Paint', subcategory: 'Wood Finishes', brand: 'Berlux', price: 1450 },
  { name: 'Berlux Enamel Paint Jet Black 500ml', qty: 5, category: 'Paint', subcategory: 'Enamel Paint', brand: 'Berlux', price: 1250 },
  { name: 'Berlux Enamel Paint Corn Flower Blue 500ml', qty: 1, category: 'Paint', subcategory: 'Enamel Paint', brand: 'Berlux', price: 1250 },
  { name: 'Berlux Varnish Clear 500ml', qty: 6, category: 'Paint', subcategory: 'Wood Finishes', brand: 'Berlux', price: 1550 },
  { name: 'Berlux Enamel Paint Golden Brown 500ml', qty: 5, category: 'Paint', subcategory: 'Enamel Paint', brand: 'Berlux', price: 1250 },
  { name: 'Berlux Enamel Paint Regatta Blue 500ml', qty: 19, category: 'Paint', subcategory: 'Enamel Paint', brand: 'Berlux', price: 1250 },

  // Image 4: Robbialac Wallmaster 4L
  { name: 'Robbialac Wallmaster Easter Egg 4L', qty: 1, category: 'Paint', subcategory: 'Interior Paint', brand: 'Robbialac', price: 7450 },
  { name: 'Robbialac Wallmaster Eco Lake 4L', qty: 1, category: 'Paint', subcategory: 'Interior Paint', brand: 'Robbialac', price: 7450 },
  { name: 'Robbialac Wallmaster Star Green 4L', qty: 1, category: 'Paint', subcategory: 'Interior Paint', brand: 'Robbialac', price: 7450 },
  { name: 'Robbialac Wallmaster Sand Stone 4L', qty: 1, category: 'Paint', subcategory: 'Interior Paint', brand: 'Robbialac', price: 7450 },
  { name: 'Robbialac Wallmaster Royal Violet 4L', qty: 3, category: 'Paint', subcategory: 'Interior Paint', brand: 'Robbialac', price: 7450 },

  // Image 5: Berlex 200ml, 100ml, Sealers & Varnishes
  { name: 'Berlex Enamel Paint Jet Black 200ml', qty: 6, category: 'Paint', subcategory: 'Enamel Paint', brand: 'Berlux', price: 650 },
  { name: 'Berlex Enamel Paint Regatta Blue 200ml', qty: 24, category: 'Paint', subcategory: 'Enamel Paint', brand: 'Berlux', price: 650 },
  { name: 'Berlex Enamel Paint White 100ml', qty: 20, category: 'Paint', subcategory: 'Enamel Paint', brand: 'Berlux', price: 420 },
  { name: 'Berlex Sanding Sealer Mahogany 500ml', qty: 9, category: 'Paint', subcategory: 'Wood Finishes', brand: 'Berlux', price: 1450 },
  { name: 'Berlex Sanding Sealer Mahogany 1L', qty: 2, category: 'Paint', subcategory: 'Wood Finishes', brand: 'Berlux', price: 2650 },
  { name: 'Berlex Floor Paint Red 200ml', qty: 23, category: 'Paint', subcategory: 'Floor Paint', brand: 'Berlux', price: 750 },
  { name: 'Berlex Floor Paint Red 500ml', qty: 12, category: 'Paint', subcategory: 'Floor Paint', brand: 'Berlux', price: 1450 },
  { name: 'Berlex Sanding Sealer Clear 1L', qty: 6, category: 'Paint', subcategory: 'Wood Finishes', brand: 'Berlux', price: 2650 },
  { name: 'Berlex Varnish Teak 1L', qty: 6, category: 'Paint', subcategory: 'Wood Finishes', brand: 'Berlux', price: 2850 },
];

async function insertProductsBatch2() {
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

  console.log('Starting ingestion of Batch 2 products into Prisma DB...');

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
    console.log(`[${insertedCount}/55] Inserted ${sku}: ${item.name} (Qty: ${item.qty}, Category: ${item.category} > ${item.subcategory}, Brand: ${item.brand})`);
  }

  console.log(`\n🎉 SUCCESSFULLY INSERTED ALL ${insertedCount} BATCH 2 PRODUCTS WITH FULL STOCK INTO SHOP ${shop.id}!`);
}

insertProductsBatch2()
  .catch(console.error)
  .finally(() => {
    prisma.$disconnect();
    if (pool) pool.end();
  });
