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
  console.log('🚀 Starting Batch 4 Inventory Audit Insertion & Stock Update (HKU Order)...');

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

  // Category, Subcategory, Brand Caches
  const catCache = new Map();
  const subCatCache = new Map();
  const brandCache = new Map();

  const existingCats = await prisma.category.findMany({ where: { tenantId: shop.id } });
  existingCats.forEach(c => catCache.set(c.name.toLowerCase(), c));

  const existingBrands = await prisma.brand.findMany({ where: { tenantId: shop.id } });
  existingBrands.forEach(b => brandCache.set(b.name.toLowerCase(), b));

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

  // Pre-fetch Categories
  const catPaint = await getCategory('Paint');
  const catPlumbing = await getCategory('Plumbing');
  const catHardware = await getCategory('Hardware');
  const catBuilding = await getCategory('Building Materials');

  // Subcategories
  const subWoodFinishes = await getSubCategory('Wood Finishes', catPaint);
  const subInteriorPaint = await getSubCategory('Interior Paint', catPaint);
  const subExteriorPaint = await getSubCategory('Exterior Paint', catPaint);
  const subEnamelPaint = await getSubCategory('Enamel Paint', catPaint);
  const subFloorPaint = await getSubCategory('Floor Paint', catPaint);
  const subWallPutty = await getSubCategory('Wall Putty & Fillers', catPaint);
  const subWaterproofing = await getSubCategory('Waterproofing & Chemicals', catBuilding);
  const subCement = await getSubCategory('Cement & Mortar', catBuilding);
  const subRoofing = await getSubCategory('Roofing Sheets', catHardware);

  // Brands
  const brandJAH = await getBrand('JAH Sayerlac', catPaint);
  const brandMultico = await getBrand('Multico', catPaint);
  const brandMultilac = await getBrand('Multilac', catPaint);
  const brandRobbialac = await getBrand('Robbialac', catPaint);
  const brandBerlux = await getBrand('Berlux', catPaint);
  const brandNippon = await getBrand('Nippon', catPaint);
  const brandDulux = await getBrand('Dulux', catPaint);
  const brandLankqua = await getBrand('Lankqua', catBuilding);
  const brandUltraflex = await getBrand('Ultraflex', catBuilding);

  // Audit Items List (5 Pages - Sep 5th Audit)
  const auditItems = [
    // --- Page 1: JAH (Sayerlac), Multico, Sapiri Lanka Paddlog ---
    { name: 'JAH Exterior Top Coat Wood Coal 5L', brandId: brandJAH?.id, categoryId: catPaint.id, subCategoryId: subWoodFinishes.id, qty: 5, cost: 6800, price: 8500, unit: 'Liters' },
    { name: 'JAH Interior Brilliant White 20L', brandId: brandJAH?.id, categoryId: catPaint.id, subCategoryId: subInteriorPaint.id, qty: 3, cost: 16500, price: 19800, unit: 'Liters' },
    { name: 'JAH Interior Brilliant White 4L', brandId: brandJAH?.id, categoryId: catPaint.id, subCategoryId: subInteriorPaint.id, qty: 1, cost: 3800, price: 4650, unit: 'Liters' },

    { name: 'Multico Wall Putty 17kg', brandId: brandMultico?.id, categoryId: catPaint.id, subCategoryId: subWallPutty.id, qty: 1, cost: 2450, price: 3100, unit: 'Kilograms' },
    { name: 'Multico Wall Filler 20L', brandId: brandMultico?.id, categoryId: catPaint.id, subCategoryId: subWallPutty.id, qty: 3, cost: 8900, price: 11200, unit: 'Liters' },
    { name: 'Multico Wall Putty 1.7kg', brandId: brandMultico?.id, categoryId: catPaint.id, subCategoryId: subWallPutty.id, qty: 1, cost: 450, price: 620, unit: 'Kilograms' },

    { name: 'Sapiri Lanka Cement Water Proofing Compound 1L', brandId: null, categoryId: catBuilding.id, subCategoryId: subWaterproofing.id, qty: 12, cost: 1250, price: 1650, unit: 'Liters' },

    // --- Page 2: Dulux & Multilac ---
    { name: 'Dulux Woodguard Exterior African Walnut Color 4L', brandId: brandDulux?.id, categoryId: catPaint.id, subCategoryId: subWoodFinishes.id, qty: 4, cost: 7200, price: 8900, unit: 'Liters' },

    { name: 'Multilac Floor Paint Black 4L', brandId: brandMultilac?.id, categoryId: catPaint.id, subCategoryId: subFloorPaint.id, qty: 5, cost: 6400, price: 7800, unit: 'Liters' },
    { name: 'Multilac Flex 1000 20kg', brandId: brandMultilac?.id, categoryId: catBuilding.id, subCategoryId: subWaterproofing.id, qty: 9, cost: 11500, price: 14200, unit: 'Kilograms' },
    { name: 'Multilac Flex 1000 10kg', brandId: brandMultilac?.id, categoryId: catBuilding.id, subCategoryId: subWaterproofing.id, qty: 1, cost: 6200, price: 7650, unit: 'Kilograms' },
    { name: 'Multilac 24K Gold 4L', brandId: brandMultilac?.id, categoryId: catPaint.id, subCategoryId: subEnamelPaint.id, qty: 3, cost: 9800, price: 12500, unit: 'Liters' },
    { name: 'Multilac 3 in One Waterproof Brilliant White 4L', brandId: brandMultilac?.id, categoryId: catBuilding.id, subCategoryId: subWaterproofing.id, qty: 1, cost: 5800, price: 7200, unit: 'Liters' },
    { name: 'Multilac Flex 1000 5kg', brandId: brandMultilac?.id, categoryId: catBuilding.id, subCategoryId: subWaterproofing.id, qty: 2, cost: 3400, price: 4250, unit: 'Kilograms' },
    { name: 'Multilac Bright Red 4L', brandId: brandMultilac?.id, categoryId: catPaint.id, subCategoryId: subEnamelPaint.id, qty: 1, cost: 5600, price: 6900, unit: 'Liters' },
    { name: 'Multilac 3 in One Waterproof Brilliant White 10L', brandId: brandMultilac?.id, categoryId: catBuilding.id, subCategoryId: subWaterproofing.id, qty: 2, cost: 13500, price: 16800, unit: 'Liters' },
    { name: 'Multilac Brilliant White 20L', brandId: brandMultilac?.id, categoryId: catPaint.id, subCategoryId: subInteriorPaint.id, qty: 1, cost: 18500, price: 22800, unit: 'Liters' },
    { name: 'Multilac Flex 1000 10L', brandId: brandMultilac?.id, categoryId: catBuilding.id, subCategoryId: subWaterproofing.id, qty: 10, cost: 6200, price: 7650, unit: 'Liters' },
    { name: 'Multilac Aqua Shield Brilliant White 20L', brandId: brandMultilac?.id, categoryId: catBuilding.id, subCategoryId: subWaterproofing.id, qty: 5, cost: 19500, price: 24200, unit: 'Liters' },
    { name: 'Multilac Super Wood Care NC Sanding Sealer 4L', brandId: brandMultilac?.id, categoryId: catPaint.id, subCategoryId: subWoodFinishes.id, qty: 4, cost: 6800, price: 8400, unit: 'Liters' },
    { name: 'Multilac Flex 1000 4L', brandId: brandMultilac?.id, categoryId: catBuilding.id, subCategoryId: subWaterproofing.id, qty: 1, cost: 2800, price: 3500, unit: 'Liters' },

    // --- Page 2 (Bottom): Robbialac Interior & Exterior 4L ---
    { name: 'Robbialac Interior Paint Easter Egg 4L', brandId: brandRobbialac?.id, categoryId: catPaint.id, subCategoryId: subInteriorPaint.id, qty: 1, cost: 6200, price: 7450, unit: 'Liters' },
    { name: 'Robbialac Interior Paint Spice 4L', brandId: brandRobbialac?.id, categoryId: catPaint.id, subCategoryId: subInteriorPaint.id, qty: 5, cost: 6200, price: 7450, unit: 'Liters' },
    { name: 'Robbialac Interior Paint Marble Grey 4L', brandId: brandRobbialac?.id, categoryId: catPaint.id, subCategoryId: subInteriorPaint.id, qty: 3, cost: 6200, price: 7450, unit: 'Liters' },
    { name: 'Robbialac Interior Paint Poppy Red 4L', brandId: brandRobbialac?.id, categoryId: catPaint.id, subCategoryId: subInteriorPaint.id, qty: 4, cost: 6200, price: 7450, unit: 'Liters' },
    { name: 'Robbialac Interior Paint Blissful 4L', brandId: brandRobbialac?.id, categoryId: catPaint.id, subCategoryId: subInteriorPaint.id, qty: 2, cost: 6200, price: 7450, unit: 'Liters' },
    { name: 'Robbialac Interior Paint Island Water 4L', brandId: brandRobbialac?.id, categoryId: catPaint.id, subCategoryId: subInteriorPaint.id, qty: 2, cost: 6200, price: 7450, unit: 'Liters' },
    { name: 'Robbialac Interior Paint Phantom Blue 4L', brandId: brandRobbialac?.id, categoryId: catPaint.id, subCategoryId: subInteriorPaint.id, qty: 2, cost: 6200, price: 7450, unit: 'Liters' },

    { name: 'Robbialac Exterior Paint Spruce 4L', brandId: brandRobbialac?.id, categoryId: catPaint.id, subCategoryId: subExteriorPaint.id, qty: 3, cost: 6500, price: 7800, unit: 'Liters' },
    { name: 'Robbialac Exterior Paint Blissful 4L', brandId: brandRobbialac?.id, categoryId: catPaint.id, subCategoryId: subExteriorPaint.id, qty: 7, cost: 6500, price: 7800, unit: 'Liters' },
    { name: 'Robbialac Exterior Paint Moorland 4L', brandId: brandRobbialac?.id, categoryId: catPaint.id, subCategoryId: subExteriorPaint.id, qty: 3, cost: 6500, price: 7800, unit: 'Liters' },

    // --- Page 3: Main Store Cement, Skim Coat, Ultraflex & Nippon Skim Coat ---
    { name: 'Lankqua Cement 50kg', brandId: brandLankqua?.id, categoryId: catBuilding.id, subCategoryId: subCement.id, qty: 6, cost: 2150, price: 2450, unit: 'Kilograms' },
    { name: 'Lankqua Exterior Skim Coat 20kg', brandId: brandLankqua?.id, categoryId: catBuilding.id, subCategoryId: subCement.id, qty: 5, cost: 1650, price: 2050, unit: 'Kilograms' },
    { name: 'Lankqua Interior Skim Coat 20kg', brandId: brandLankqua?.id, categoryId: catBuilding.id, subCategoryId: subCement.id, qty: 13, cost: 1450, price: 1850, unit: 'Kilograms' },

    { name: 'Ultraflex Tile Mortar 25kg', brandId: brandUltraflex?.id, categoryId: catBuilding.id, subCategoryId: subCement.id, qty: 19, cost: 1250, price: 1600, unit: 'Kilograms' },
    { name: 'Ultraflex Tile Adhesive 25kg', brandId: brandUltraflex?.id, categoryId: catBuilding.id, subCategoryId: subCement.id, qty: 23, cost: 1350, price: 1750, unit: 'Kilograms' },

    { name: 'Nippon Paint Skim Coat White 20kg', brandId: brandNippon?.id, categoryId: catBuilding.id, subCategoryId: subCement.id, qty: 4, cost: 1550, price: 1950, unit: 'Kilograms' },

    // --- Page 4: Nippon Paint Exterior, Interior & Polymer Roofing Sheet ---
    { name: 'Nippon Paint Exterior Wall Filler 20L', brandId: brandNippon?.id, categoryId: catPaint.id, subCategoryId: subWallPutty.id, qty: 4, cost: 9200, price: 11500, unit: 'Liters' },
    { name: 'Nippon Paint Exterior Wall Filler 4L', brandId: brandNippon?.id, categoryId: catPaint.id, subCategoryId: subWallPutty.id, qty: 11, cost: 2100, price: 2650, unit: 'Liters' },
    { name: 'Nippon Paint Breeze Brilliant White 10L', brandId: brandNippon?.id, categoryId: catPaint.id, subCategoryId: subInteriorPaint.id, qty: 7, cost: 7800, price: 9600, unit: 'Liters' },
    { name: 'Nippon Paint Luxury Heavy Acrylic Interior Wall Filler 1L', brandId: brandNippon?.id, categoryId: catPaint.id, subCategoryId: subWallPutty.id, qty: 1, cost: 850, price: 1150, unit: 'Liters' },

    { name: 'Polymer Roofing Sheet 10m x 90cm', brandId: null, categoryId: catHardware.id, subCategoryId: subRoofing.id, qty: 11, cost: 8500, price: 11200, unit: 'Pieces' },

    // --- Page 5: Berlux Paints & Additional Nippon Paints ---
    { name: 'Berlux Floor Paint Black 4L', brandId: brandBerlux?.id, categoryId: catPaint.id, subCategoryId: subFloorPaint.id, qty: 1, cost: 6200, price: 7600, unit: 'Liters' },
    { name: 'Berlux Floor Paint Grey 4L', brandId: brandBerlux?.id, categoryId: catPaint.id, subCategoryId: subFloorPaint.id, qty: 3, cost: 6200, price: 7600, unit: 'Liters' },
    { name: 'Berlux Primer Black 4L', brandId: brandBerlux?.id, categoryId: catPaint.id, subCategoryId: subEnamelPaint.id, qty: 5, cost: 5800, price: 7200, unit: 'Liters' },
    { name: 'Berlux Bright Aluminium 4L', brandId: brandBerlux?.id, categoryId: catPaint.id, subCategoryId: subEnamelPaint.id, qty: 1, cost: 7400, price: 9200, unit: 'Liters' },
    { name: 'Berlux Wood Varnish Mahogany 4L', brandId: brandBerlux?.id, categoryId: catPaint.id, subCategoryId: subWoodFinishes.id, qty: 4, cost: 6800, price: 8400, unit: 'Liters' },
    { name: 'Berlux Dark Grey 4L', brandId: brandBerlux?.id, categoryId: catPaint.id, subCategoryId: subEnamelPaint.id, qty: 3, cost: 5900, price: 7400, unit: 'Liters' },
    { name: 'Berlux Jet Black 4L', brandId: brandBerlux?.id, categoryId: catPaint.id, subCategoryId: subEnamelPaint.id, qty: 2, cost: 5900, price: 7400, unit: 'Liters' },
    { name: 'Berlux A/C White 4L', brandId: brandBerlux?.id, categoryId: catPaint.id, subCategoryId: subEnamelPaint.id, qty: 3, cost: 5900, price: 7400, unit: 'Liters' },
    { name: 'Berlux Floor Red 4L', brandId: brandBerlux?.id, categoryId: catPaint.id, subCategoryId: subFloorPaint.id, qty: 2, cost: 6200, price: 7600, unit: 'Liters' },
    { name: 'Berlux Maroon 500ml', brandId: brandBerlux?.id, categoryId: catPaint.id, subCategoryId: subEnamelPaint.id, qty: 1, cost: 950, price: 1250, unit: 'Milliliters' },
    { name: 'Berlux Dark Grey 500ml', brandId: brandBerlux?.id, categoryId: catPaint.id, subCategoryId: subEnamelPaint.id, qty: 1, cost: 950, price: 1250, unit: 'Milliliters' },
    { name: 'Berlux Sanding Sealer Clear 4L', brandId: brandBerlux?.id, categoryId: catPaint.id, subCategoryId: subWoodFinishes.id, qty: 3, cost: 6400, price: 7900, unit: 'Liters' },
    { name: 'Berlux Brilliant White 4L', brandId: brandBerlux?.id, categoryId: catPaint.id, subCategoryId: subEnamelPaint.id, qty: 1, cost: 5900, price: 7400, unit: 'Liters' },
    { name: 'Berlux Anticorrosive Brown 4L', brandId: brandBerlux?.id, categoryId: catPaint.id, subCategoryId: subEnamelPaint.id, qty: 7, cost: 5800, price: 7200, unit: 'Liters' },

    { name: 'Nippon Paint Breeze Base 4L', brandId: brandNippon?.id, categoryId: catPaint.id, subCategoryId: subInteriorPaint.id, qty: 1, cost: 3200, price: 3950, unit: 'Liters' },
    { name: 'Nippon Paint Weather Proof Base 4L', brandId: brandNippon?.id, categoryId: catPaint.id, subCategoryId: subExteriorPaint.id, qty: 1, cost: 3400, price: 4200, unit: 'Liters' },
    { name: 'Nippon Paint Roofing Paint Tile Red 10L', brandId: brandNippon?.id, categoryId: catPaint.id, subCategoryId: subRoofing.id, qty: 4, cost: 8900, price: 11200, unit: 'Liters' },
    { name: 'Nippon Paint Ex 400 10L', brandId: brandNippon?.id, categoryId: catPaint.id, subCategoryId: subExteriorPaint.id, qty: 1, cost: 9500, price: 11800, unit: 'Liters' },
    { name: 'Nippon Paint Roofing Paint Base 10L', brandId: brandNippon?.id, categoryId: catPaint.id, subCategoryId: subRoofing.id, qty: 1, cost: 8500, price: 10600, unit: 'Liters' },
    { name: 'Nippon Paint Breeze Eco Wall Filler 4L', brandId: brandNippon?.id, categoryId: catPaint.id, subCategoryId: subWallPutty.id, qty: 12, cost: 1850, price: 2350, unit: 'Liters' },
    { name: 'Nippon Paint Brilliant White 20L', brandId: brandNippon?.id, categoryId: catPaint.id, subCategoryId: subInteriorPaint.id, qty: 2, cost: 17500, price: 21800, unit: 'Liters' },
    { name: 'Nippon Paint Brilliant White 1L', brandId: brandNippon?.id, categoryId: catPaint.id, subCategoryId: subInteriorPaint.id, qty: 1, cost: 1250, price: 1600, unit: 'Liters' },
    { name: 'Nippon Paint Brilliant White 4L', brandId: brandNippon?.id, categoryId: catPaint.id, subCategoryId: subInteriorPaint.id, qty: 10, cost: 3800, price: 4750, unit: 'Liters' },
    { name: 'Nippon Paint Brilliant White 2L', brandId: brandNippon?.id, categoryId: catPaint.id, subCategoryId: subInteriorPaint.id, qty: 11, cost: 2100, price: 2650, unit: 'Liters' },
    { name: 'Nippon Paint Breeze Eco Wall Filler 20L', brandId: brandNippon?.id, categoryId: catPaint.id, subCategoryId: subWallPutty.id, qty: 1, cost: 8200, price: 10200, unit: 'Liters' },
    { name: 'Nippon Paint Breeze Sea Blue 4L', brandId: brandNippon?.id, categoryId: catPaint.id, subCategoryId: subInteriorPaint.id, qty: 3, cost: 3400, price: 4250, unit: 'Liters' },
    { name: 'Nippon Paint Sunset 4L', brandId: brandNippon?.id, categoryId: catPaint.id, subCategoryId: subInteriorPaint.id, qty: 3, cost: 3400, price: 4250, unit: 'Liters' },
    { name: 'Nippon Paint Sunny Side Lane 4L', brandId: brandNippon?.id, categoryId: catPaint.id, subCategoryId: subInteriorPaint.id, qty: 4, cost: 3400, price: 4250, unit: 'Liters' },
  ];

  // Find max HKU SKU index
  const existingProducts = await prisma.product.findMany({
    where: { tenantId: shop.id },
    select: { sku: true },
  });

  let maxHkuNum = 0;
  existingProducts.forEach(p => {
    const match = p.sku && p.sku.match(/HKU_(\d+)/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxHkuNum) maxHkuNum = num;
    }
  });

  let skuIndex = maxHkuNum + 1;
  console.log(`Continuing HKU SKU order starting from HKU_${String(skuIndex).padStart(2, '0')}...`);

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
      const sku = `HKU_${String(skuIndex).padStart(2, '0')}`;
      const barcode = `30000000${String(skuIndex).padStart(4, '0')}`;
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
          sellType: item.unit?.includes('Kilograms') || item.unit?.includes('Liters') ? 'LOOSE' : 'FIX',
          measurementUnit: item.unit || 'Pieces',
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

  console.log('\n🎉 Successfully processed Batch 4 Audit Insertion & Stock Updates (HKU Order)!');
}

main()
  .catch(console.error)
  .finally(() => {
    prisma.$disconnect();
    if (pool) pool.end();
  });
