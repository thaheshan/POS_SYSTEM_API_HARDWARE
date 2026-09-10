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

async function main() {
  console.log('🚀 Starting Batch 3 Inventory Insertion & Stock Audit Update (4/9/26 Evening)...');

  // Find shop tenant
  const shops = await prisma.shop.findMany();
  let shop = shops.find(s => s.id.toLowerCase().includes('3924fc6c'));
  if (!shop && shops.length > 0) shop = shops[0];
  if (!shop) throw new Error('No shop found in database!');

  console.log(`Using Shop ID: ${shop.id} (${shop.name})`);

  // Find Warehouse
  const warehouses = await prisma.warehouse.findMany({ where: { tenantId: shop.id } });
  const warehouse = warehouses[0] || (await prisma.warehouse.findFirst());
  if (!warehouse) throw new Error('No warehouse found in database!');

  const branches = await prisma.branch.findMany({ where: { tenantId: shop.id } });
  const branchId = warehouse.branchId || (branches[0] ? branches[0].id : shop.id);

  console.log(`Using Warehouse ID: ${warehouse.id} (${warehouse.name}), Branch ID: ${branchId}`);

  // Track categories and subcategories
  const catCache = new Map();
  const subCatCache = new Map();
  const brandCache = new Map();

  // Load existing categories and brands
  const existingCats = await prisma.category.findMany({ where: { tenantId: shop.id } });
  existingCats.forEach(c => catCache.set(c.name.toLowerCase(), c));

  const existingBrands = await prisma.brand.findMany({ where: { tenantId: shop.id } });
  existingBrands.forEach(b => brandCache.set(b.name.toLowerCase(), b));

  // Helpers
  async function getCategory(name) {
    let cat = catCache.get(name.toLowerCase());
    if (!cat) {
      cat = await prisma.category.create({
        data: { tenantId: shop.id, name },
      });
      catCache.set(name.toLowerCase(), cat);
      console.log(`✨ Created Category: ${name}`);
    }
    return cat;
  }

  async function getSubCategory(name, parentCat) {
    const subKey = `${parentCat.name}:${name}`.toLowerCase();
    let subCat = subCatCache.get(subKey);
    if (!subCat) {
      const existingSub = existingCats.find(c => c.name.toLowerCase() === name.toLowerCase() && c.parentId === parentCat.id);
      if (existingSub) {
        subCat = existingSub;
      } else {
        subCat = await prisma.category.create({
          data: {
            tenantId: shop.id,
            name: name,
            parentId: parentCat.id,
          },
        });
      }
      subCatCache.set(subKey, subCat);
      console.log(`✨ Created Subcategory: ${name}`);
    }
    return subCat;
  }

  async function getBrand(name, parentCat) {
    if (!name || name === 'Generic') return null;
    let brand = brandCache.get(name.toLowerCase());
    if (!brand) {
      brand = await prisma.brand.create({
        data: {
          tenantId: shop.id,
          name: name,
          categoryId: parentCat.id,
        },
      });
      brandCache.set(name.toLowerCase(), brand);
      console.log(`✨ Created Brand: ${name}`);
    }
    return brand;
  }

  // Categories
  const catFans = await getCategory('Ceiling Fans');
  const catTools = await getCategory('Power Tools');
  const catCleaning = await getCategory('Cleaning & Hardware');

  // Subcategories
  const subFans = await getSubCategory('Ceiling Fans', catFans);
  const subPumps = await getSubCategory('Water Pumps', catTools);
  const subPowerTools = await getSubCategory('Power Tools', catTools);
  const subBrooms = await getSubCategory('Brooms & Mops', catCleaning);

  // Brands
  const brandHavells = await getBrand('Havells', catFans);
  const brandBajaj = await getBrand('Bajaj', catFans);
  const brandRegnis = await getBrand('Regnis', catTools);
  const brandIngco = await getBrand('INGCO', catTools);
  const brandSinger = await getBrand('Singer', catTools);
  const brandMakute = await getBrand('Makute', catTools);

  // Audit Items (4/9/26 Evening)
  const auditItems = [
    // Havells Ceiling Fans (New)
    { name: 'Havells Ceiling Fan (Matt Black)', brandId: brandHavells?.id, categoryId: catFans.id, subCategoryId: subFans.id, qty: 1, cost: 18500, price: 21500 },
    { name: 'Havells Ceiling Fan (Matt White)', brandId: brandHavells?.id, categoryId: catFans.id, subCategoryId: subFans.id, qty: 5, cost: 18500, price: 21500 },

    // Bajaj Ceiling Fans (Existing - Add Qty)
    { name: 'Bajaj Ceiling Fan 56" (Ivory)', brandId: brandBajaj?.id, categoryId: catFans.id, subCategoryId: subFans.id, qty: 18, cost: 14500, price: 16800 },
    { name: 'Bajaj Ceiling Fan 56" (White)', brandId: brandBajaj?.id, categoryId: catFans.id, subCategoryId: subFans.id, qty: 3, cost: 14500, price: 16800 },
    { name: 'Bajaj Ceiling Fan 56" (Brown)', brandId: brandBajaj?.id, categoryId: catFans.id, subCategoryId: subFans.id, qty: 1, cost: 14500, price: 16800 },

    // Pumps & Power Tools (New)
    { name: 'Tube Well Pump (Regnis)', brandId: brandRegnis?.id, categoryId: catTools.id, subCategoryId: subPumps.id, qty: 1, cost: 28000, price: 32500 },
    { name: 'Water Pump 550W (INGCO)', brandId: brandIngco?.id, categoryId: catTools.id, subCategoryId: subPumps.id, qty: 3, cost: 22000, price: 25500 },
    { name: 'Water Pump (Singer)', brandId: brandSinger?.id, categoryId: catTools.id, subCategoryId: subPumps.id, qty: 2, cost: 19500, price: 23000 },
    { name: 'Electric Planer 600W (Makute)', brandId: brandMakute?.id, categoryId: catTools.id, subCategoryId: subPowerTools.id, qty: 1, cost: 13500, price: 15800 },

    // Brooms & Mops (New)
    { name: 'Broom (Standard)', brandId: null, categoryId: catCleaning.id, subCategoryId: subBrooms.id, qty: 20, cost: 350, price: 480 },
    { name: 'Wiper (Floor)', brandId: null, categoryId: catCleaning.id, subCategoryId: subBrooms.id, qty: 7, cost: 650, price: 850 },
    { name: 'Cobweb Brush', brandId: null, categoryId: catCleaning.id, subCategoryId: subBrooms.id, qty: 3, cost: 750, price: 980 },
    { name: 'Floor Mop 350g', brandId: null, categoryId: catCleaning.id, subCategoryId: subBrooms.id, qty: 8, cost: 850, price: 1150 },
    { name: 'Floor Mop 250g', brandId: null, categoryId: catCleaning.id, subCategoryId: subBrooms.id, qty: 10, cost: 650, price: 880 },
    { name: 'Outdoor Broom', brandId: null, categoryId: catCleaning.id, subCategoryId: subBrooms.id, qty: 7, cost: 450, price: 620 },
  ];

  // Track max SKU number
  const existingProducts = await prisma.product.findMany({
    where: { tenantId: shop.id },
    select: { sku: true },
  });

  let maxSkuNum = 355;
  existingProducts.forEach(p => {
    const match = p.sku && p.sku.match(/SKU_(\d+)/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxSkuNum) maxSkuNum = num;
    }
  });

  let skuIndex = maxSkuNum + 1;

  for (const item of auditItems) {
    const existing = await prisma.product.findFirst({
      where: {
        tenantId: shop.id,
        name: { equals: item.name, mode: 'insensitive' },
      },
      include: { stocks: true },
    });

    if (existing) {
      const currentStock = existing.stocks.find(s => s.warehouseId === warehouse.id);
      if (currentStock) {
        await prisma.stock.update({
          where: { id: currentStock.id },
          data: {
            quantity: currentStock.quantity + item.qty,
            availableQuantity: (currentStock.availableQuantity || currentStock.quantity) + item.qty,
          },
        });
      } else {
        await prisma.stock.create({
          data: {
            tenantId: shop.id,
            productId: existing.id,
            warehouseId: warehouse.id,
            branchId: branchId,
            quantity: item.qty,
            availableQuantity: item.qty,
            reservedQuantity: 0,
            damagedQuantity: 0,
          },
        });
      }
      console.log(`🔄 UPDATED Stock: "${existing.name}" (+${item.qty} Qty)`);
    } else {
      const sku = `SKU_${String(skuIndex).padStart(3, '0')}`;
      const barcode = `20000000${String(skuIndex).padStart(4, '0')}`;
      skuIndex++;

      const newProd = await prisma.product.create({
        data: {
          tenantId: shop.id,
          name: item.name,
          sku: sku,
          barcode: barcode,
          categoryId: item.categoryId,
          subcategoryId: item.subCategoryId,
          brandId: item.brandId,
          sellingPrice: item.price,
          purchasePrice: item.cost,
          minimumStockLevel: 5,
          sellType: 'FIX',
          measurementUnit: 'pcs',
        },
      });

      await prisma.stock.create({
        data: {
          tenantId: shop.id,
          productId: newProd.id,
          warehouseId: warehouse.id,
          branchId: branchId,
          quantity: item.qty,
          availableQuantity: item.qty,
          reservedQuantity: 0,
          damagedQuantity: 0,
        },
      });
      console.log(`✅ CREATED New Product: "${newProd.name}" (${sku}) with ${item.qty} Qty`);
    }
  }

  console.log('\n🎉 Successfully processed Batch 3 Audit Insertion & Stock Updates!');
}

main()
  .catch(console.error)
  .finally(() => {
    prisma.$disconnect();
    if (pool) pool.end();
  });
